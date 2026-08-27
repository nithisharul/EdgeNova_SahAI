import Config from '../constants/Config';
import { postJson } from './apiClient';
import { setLatestLoanRisk } from './sessionState';

/**
 * Loan risk service.
 *
 * There is NO scoring logic here and none belongs here. The score comes from
 * the trained XGBoost model behind POST /request-loan.
 *
 * WHAT THE BACKEND DOES WITH THIS REQUEST
 * ---------------------------------------
 * Only the amount, term, sector and repayment interval are sent. The model's
 * fifth numeric feature, savings_consistency, is deliberately NOT accepted
 * from the client: the backend computes it from the member's own hash-chained
 * deposit history, so a caller cannot inflate her own score by passing a
 * number. That is why member selection matters on this screen -- the answer is
 * genuinely per-member.
 *
 * Rupees are converted to the training data's USD scale by the backend, not
 * here, so there is no currency assumption baked into the app.
 *
 * The form still collects monthly income and existing loan. Neither is a
 * feature of this model, so neither is sent. They are left on the form
 * because a treasurer weighs them by hand, but they do not move the score and
 * the result no longer implies that they do.
 */

/** Backend band -> the capitalisation the screen's RISK_TONES map uses. */
const BAND_TO_LEVEL = { LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High' };

const RECOMMENDATION = {
  Low: 'Suitable for approval',
  Medium: 'Approve with a shorter repayment period',
  High: 'Review before approving',
};

/**
 * API payload -> the shape the result card renders.
 *
 * riskScore is P(high risk) as a percentage -- a real probability from the
 * classifier. The model returns no per-feature attribution, so no invented
 * explanation is offered; `reasons` states what the score actually rests on
 * and the caveats a treasurer should see.
 */
function fromApi(payload, input) {
  const level = BAND_TO_LEVEL[payload.risk_label] ?? 'Medium';
  const consistency = payload.savings_consistency_detail || {};

  const reasons = [];
  if (consistency.basis) {
    reasons.push(consistency.basis);
  }
  reasons.push(
    `Savings regularity ${Math.round((payload.savings_consistency ?? 0) * 100)}% ` +
      `(from this member's own ledger)`
  );
  if (payload.model?.label_is_synthetic) {
    reasons.push('Trained on a proxy risk label, not observed repayments');
  }

  return {
    riskLevel: level,
    riskScore: Math.round((payload.risk_score ?? 0) * 100),
    // The model is a binary classifier over risk; 1 - p is the complement it
    // genuinely reports, not a separate estimate.
    repaymentProbability: Math.round((1 - (payload.risk_score ?? 0)) * 100),
    recommendation: RECOMMENDATION[level],
    reasons,
    savingsConsistency: payload.savings_consistency,
    savingsConsistencyEstimated: !!consistency.is_estimated,
    flaggedHighRisk: !!payload.flagged_high_risk,
    input,
  };
}

/**
 * @param {object} input - { memberId, memberName, requestedAmount,
 *                           durationMonths, ... }
 */
export async function assessLoanRisk(input) {
  const payload = await postJson(Config.ENDPOINTS.loanRisk, {
    amount: Number(input.requestedAmount),
    term_in_months: Number(input.durationMonths),
    sector: 'Agriculture',
    repayment_interval: 'monthly',
    member_id: input.memberId,
  });
  const result = fromApi(payload, input);
  setLatestLoanRisk(result);
  return result;
}

export default { assessLoanRisk };
