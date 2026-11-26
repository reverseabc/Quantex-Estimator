/**
 * BL-04: the "content" of an estimate that an SPOE check reviews.
 *
 * Used by both the Worker (to enforce the rule) and the UI (to warn first), so the
 * two can never disagree. Header fields (project name, Jira ref, date, owner) are
 * deliberately excluded: renaming an estimate doesn't change what was reviewed.
 */
const CONTENT_FIELDS = [
  'globalDailyRate',
  'bufferPercent',
  'constants',
  'selectedStandardItems',
  'selectedApiItems',
  'tmSections',
];

// Numeric strings from <input type="number"> become numbers, so retyping "5" over 5
// isn't treated as a change. Object keys are sorted so key order doesn't matter.
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .reduce((acc, k) => {
        acc[k] = canonical(value[k]);
        return acc;
      }, {});
  }
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return value ?? null;
}

export function contentFingerprint(estimate) {
  const picked = {};
  for (const f of CONTENT_FIELDS) picked[f] = estimate?.[f] ?? null;
  return JSON.stringify(canonical(picked));
}

export const PENDING_STATUS = 'Pending SPOE Check';
