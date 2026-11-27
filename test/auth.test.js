import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Client, TEST_PASSWORD, createEnv, seedUser, signedInClient } from './helpers/app.js';

const INVALID_LOGIN = 'Invalid username or password.';

test('should_sign_in_and_set_httponly_cookie_when_credentials_are_correct', async () => {
  const env = createEnv();
  seedUser(env, { username: 'est.one' });
  const res = await new Client(env).login('est.one');
  assert.equal(res.status, 200);
  assert.match(res.headers.get('Set-Cookie'), /qx_session=.+; Path=\/; HttpOnly; SameSite=Strict/);
});

test('should_treat_username_case_insensitively_when_signing_in', async () => {
  const env = createEnv();
  seedUser(env, { username: 'est.one' });
  const res = await new Client(env).login('  EST.One ');
  assert.equal(res.status, 200);
});

test('should_return_401_when_password_is_wrong', async () => {
  const env = createEnv();
  seedUser(env, { username: 'est.one' });
  const res = await new Client(env).login('est.one', 'wrong-password-123');
  assert.deepEqual([res.status, res.body.error], [401, INVALID_LOGIN]);
});

test('should_return_same_401_when_username_is_unknown', async () => {
  const res = await new Client(createEnv()).login('nobody.here');
  assert.deepEqual([res.status, res.body.error], [401, INVALID_LOGIN]);
});

test('should_return_403_without_cookie_when_deactivated_user_gives_correct_password', async () => {
  const env = createEnv();
  seedUser(env, { username: 'gone.user', isActive: false });
  const res = await new Client(env).login('gone.user');
  assert.equal(res.status, 403);
  assert.match(res.body.error, /deactivated/);
  assert.equal(res.headers.get('Set-Cookie'), null);
});

test('should_return_generic_401_when_deactivated_user_gives_wrong_password', async () => {
  const env = createEnv();
  seedUser(env, { username: 'gone.user', isActive: false });
  const res = await new Client(env).login('gone.user', 'wrong-password-123');
  assert.deepEqual([res.status, res.body.error], [401, INVALID_LOGIN]);
});

test('should_accept_legacy_email_field_when_signing_in', async () => {
  const env = createEnv();
  seedUser(env, { username: 'legacy@example.test', email: 'legacy@example.test' });
  const res = await new Client(env).request('/api/auth/login', {
    method: 'POST',
    body: { email: 'legacy@example.test', password: TEST_PASSWORD },
  });
  assert.equal(res.status, 200);
});

test('should_return_400_when_username_or_password_is_missing', async () => {
  const res = await new Client(createEnv()).request('/api/auth/login', { method: 'POST', body: { username: 'x' } });
  assert.equal(res.status, 400);
});

test('should_return_429_with_retry_after_when_per_username_limit_is_exceeded', async () => {
  const env = createEnv({ rateLimits: { ip: 100, user: 5 } });
  seedUser(env, { username: 'target.user' });
  for (let i = 0; i < 5; i++) {
    await new Client(env, { ip: `198.51.100.${i}` }).login('target.user', 'wrong-password-123');
  }
  const res = await new Client(env, { ip: '198.51.100.99' }).login('target.user');
  assert.equal(res.status, 429);
  assert.equal(res.headers.get('Retry-After'), '60');
});

test('should_return_429_when_per_ip_limit_is_exceeded_across_usernames', async () => {
  const env = createEnv({ rateLimits: { ip: 10, user: 100 } });
  const client = new Client(env);
  for (let i = 0; i < 10; i++) await client.login(`user.${i}`, 'wrong-password-123');
  const res = await client.login('user.final', 'wrong-password-123');
  assert.equal(res.status, 429);
});

test('should_return_401_when_no_session_cookie_is_sent', async () => {
  const res = await new Client(createEnv()).request('/api/auth/me');
  assert.equal(res.status, 401);
});

test('should_return_current_user_without_password_hash_when_signed_in', async () => {
  const env = createEnv();
  const { client } = await signedInClient(env, { username: 'est.one', name: 'Test Estimator' });
  const res = await client.request('/api/auth/me');
  assert.equal(res.body.username, 'est.one');
  assert.equal('password_hash' in res.body, false);
});

test('should_invalidate_session_when_user_logs_out', async () => {
  const env = createEnv();
  const { client } = await signedInClient(env, { username: 'est.one' });
  const oldCookie = client.cookie;
  await client.request('/api/auth/logout', { method: 'POST' });
  client.cookie = oldCookie;
  const res = await client.request('/api/auth/me');
  assert.equal(res.status, 401);
});

test('should_block_cross_site_state_changing_requests', async () => {
  const env = createEnv();
  seedUser(env, { username: 'est.one' });
  const res = await new Client(env).request('/api/auth/login', {
    method: 'POST',
    body: { username: 'est.one', password: TEST_PASSWORD },
    headers: { Origin: 'https://evil.example' },
  });
  assert.equal(res.status, 403);
});

test('should_block_other_routes_until_password_is_changed_when_temporary_password_is_set', async () => {
  const env = createEnv();
  const { client } = await signedInClient(env, { username: 'new.user', mustChangePassword: true });
  const res = await client.request('/api/estimates');
  assert.equal(res.status, 403);
});

test('should_allow_access_after_temporary_password_is_changed', async () => {
  const env = createEnv();
  const { client } = await signedInClient(env, { username: 'new.user', mustChangePassword: true });
  const change = await client.request('/api/auth/change-password', {
    method: 'POST',
    body: { currentPassword: TEST_PASSWORD, newPassword: 'a-brand-new-passphrase' },
  });
  assert.equal(change.status, 200);
  const res = await client.request('/api/estimates');
  assert.equal(res.status, 200);
});

test('should_reject_new_password_shorter_than_12_characters', async () => {
  const env = createEnv();
  const { client } = await signedInClient(env, { username: 'est.one' });
  const res = await client.request('/api/auth/change-password', {
    method: 'POST',
    body: { currentPassword: TEST_PASSWORD, newPassword: 'short' },
  });
  assert.equal(res.status, 400);
});
