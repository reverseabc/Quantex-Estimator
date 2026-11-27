/**
 * Quantex Estimator - Cloudflare Worker API
 * Serves /api/* from D1 (binding: DB). Everything else is served from ./dist
 * by the [assets] config in wrangler.toml.
 *
 * Auth: username + password (usernames unique; one email may hold one account per
 * role), PBKDF2-SHA256 hashes, opaque session tokens stored
 * (hashed) in D1 and sent to the browser as an HttpOnly cookie.
 *
 * Roles (BL-06: Admin is a separate role, not a step above Manager):
 *   Estimator - create / edit estimates, request SPOE
 *   Manager   - everything an Estimator can do, + approve SPOE, change the default daily rate
 *   Admin     - manage users and their own password ONLY; no access to estimates or
 *               settings changes. Someone who administers and estimates needs two accounts.
 */

import { contentFingerprint, PENDING_STATUS } from '../shared/estimateContent.js';

const DEFAULT_SETTINGS = { dailyRate: 1267 };
const ROLES = ['Estimator', 'Manager', 'Admin'];
const SESSION_COOKIE = 'qx_session';
const SESSION_HOURS = 8;
const PBKDF2_ITERATIONS = 100000; // Workers' maximum; must match scripts/create-admin.mjs
const MIN_PASSWORD_LENGTH = 12;
// Usernames: 3-64 chars, lowercase letters, digits and . _ - @ (so an email works as one).
const USERNAME_RE = /^[a-z0-9._@-]{3,64}$/;
const normaliseUsername = (v) =>
  String(v || '')
    .trim()
    .toLowerCase();
// Used when the username doesn't exist, so failed logins take the same time either way.
const DUMMY_HASH = `pbkdf2$${PBKDF2_ITERATIONS}$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=`;
// Login rate limits (see [[ratelimits]] in wrangler.toml). Window is 60 seconds.
const LOGIN_RETRY_AFTER_SECONDS = 60;

// ---------- RESPONSES ----------

const json = (data, status = 200, extraHeaders = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...extraHeaders,
    },
  });

const error = (message, status) => json({ error: message }, status);

const toPence = (n) => Math.round((Number(n) || 0) * 100);

const isManager = (user) => !!user && user.role === 'Manager';
const isAdmin = (user) => !!user && user.role === 'Admin';

// ---------- CRYPTO ----------

const enc = new TextEncoder();
const toB64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const fromB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function pbkdf2(password, salt, iterations) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  return crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256);
}

async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(password, salt, PBKDF2_ITERATIONS);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${toB64(salt)}$${toB64(hash)}`;
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function verifyPassword(password, stored) {
  const parts = String(stored || '').split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;
  const iterations = Number(parts[1]);
  if (!Number.isInteger(iterations) || iterations < 1 || iterations > PBKDF2_ITERATIONS) return false;
  const expected = fromB64(parts[3]);
  const actual = new Uint8Array(await pbkdf2(password, fromB64(parts[2]), iterations));
  return timingSafeEqual(actual, expected);
}

async function sha256Hex(value) {
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return toB64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// ---------- SESSIONS ----------

function getCookie(request, name) {
  const header = request.headers.get('Cookie') || '';
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return v.join('=');
  }
  return null;
}

function sessionCookie(token, request, maxAgeSeconds) {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAgeSeconds}${secure}`;
}

async function createSession(env, userId) {
  const token = randomToken();
  const now = new Date();
  const expires = new Date(now.getTime() + SESSION_HOURS * 3600 * 1000);
  await env.DB.prepare('INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?1, ?2, ?3, ?4)')
    .bind(await sha256Hex(token), userId, now.toISOString(), expires.toISOString())
    .run();
  // Opportunistic cleanup of expired sessions.
  await env.DB.prepare('DELETE FROM sessions WHERE expires_at < ?1').bind(now.toISOString()).run();
  return token;
}

