import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contentFingerprint, PENDING_STATUS } from '../shared/estimateContent.js';
import { draftEstimate } from './helpers/estimates.js';

test('should_ignore_header_fields_in_fingerprint', () => {
  const renamed = draftEstimate({ projectName: 'Other', jiraRef: 'X-9', owner: 'Someone', projectDate: '2027-01-01' });
  assert.equal(contentFingerprint(renamed), contentFingerprint(draftEstimate()));
});

test('should_treat_numeric_strings_as_numbers_in_fingerprint', () => {
  const retyped = draftEstimate({ globalDailyRate: '1000', bufferPercent: '10' });
  assert.equal(contentFingerprint(retyped), contentFingerprint(draftEstimate()));
});

test('should_ignore_object_key_order_in_fingerprint', () => {
  const reordered = draftEstimate({ constants: [{ days: 2, name: 'Project Management', id: 'c1' }] });
  assert.equal(contentFingerprint(reordered), contentFingerprint(draftEstimate()));
});

test('should_change_fingerprint_when_a_zero_value_item_is_added', () => {
  const base = draftEstimate();
  const added = draftEstimate({ selectedApiItems: [{ id: 'api4', days: 0, quantity: 1 }] });
  assert.notEqual(contentFingerprint(added), contentFingerprint(base));
});

test('should_treat_missing_fields_as_null_in_fingerprint', () => {
  assert.equal(contentFingerprint({}), contentFingerprint({ constants: undefined }));
});

test('should_expose_pending_status_label', () => {
  assert.equal(PENDING_STATUS, 'Pending SPOE Check');
});
