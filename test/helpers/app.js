/**
 * Test helpers: a fresh Worker environment per test, seeded users, and a small API
 * client that keeps its own session cookie.
 *
 * All names, emails and passwords here are synthetic.
 */
import { pbkdf2Sync, randomBytes, randomUUID } from 'node:crypto';
import worker from '../../worker/index.js';
import { FakeD1 } from './fakeD1.js';

const BASE_URL = 'https://quantex.test';
const PBKDF2_ITERATIONS = 100000; // must match worker/index.js
export const TEST_PASSWORD = 'correct-horse-battery';

/** Counts calls per key and fails once `limit` is exceeded, like the Workers binding. */
export class FakeRateLimiter {
  constructor(limit) {
    this.limit_ = limit;
    this.counts = new Map();
  }

  async limit({ key }) {
    const count = (this.counts.get(key) || 0) + 1;
    this.counts.set(key, count);
    return { success: count <= this.limit_ };
  }
}

/**
 * Builds a Worker env. Rate limiters are opt-in so most tests aren't throttled.
 * @param {{ rateLimits?: { ip: number, user: number } }} [options]
 */
export function createEnv({ rateLimits } = {}) {
  const env = { DB: new FakeD1() };
  if (rateLimits) {
    env.LOGIN_IP_LIMITER = new FakeRateLimiter(rateLimits.ip);
    env.LOGIN_USER_LIMITER = new FakeRateLimiter(rateLimits.user);
  }
  return env;
}

function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, 32, 'sha256');
  return `pbkdf2$${PBKDF2_ITERATIONS}$${salt.toString('base64')}$${hash.toString('base64')}`;
}

/** Inserts a user directly into the fake DB and returns its row values. */
export function seedUser(
  env,
  { username, role = 'Estimator', name, email, isActive = true, mustChangePassword = false, password = TEST_PASSWORD }
) {
  const user = {
    id: randomUUID(),
    username,
    email: email ?? `${username}@example.test`,
    name: name ?? username,
    role,
  };
  env.DB.db
    .prepare(
      `INSERT INTO users (id, username, email, name, password_hash, role, is_active, must_change_password, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'test', ?)`
    )
    .run(
      user.id,
      user.username,
      user.email,
      user.name,
      hashPassword(password),
      role,
      isActive ? 1 : 0,
      mustChangePassword ? 1 : 0,
      new Date().toISOString()
    );
  return user;
}

/** A minimal API client bound to one env, holding one session cookie. */
export class Client {
  constructor(env, { ip = '203.0.113.10' } = {}) {
    this.env = env;
    this.ip = ip;
    this.cookie = null;
  }

  async request(path, { method = 'GET', body, headers = {} } = {}) {
    const init = {
      method,
      headers: {
        'CF-Connecting-IP': this.ip,
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(this.cookie ? { Cookie: this.cookie } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    };
    const res = await worker.fetch(new Request(`${BASE_URL}${path}`, init), this.env);
    const setCookie = res.headers.get('Set-Cookie');
    if (setCookie) this.cookie = setCookie.split(';')[0];
    const text = await res.text();
    return { status: res.status, headers: res.headers, body: text ? JSON.parse(text) : null };
  }

  login(username, password = TEST_PASSWORD) {
    return this.request('/api/auth/login', { method: 'POST', body: { username, password } });
  }
}

/** Seeds a user and returns a client already signed in as them. */
export async function signedInClient(env, userSpec) {
  const user = seedUser(env, userSpec);
  const client = new Client(env);
  const res = await client.login(user.username);
  if (res.status !== 200) throw new Error(`Test login failed for ${user.username}: ${res.status}`);
  return { client, user };
}