async function getSessionUser(request, env) {
  const token = getCookie(request, SESSION_COOKIE);
  if (!token) return null;
  const row = await env.DB.prepare(
    `SELECT u.id, u.username, u.name, u.email, u.role, u.is_active, u.must_change_password, s.expires_at
       FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ?1`,
  )
    .bind(await sha256Hex(token))
    .first();
  if (!row || !row.is_active || row.expires_at < new Date().toISOString()) return null;
  return publicUser(row);
}

const publicUser = (row) => ({
  id: row.id,
  username: row.username,
  name: row.name || row.username,
  email: row.email,
  role: row.role,
  isActive: !!row.is_active,
  mustChangePassword: !!row.must_change_password,
  createdAt: row.created_at,
});

// ---------- AUTH ROUTES ----------

// BL-03: throttle password guessing. Two limits, both checked before any hashing:
//   - per client IP  (stops one machine hammering many accounts)
//   - per username   (stops a distributed attack on one account)
// Bindings are optional so `vite dev` / tests without them still work.
async function loginRateLimited(request, env, username) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const checks = [];
  if (env.LOGIN_IP_LIMITER) checks.push(env.LOGIN_IP_LIMITER.limit({ key: `login-ip:${ip}` }));
  if (env.LOGIN_USER_LIMITER) checks.push(env.LOGIN_USER_LIMITER.limit({ key: `login-user:${username}` }));
  const results = await Promise.all(checks);
  return results.some((r) => !r.success);
}

async function login(request, env) {
  const body = await readJson(request);
  // `email` accepted for older cached frontends; existing usernames equal the email anyway.
  const username = normaliseUsername(body?.username ?? body?.email);
  const password = String(body?.password || '');
  if (!username || !password) return error('Username and password are required.', 400);

  if (await loginRateLimited(request, env, username)) {
    return json({ error: 'Too many sign-in attempts. Please wait a minute and try again.' }, 429, {
      'Retry-After': String(LOGIN_RETRY_AFTER_SECONDS),
    });
  }

  const row = await env.DB.prepare('SELECT * FROM users WHERE username = ?1').bind(username).first();
  // Always run a hash so response time doesn't reveal whether the username exists.
  const ok = row
    ? await verifyPassword(password, row.password_hash)
    : (await verifyPassword(password, DUMMY_HASH), false);

  if (!row || !ok) return error('Invalid username or password.', 401);
  // BL-01: only reveal deactivation once the password is proven correct,
  // so this can't be used to discover which usernames belong to deactivated accounts.
  if (!row.is_active) {
    return error('Your account has been deactivated. Please contact your Quantex administrator.', 403);
  }

  const token = await createSession(env, row.id);
  return json(publicUser(row), 200, { 'Set-Cookie': sessionCookie(token, request, SESSION_HOURS * 3600) });
}

async function logout(request, env) {
  const token = getCookie(request, SESSION_COOKIE);
  if (token) {
    await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?1')
      .bind(await sha256Hex(token))
      .run();
  }
  return json({ ok: true }, 200, { 'Set-Cookie': sessionCookie('', request, 0) });
}

async function changePassword(request, env, user) {
  const body = await readJson(request);
  const current = String(body?.currentPassword || '');
  const next = String(body?.newPassword || '');
  if (next.length < MIN_PASSWORD_LENGTH) {
    return error(`New password must be at least ${MIN_PASSWORD_LENGTH} characters.`, 400);
  }
  const row = await env.DB.prepare('SELECT password_hash FROM users WHERE id = ?1').bind(user.id).first();
  if (!row || !(await verifyPassword(current, row.password_hash))) {
    return error('Current password is incorrect.', 400);
  }
  if (current === next) return error('New password must be different from the current one.', 400);

  await env.DB.prepare('UPDATE users SET password_hash = ?1, must_change_password = 0 WHERE id = ?2')
    .bind(await hashPassword(next), user.id)
    .run();
  // Sign out every other session for this user, then issue a fresh one.
  await env.DB.prepare('DELETE FROM sessions WHERE user_id = ?1').bind(user.id).run();
  const token = await createSession(env, user.id);
  return json({ ...user, mustChangePassword: false }, 200, {
    'Set-Cookie': sessionCookie(token, request, SESSION_HOURS * 3600),
  });
}

