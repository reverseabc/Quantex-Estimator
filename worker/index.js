/**
 * Quantex Estimator - Cloudflare Worker API
 * Replaces server.js. Serves /api/* from D1 (binding: DB).
 * Everything else is served from ./dist by the [assets] config in wrangler.toml.
 */

const DEFAULT_SETTINGS = { dailyRate: 1267 };

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });

const error = (message, status) => json({ error: message }, status);

// ---------- ESTIMATES ----------

async function listEstimates(env) {
  const { results } = await env.DB.prepare(
    'SELECT data FROM estimates ORDER BY last_modified DESC'
  ).all();
  return json(results.map((r) => JSON.parse(r.data)));
}

async function upsertEstimate(env, body, idFromPath) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return error('Invalid estimate payload', 400);
  }
  const id = String(idFromPath || body.id || crypto.randomUUID());
  const estimate = {
    ...body,
    id,
    lastModified: body.lastModified || new Date().toISOString(),
  };

  await env.DB.prepare(
    `INSERT INTO estimates (id, project_name, jira_ref, owner, status, grand_total, data, last_modified)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
     ON CONFLICT(id) DO UPDATE SET
       project_name = ?2, jira_ref = ?3, owner = ?4, status = ?5,
       grand_total = ?6, data = ?7, last_modified = ?8`
  )
    .bind(
      id,
      estimate.projectName ?? null,
      estimate.jiraRef ?? null,
      estimate.owner ?? null,
      estimate.status ?? null,
      Number.isFinite(Number(estimate.grandTotal)) ? Number(estimate.grandTotal) : null,
      JSON.stringify(estimate),
      estimate.lastModified
    )
    .run();

  return estimate;
}

async function deleteEstimate(env, id) {
  const { meta } = await env.DB.prepare('DELETE FROM estimates WHERE id = ?1')
    .bind(id)
    .run();
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
     ON CONFLICT(key) DO UPDATE SET value = ?1`
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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '');
    const method = request.method;

    // Non-API requests fall through to the static Vite build.
    if (!path.startsWith('/api')) {
      return env.ASSETS.fetch(request);
    }

    try {
      if (path === '/api/estimates') {
        if (method === 'GET') return await listEstimates(env);
        if (method === 'POST') {
          const body = await readJson(request);
          const saved = await upsertEstimate(env, body);
          return saved instanceof Response ? saved : json(saved, 201);
        }
        return error('Method not allowed', 405);
      }

      const match = path.match(/^\/api\/estimates\/([^/]+)$/);
      if (match) {
        const id = decodeURIComponent(match[1]);
        if (method === 'PUT') {
          const body = await readJson(request);
          const saved = await upsertEstimate(env, body, id);
          return saved instanceof Response ? saved : json(saved);
        }
        if (method === 'DELETE') return await deleteEstimate(env, id);
        return error('Method not allowed', 405);
      }

      if (path === '/api/settings') {
        if (method === 'GET') return await getSettings(env);
        if (method === 'PUT') return await putSettings(env, await readJson(request));
        return error('Method not allowed', 405);
      }

      if (path === '/api/health') {
        await env.DB.prepare('SELECT 1').first();
        return json({ ok: true });
      }

      return error('Not found', 404);
    } catch (err) {
      console.error('API error:', err);
      return error('Internal server error', 500);
    }
  },
};