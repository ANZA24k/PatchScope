import {canonical, verifyHistory} from './core.js';

export async function compareReviews(issue, left, right) {
  if (left.candidate.issue_id !== issue.id || right.candidate.issue_id !== issue.id) {
    throw new Error('Choose two reviews for the same locked issue.');
  }
  const sides = [left, right];
  const reviews = sides.map(({candidate, revision}) =>
    candidate.history.find(review => review.revision === revision));
  if (reviews.some(review => !review) || reviews[0].review_hash === reviews[1].review_hash) {
    throw new Error('Choose two distinct finalized reviews.');
  }
  const candidates = new Set(sides.map(side => side.candidate));
  if (!(await Promise.all([...candidates].map(verifyHistory))).every(Boolean)) {
    throw new Error('Comparison unavailable because a review hash chain failed verification.');
  }

  const rows = issue.criteria.map((criterion, index) => {
    const findings = reviews.map((review, side) => {
      const finding = review.result.findings.find(item => item.criterion === index);
      if (!finding) return null;
      const evidence = sides[side].candidate.evidence[finding.source];
      const source = evidence ? {
        ...evidence,
        reviewStatus: review.result.sources[finding.source]?.status ?? null,
      } : null;
      return {status: finding.status, reason: finding.reason, quote: finding.quote, source};
    });
    return {
      criterion,
      before: findings[0],
      after: findings[1],
      changed: canonical(findings[0]) !== canonical(findings[1]),
    };
  });
  return {reviews, rows};
}
