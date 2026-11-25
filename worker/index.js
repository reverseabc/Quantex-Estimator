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
  return json({ dailyRate: row ? Number(row.value) :