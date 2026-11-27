import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEnv, signedInClient } from './helpers/app.js';
import { draftEstimate } from './helpers/estimates.js';

const signedIn = (role) => signedInClient(createEnv(), { username: `${role.toLowerCase()}.user`, role });

const ADMIN_ESTIMATE_CALLS = [
  ['GET', '/api/estimates'],
  ['POST', '/api/estimates'],
  ['PUT', '/api/estimates/est-1'],
  ['DELETE', '/api/estimates/est-1'],
];

for (const [method, path] of ADMIN_ESTIMATE_CALLS) {
  test(`should_return_403_when_admin_calls_${method}_${path}`, async () => {
    const { client } = await signedIn('Admin');
    const body = method === 'POST' || method === 'PUT' ? draftEstimate() : undefined;
    const res = await client.request(path, { method, body });
    assert.equal(res.status, 403);
  });
}

test('should_let_admin_read_settings', async () => {
  const { client } = await signedIn('Admin');
  const res = await client.request('/api/settings');
  assert.deepEqual([res.status, res.body.dailyRate], [200, 1267]);
});

for (const role of ['Admin', 'Estimator']) {
  test(`should_return_403_when_${role.toLowerCase()}_changes_settings`, async () => {
    const { client } = await signedIn(role);
    const res = await client.request('/api/settings', { method: 'PUT', body: { dailyRate: 900 } });
    assert.equal(res.status, 403);
  });
}

test('should_let_manager_change_default_daily_rate', async () => {
  const { client } = await signedIn('Manager');
  await client.request('/api/settings', { method: 'PUT', body: { dailyRate: 900 } });
  const res = await client.request('/api/settings');
  assert.equal(res.body.dailyRate, 900);
});

test('should_return_400_when_daily_rate_is_negative', async () => {
  const { client } = await signedIn('Manager');
  const res = await client.request('/api/settings', { method: 'PUT', body: { dailyRate: -1 } });
  assert.equal(res.status, 400);
});

for (const role of ['Estimator', 'Manager']) {
  test(`should_return_403_when_${role.toLowerCase()}_lists_users`, async () => {
    const { client } = await signedIn(role);
    const res = await client.request('/api/users');
    assert.equal(res.status, 403);
  });

  test(`should_let_${role.toLowerCase()}_list_estimates`, async () => {
    const { client } = await signedIn(role);
    const res = await client.request('/api/estimates');
    assert.equal(res.status, 200);
  });
}

test('should_let_admin_list_users', async () => {
  const { client } = await signedIn('Admin');
  const res = await client.request('/api/users');
  assert.equal(res.status, 200);
});
