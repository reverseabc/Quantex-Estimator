/**
 * SPOE workflow rules (BL-04): Draft -> Pending SPOE Check -> Approved, with automatic
 * reversion to Draft when reviewed content changes.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEnv, signedInClient } from './helpers/app.js';
import { draftEstimate, saveEstimate } from './helpers/estimates.js';

const PENDING = 'Pending SPOE Check';

async function setup() {
  const env = createEnv();
  const { client: estimator } = await signedInClient(env, { username: 'est.user', name: 'Test Estimator' });
  const { client: manager } = await signedInClient(env, {
    username: 'mgr.user',
    name: 'Test Manager',
    role: 'Manager',
  });
  return { estimator, manager };
}

/** Saves a Draft, then submits it for SPOE check. Returns the pending estimate. */
async function pendingEstimate(estimator) {
  await saveEstimate(estimator, draftEstimate());
  const res = await saveEstimate(estimator, draftEstimate({ status: PENDING }));
  return res.body;
}

async function approvedEstimate(estimator, manager) {
  const pending = await pendingEstimate(estimator);
  const res = await saveEstimate(manager, { ...pending, status: 'Approved' });
  return res.body;
}

test('should_save_a_draft_estimate', async () => {
  const { estimator } = await setup();
  const res = await saveEstimate(estimator, draftEstimate());
  assert.deepEqual([res.status, res.body.status], [200, 'Draft']);
});

test('should_return_409_when_manager_approves_a_draft', async () => {
  const { estimator, manager } = await setup();
  await saveEstimate(estimator, draftEstimate());
  const res = await saveEstimate(manager, draftEstimate({ status: 'Approved' }));
  assert.equal(res.status, 409);
});

test('should_return_409_when_new_estimate_is_saved_straight_as_approved', async () => {
  const { manager } = await setup();
  const res = await saveEstimate(manager, draftEstimate({ status: 'Approved' }));
  assert.equal(res.status, 409);
});

test('should_return_403_when_estimator_approves_a_pending_estimate', async () => {
  const { estimator } = await setup();
  const pending = await pendingEstimate(estimator);
  const res = await saveEstimate(estimator, { ...pending, status: 'Approved' });
  assert.equal(res.status, 403);
});

test('should_record_server_side_approval_when_manager_approves_unchanged_pending_estimate', async () => {
  const { estimator, manager } = await setup();
  const pending = await pendingEstimate(estimator);
  const res = await saveEstimate(manager, { ...pending, status: 'Approved', approvedBy: 'Forged Name' });
  assert.equal(res.body.status, 'Approved');
  assert.equal(res.body.approvedBy, 'Test Manager');
  assert.equal(res.body.approvedGrandTotal, pending.grandTotal);
  assert.ok(res.body.approvedAt);
});

test('should_revert_pending_to_draft_when_line_item_changes', async () => {
  const { estimator } = await setup();
  const pending = await pendingEstimate(estimator);
  const res = await saveEstimate(estimator, { ...pending, bufferPercent: 15 });
  assert.equal(res.body.status, 'Draft');
});

test('should_revert_pending_to_draft_when_zero_value_item_is_added', async () => {
  const { estimator } = await setup();
  const pending = await pendingEstimate(estimator);
  const items = [...pending.selectedStandardItems, { id: 'ss12', name: 'Help File', price: 0, quantity: 1 }];
  const res = await saveEstimate(estimator, { ...pending, selectedStandardItems: items });
  assert.equal(res.body.status, 'Draft');
});

test('should_keep_pending_when_only_header_fields_change', async () => {
  const { estimator } = await setup();
  const pending = await pendingEstimate(estimator);
  const res = await saveEstimate(estimator, { ...pending, projectName: 'Renamed', jiraRef: 'TEST-2' });
  assert.equal(res.body.status, PENDING);
});

test('should_keep_pending_when_a_number_is_retyped_as_a_string', async () => {
  const { estimator } = await setup();
  const pending = await pendingEstimate(estimator);
  const res = await saveEstimate(estimator, { ...pending, globalDailyRate: '1000' });
  assert.equal(res.body.status, PENDING);
});

test('should_return_409_when_manager_approves_a_pending_estimate_that_changed', async () => {
  const { estimator, manager } = await setup();
  const pending = await pendingEstimate(estimator);
  const res = await saveEstimate(manager, { ...pending, bufferPercent: 5, status: 'Approved' });
  assert.equal(res.status, 409);
});

test('should_keep_approval_record_when_approved_estimate_header_changes', async () => {
  const { estimator, manager } = await setup();
  const approved = await approvedEstimate(estimator, manager);
  const res = await saveEstimate(estimator, { ...approved, projectName: 'Renamed', approvedBy: 'Forged' });
  assert.equal(res.body.status, 'Approved');
  assert.equal(res.body.approvedBy, 'Test Manager');
});

test('should_revert_approved_to_draft_and_clear_approval_when_item_changes', async () => {
  const { estimator, manager } = await setup();
  const approved = await approvedEstimate(estimator, manager);
  const res = await saveEstimate(estimator, { ...approved, constants: [{ id: 'c1', days: 3 }] });
  assert.equal(res.body.status, 'Draft');
  assert.equal(res.body.approvedBy, null);
});

test('should_revert_approved_to_draft_when_only_grand_total_changes', async () => {
  const { estimator, manager } = await setup();
  const approved = await approvedEstimate(estimator, manager);
  const res = await saveEstimate(estimator, { ...approved, grandTotal: approved.grandTotal + 1 });
  assert.equal(res.body.status, 'Draft');
});

test('should_clear_client_supplied_approval_fields_on_a_draft', async () => {
  const { estimator } = await setup();
  const res = await saveEstimate(estimator, draftEstimate({ approvedBy: 'Forged', approvedGrandTotal: 1 }));
  assert.deepEqual([res.body.approvedBy, res.body.approvedGrandTotal], [null, null]);
});

test('should_return_404_when_deleting_an_unknown_estimate', async () => {
  const { estimator } = await setup();
  const res = await estimator.request('/api/estimates/does-not-exist', { method: 'DELETE' });
  assert.equal(res.status, 404);
});

test('should_return_400_when_estimate_payload_is_not_an_object', async () => {
  const { estimator } = await setup();
  const res = await estimator.request('/api/estimates', { method: 'POST', body: [1, 2] });
  assert.equal(res.status, 400);
});
