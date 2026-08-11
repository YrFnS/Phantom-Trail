import test from 'node:test';
import assert from 'node:assert/strict';

import { buildRiskRecommendations } from '../lib/risk-recommendation-policy.mts';
import { formatEvidenceIndexValue } from '../lib/risk-response-policy.mts';

test('evidence-index recommendations do not dereference a missing below-threshold page', () => {
  const recommendations = buildRiskRecommendations([], 0, 0, 5, 0);

  assert.deepEqual(recommendations, [
    'Treat index changes as changes in qualifying recorded evidence, not measured changes in real-world privacy.',
  ]);
});

test('empty evidence returns an explicit review note instead of a fabricated score', () => {
  const display = formatEvidenceIndexValue({
    status: 'insufficient-evidence',
    score: null,
    grade: 'N/A',
  });
  const recommendations = buildRiskRecommendations([], 0, 0, 0, 0);

  assert.equal(display, 'N/A — insufficient evidence');
  assert.doesNotMatch(display, /null\/100/);
  assert.deepEqual(recommendations, [
    'Collect and inspect evidence before assigning any numeric index or conclusion.',
  ]);
});
