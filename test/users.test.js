/** User management (BL-02, BL-06, BL-19): Admin-only, unique usernames, one account per role per email. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Client, createEnv, signedInClient } from './helpers/app.js';

const TEMP_PASSWORD = 'temporary-pass-123';

async function asAdmin() {
  const env = createEnv();
  const { client, user } = await signedInClient(env, {
    username: 'admin.user',
    email: 'admin@example.test',
    role: 'Admin',
  });
  return { env, admin: client, adminUser: user };
}

function newUser(overrides = {}) {
  return {
    name: 'Test Person',
    email: 'person@example.test',
    username: 'person.one',
    role: 'Estimator',
    tempPassword: TEMP_PASSWORD,
    ...overrides,
  };
}

const createUser = (admin, body) => admin.request('/api/users', { method: 'POST', body });

test('should_create_user_with_lowercased_username_and_forced_password_change', async () => {
  const { admin } = await asAdmin();
  const res = await createUser(admin, newUser({ username: 'Person.One' }));
  assert.equal(res.status, 201);
  assert.equal(res.body.username, 'person.one');
  assert.equal(res.body.mustChangePassword, true);
});

test('should_default_username_to_email_when_none_given', async () => {
  const { admin } = await asAdmin();
  const res = await createUser(admin, newUser({ username: undefined }));
  assert.equal(res.body.username, 'person@example.test');
});

for (const [label, overrides] of [
  ['name_is_missing', { name: '' }],
  ['email_is_invalid', { email: 'not-an-email' }],
  ['username_is_too_short', { username: 'ab' }],
  ['username_has_invalid_characters', { username: 'bad name!' }],
  ['role_is_unknown', { role: 'Superuser' }],
  ['temp_password_is_short', { tempPassword: 'short' }],
]) {
  test(`should_return_400_when_${label}`, async () => {
    const { admin } = await asAdmin();
    const res = await createUser(admin, newUser(overrides));
    assert.equal(res.status, 400);
  });
}

test('should_return_409_when_username_is_taken', async () => {
  const { admin } = await asAdmin();
  await createUser(admin, newUser());
  const res = await createUser(admin, newUser({ email: 'other@example.test', role: 'Manager' }));
  assert.equal(res.status, 409);
});

test('should_allow_same_email_for_a_different_role', async () => {
  const { admin } = await asAdmin();
  const res = await createUser(admin, newUser({ email: 'admin@example.test', username: 'admin.manager', role: 'Manager' }));
  assert.equal(res.status, 201);
});

test('should_return_409_when_email_already_has_an_account_for_that_role', async () => {
  const { admin } = await asAdmin();
  await createUser(admin, newUser());
  const res = await createUser(admin, newUser({ username: 'person.two' }));
  assert.equal(res.status, 409);
});

test('should_return_409_when_role_change_clashes_with_same_email_account', async () => {
  const { admin } = await asAdmin();
  await createUser(admin, newUser());
  const manager = await createUser(admin, newUser({ username: 'person.mgr', role: 'Manager' }));
  const res = await admin.request(`/api/users/${manager.body.id}`, { method: 'PUT', body: { role: 'Estimator' } });
  assert.equal(res.status, 409);
});

test('should_return_400_when_admin_deactivates_themself', async () => {
  const { admin, adminUser } = await asAdmin();
  const res = await admin.request(`/api/users/${adminUser.id}`, { method: 'PUT', body: { isActive: false } });
  assert.equal(res.status, 400);
});

test('should_sign_user_out_when_their_role_changes', async () => {
  const { env, admin } = await asAdmin();
  const { client: target, user } = await signedInClient(env, { username: 'est.user' });
  await admin.request(`/api/users/${user.id}`, { method: 'PUT', body: { role: 'Manager' } });
  const res = await target.request('/api/auth/me');
  assert.equal(res.status, 401);
});

test('should_let_new_user_sign_in_with_temporary_password', async () => {
  const { env, admin } = await asAdmin();
  await createUser(admin, newUser());
  const res = await new Client(env).login('person.one', TEMP_PASSWORD);
  assert.deepEqual([res.status, res.body.mustChangePassword], [200, true]);
});
