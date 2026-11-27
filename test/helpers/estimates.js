/** Synthetic estimate payloads for workflow tests. */

export function draftEstimate(overrides = {}) {
  return {
    id: 'est-1',
    projectName: 'Synthetic Portal Change',
    jiraRef: 'TEST-1',
    owner: 'Test Estimator',
    projectDate: '2026-11-27',
    status: 'Draft',
    globalDailyRate: 1000,
    bufferPercent: 10,
    constants: [{ id: 'c1', name: 'Project Management', days: 2 }],
    selectedStandardItems: [{ id: 'ss6', name: 'Product Level Validation', price: 3801, quantity: 1 }],
    selectedApiItems: [],
    tmSections: { danniApp: { title: 'Danni Application', items: [{ id: 'da1', workItem: 'Setup', days: 3 }] } },
    grandTotal: 9681.1,
    ...overrides,
  };
}

/** Saves an estimate with PUT, which creates or updates it. */
export function saveEstimate(client, estimate) {
  return client.request(`/api/estimates/${estimate.id}`, { method: 'PUT', body: estimate });
}