// ---------- USER MANAGEMENT (Admin) ----------

async function listUsers(env) {
  const { results } = await env.DB.prepare(
    'SELECT id, username, name, email, role, is_active, must_change_password, created_at FROM users ORDER BY name COLLATE NOCASE, role',
  ).all();
  return json(results.map(publicUser));
}

async function activeAdminCount(env) {
  const row = await env.DB.prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'Admin' AND is_active = 1").first();
  return row?.n || 0;
}

async function createUser(request, env, admin) {
  const body = await readJson(request);
  const name = String(body?.name || '').trim();
  const email = String(body?.email || '')
    .trim()
    .toLowerCase();
  const username = normaliseUsername(body?.username || email);
  const role = String(body?.role || 'Estimator');
  const tempPassword = String(body?.tempPassword || '');

  if (!name) return error('Name is required.', 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return error('A valid email is required.', 400);
  if (!USERNAME_RE.test(username)) {
    return error('Username must be 3-64 characters: letters, numbers and . _ - @ only.', 400);
  }
  if (!ROLES.includes(role)) return error('Invalid role.', 400);
  if (tempPassword.length < MIN_PASSWORD_LENGTH) {
    return error(`Temporary password must be at least ${MIN_PASSWORD_LENGTH} characters.`, 400);
  }

  const taken = await env.DB.prepare('SELECT id FROM users WHERE username = ?1').bind(username).first();
  if (taken) return error('That username is already taken.', 409);
  // One account per role per email: a second account must be for a different role.
  const sameRole = await env.DB.prepare('SELECT id FROM users WHERE email = ?1 AND role = ?2')
    .bind(email, role)
    .first();
  if (sameRole) return error(`This email already has a ${role} account.`, 409);

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO users (id, username, email, name, password_hash, role, is_active, must_change_password, created_by, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, 1, 1, ?7, ?8)`,
  )
    .bind(id, username, email, name, await hashPassword(tempPassword), role, admin.username || admin.email, createdAt)
    .run();

  return json({ id, username, name, email, role, isActive: true, mustChangePassword: true, createdAt }, 201);
}

async function updateUser(request, env, admin, id) {
  const body = await readJson(request);
  const row = await env.DB.prepare('SELECT * FROM users WHERE id = ?1').bind(id).first();
  if (!row) return error('User not found.', 404);

  const name = body?.name !== undefined ? String(body.name).trim() : row.name;
  const role = body?.role !== undefined ? String(body.role) : row.role;
  const isActive = body?.isActive !== undefined ? (body.isActive ? 1 : 0) : row.is_active;
  if (!name) return error('Name is required.', 400);
  if (!ROLES.includes(role)) return error('Invalid role.', 400);
  if (role !== row.role) {
    const clash = await env.DB.prepare('SELECT id FROM users WHERE email = ?1 AND role = ?2 AND id != ?3')
      .bind(row.email, role, id)
      .first();
    if (clash) return error(`This email already has a ${role} account.`, 409);
  }

  // Don't let an Admin lock everyone out.
  const losingAdmin = row.role === 'Admin' && row.is_active && (role !== 'Admin' || !isActive);
  if (losingAdmin) {
    if (id === admin.id) return error("You can't remove your own Admin access or deactivate yourself.", 400);
    if ((await activeAdminCount(env)) <= 1) return error('There must be at least one active Admin.', 400);
  }

  let passwordHash = row.password_hash;
  let mustChange = row.must_change_password;
  if (body?.tempPassword !== undefined) {
    const temp = String(body.tempPassword);
    if (temp.length < MIN_PASSWORD_LENGTH) {
      return error(`Temporary password must be at least ${MIN_PASSWORD_LENGTH} characters.`, 400);
    }
    passwordHash = await hashPassword(temp);
    mustChange = 1;
  }

  await env.DB.prepare(
    'UPDATE users SET name = ?1, role = ?2, is_active = ?3, password_hash = ?4, must_change_password = ?5 WHERE id = ?6',
  )
    .bind(name, role, isActive, passwordHash, mustChange, id)
    .run();

  // Role change, deactivation or password reset: sign the user out everywhere.
  if (role !== row.role || isActive !== row.is_active || body?.tempPassword !== undefined) {
    await env.DB.prepare('DELETE FROM sessions WHERE user_id = ?1').bind(id).run();
  }

  return json(publicUser({ ...row, name, role, is_active: isActive, must_change_password: mustChange }));
}

// ---------- ESTIMATES ----------

async function listEstimates(env) {
  const { results } = await env.DB.prepare('SELECT data FROM estimates ORDER BY last_modified DESC').all();
  return json(results.map((r) => JSON.parse(r.data)));
}

async function upsertEstimate(env, body, user, idFromPath) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return error('Invalid estimate payload', 400);
  }
  const id = String(idFromPath || body.id || crypto.randomUUID());
  const estimate = {
    ...body,
    id,
    lastModified: body.lastModified || new Date().toISOString(),
  };

  const existingRow = await env.DB.prepare('SELECT data FROM estimates WHERE id = ?1').bind(id).first();
  const existing = existingRow ? JSON.parse(existingRow.data) : null;

  // BL-04: once submitted for SPOE check, the reviewed content (rate, buffer and every
  // line item) is frozen. Any change to it sends the estimate back to Draft, and a
  // Manager can only approve the exact version that was submitted.
  const pendingContentChanged =
    existing?.status === PENDING_STATUS && contentFingerprint(estimate) !== contentFingerprint(existing);
  if (pendingContentChanged) {
    if (estimate.status === 'Approved') {
      return error('This estimate has changed since it was submitted for SPOE check. Reload it and review again.', 409);
    }
    if (estimate.status === PENDING_STATUS) estimate.status = 'Draft';
  }

  if (estimate.status === 'Approved') {
    if (existing?.status === 'Approved') {
      // Business rule: an Approved estimate whose totals OR items change goes back to
      // Draft (SPOE check required again). Header-only edits keep the approval.
      const baseline = existing.approvedGrandTotal ?? existing.grandTotal;
      const contentChanged = contentFingerprint(estimate) !== contentFingerprint(existing);
      if (contentChanged || toPence(estimate.grandTotal) !== toPence(baseline)) {
        estimate.status = 'Draft';
        estimate.approvedGrandTotal = null;
        estimate.approvedBy = null;
        estimate.approvedAt = null;
      } else {
        // Keep the original approval record; the client can't overwrite it.
        estimate.approvedGrandTotal = baseline;
        estimate.approvedBy = existing.approvedBy ?? null;
        estimate.approvedAt = existing.approvedAt ?? null;
      }
    } else {
      // New approval: only Managers / Admins, only from Pending SPOE Check,
      // and the server records who and when.
      if (!isManager(user)) return error('Only a Manager can approve an estimate.', 403);
      if (existing?.status !== PENDING_STATUS) {
        return error('An SPOE check must be requested before this estimate can be approved.', 409);
      }
      estimate.approvedGrandTotal = estimate.grandTotal;
      estimate.approvedBy = user.name;
      estimate.approvedAt = new Date().toISOString();
    }
  } else {
    estimate.approvedGrandTotal = null;
    estimate.approvedBy = null;
    estimate.approvedAt = null;
  }

  await env.DB.prepare(
    `INSERT INTO estimates (id, project_name, jira_ref, owner, status, grand_total, data, last_modified)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
     ON CONFLICT(id) DO UPDATE SET
       project_name = ?2, jira_ref = ?3, owner = ?4, status = ?5,
       grand_total = ?6, data = ?7, last_modified = ?8`,
  )
    .bind(
      id,
      estimate.projectName ?? null,
      estimate.jiraRef ?? null,
      estimate.owner ?? null,
      estimate.status ?? null,
      Number.isFinite(Number(estimate.grandTotal)) ? Number(estimate.grandTotal) : null,
      JSON.stringify(estimate),
      estimate.lastModified,
    )
    .run();

  return estimate;
}

async function deleteEstimate(env, id) {
  const { meta } = await env.DB.prepare('DELETE FROM estimates WHERE id = ?1').bind(id).run();
  if (!meta.changes) return error('Estimate not found', 404);
  return json({ deleted: id });
}

// ---------- SETTINGS ----------

async function getSettings(env) {
  const row = await env.DB.prepare("SELECT value FROM settings WHERE key = 'dailyRate'").first();
  return json({ dailyRate: row ? Number(row.value) : DEFAULT_SETTINGS.dailyRate });
}

async function putSettings(env, body) {
  const rate = Number(body?.dailyRate);
  if (!Number.isFinite(rate) || rate < 0) return error('dailyRate must be a positive number', 400);
  await env.DB.prepare(
    `INSERT INTO settings (key, value) VALUES ('dailyRate', ?1)
     ON CONFLICT(key) DO UPDATE SET value = ?1`,
  )
    .bind(String(rate))
    .run();
  return json({ dailyRate: rate });
}

// ---------- ROUTER ----------

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

async function handleApi(request, env, path, method) {
  // Public routes
  if (path === '/api/health') {
    await env.DB.prepare('SELECT 1').first();
    return json({ ok: true });
  }
  if (path === '/api/auth/login' && method === 'POST') return login(request, env);
  if (path === '/api/auth/logout' && method === 'POST') return logout(request, env);

  // Everything below needs a signed-in user.
  const user = await getSessionUser(request, env);
  if (!user) return error('Not signed in.', 401);

  if (path === '/api/auth/me' && method === 'GET') return json(user);
  if (path === '/api/auth/change-password' && method === 'POST') return changePassword(request, env, user);

  // Users with a temporary password must change it before doing anything else.
  if (user.mustChangePassword) return error('You must change your password before continuing.', 403);

  // BL-06: Admins have no access to estimates at all - not even read-only.
  if ((path === '/api/estimates' || path.startsWith('/api/estimates/')) && isAdmin(user)) {
    return error("Admin accounts don't have access to estimates. Use a Manager or Estimator account.", 403);
  }

  if (path === '/api/estimates') {
    if (method === 'GET') return listEstimates(env);
    if (method === 'POST') {
      const saved = await upsertEstimate(env, await readJson(request), user);
      return saved instanceof Response ? saved : json(saved, 201);
    }
    return error('Method not allowed', 405);
  }

  const estimateMatch = path.match(/^\/api\/estimates\/([^/]+)$/);
  if (estimateMatch) {
    const id = decodeURIComponent(estimateMatch[1]);
    if (method === 'PUT') {
      const saved = await upsertEstimate(env, await readJson(request), user, id);
      return saved instanceof Response ? saved : json(saved);
    }
    if (method === 'DELETE') return deleteEstimate(env, id);
    return error('Method not allowed', 405);
  }

  if (path === '/api/settings') {
    if (method === 'GET') return getSettings(env);
    if (method === 'PUT') {
      if (!isManager(user)) return error('Only a Manager can change settings.', 403);
      return putSettings(env, await readJson(request));
    }
    return error('Method not allowed', 405);
  }

  if (path === '/api/users') {
    if (!isAdmin(user)) return error('Admin access required.', 403);
    if (method === 'GET') return listUsers(env);
    if (method === 'POST') return createUser(request, env, user);
    return error('Method not allowed', 405);
  }

  const userMatch = path.match(/^\/api\/users\/([^/]+)$/);
  if (userMatch) {
    if (!isAdmin(user)) return error('Admin access required.', 403);
    if (method === 'PUT') return updateUser(request, env, user, decodeURIComponent(userMatch[1]));
    return error('Method not allowed', 405);
  }

  return error('Not found', 404);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '');
    const method = request.method;

    // Non-API requests fall through to the static Vite build.
    if (!path.startsWith('/api')) {
      return env.ASSETS.fetch(request);
    }

    // Basic CSRF defence: state-changing requests must come from this site.
    if (method !== 'GET' && method !== 'HEAD') {
      const origin = request.headers.get('Origin');
      if (origin && origin !== url.origin) return error('Cross-site request blocked.', 403);
    }

    try {
      return await handleApi(request, env, path, method);
    } catch (err) {
      console.error('API error:', err);
      return error('Internal server error', 500);
    }
  },
};
