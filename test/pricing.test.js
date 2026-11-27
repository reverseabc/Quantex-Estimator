/**
 * Expected totals for the current (legacy, single daily rate) pricing formula.
 *
 * The formula still lives inside the Estimator component's `totals` useMemo in
 * src/App.jsx, so it can't be imported here without changing app code. The expected
 * values in fixtures/pricing-legacy.json were generated from that exact formula on
 * main@7242df3 and hand-checked (see "mixed estimate at the 2026 default rate").
 *
 * RB-04 moves the formula into shared/pricing.js. When it does, replace `skip` with an
 * import of the extracted function: these cases then prove the move changed nothing.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const cases = JSON.parse(readFileSync(new URL('./fixtures/pricing-legacy.json', import.meta.url), 'utf8'));
const TOTAL_KEYS = [
  'constantsSum',
  'standardMenuSum',
  'apiMenuSum',
  'tmSum',
  'baseTotal',
  'bufferAmount',
  'subtotal',
  'grandTotal',
  'totalDays',
];

test('should_have_well_formed_legacy_pricing_fixtures', () => {
  assert.ok(cases.length >= 6);
  for (const c of cases) assert.deepEqual(Object.keys(c.expected).sort(), [...TOTAL_KEYS].sort(), c.name);
});

for (const c of cases) {
  // Body to add in RB-04: compare each TOTAL_KEYS value of calculateLegacyTotals(c.input)
  // with c.expected, to within 1e-6.
  test(`should_price_${c.name.replace(/\W+/g, '_')}_as_before`, { skip: 'enabled by RB-04 (shared/pricing.js)' });
}
