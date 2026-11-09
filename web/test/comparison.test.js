import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {compareReviews} from '../comparison.js';

const {records: [fixed, failed, inconclusive]} = JSON.parse(
  readFileSync(new URL('../../docs/live-state.json', import.meta.url), 'utf8'));
const issue = {id: '1', criteria: [{kind: 'fix'}, {kind: 'regression'}]};
const side = (candidate, revision = 1) => ({candidate, revision});

test('compares finalized pilot candidates against the same locked criteria', async () => {
  const {reviews, rows} = await compareReviews(issue, side(failed), side(fixed));
  assert.deepEqual(reviews.map(review => review.result.verdict), ['FAILED', 'FIXED']);
  assert.equal(rows[0].before.status, 'FAIL');
  assert.equal(rows[0].after.status, 'PASS');
  assert.equal(rows[0].after.source.sha256, fixed.evidence[0].sha256);
  assert.equal(rows[0].changed, true);
});

test('compares two distinct reviews on an existing candidate', async () => {
  const {reviews, rows} = await compareReviews(issue, side(inconclusive), side(inconclusive, 2));
  assert.deepEqual(reviews.map(review => review.revision), [1, 2]);
  assert.equal(rows.length, 2);
});

test('rejects modified review history, unrelated candidates and duplicate reviews', async () => {
  const tampered = structuredClone(fixed);
  tampered.history[0].result.findings[0].reason = 'Modified';
  await assert.rejects(compareReviews(issue, side(failed), side(tampered)), /hash chain/);
  await assert.rejects(compareReviews(issue, side(failed), side({...fixed, issue_id: '2'})), /same locked issue/);
  await assert.rejects(compareReviews(issue, side(fixed), side(fixed)), /distinct finalized reviews/);
});
