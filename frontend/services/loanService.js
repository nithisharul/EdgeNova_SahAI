import Config from '../constants/Config';
import { apiPost } from './apiClient';
import { rememberLoan } from './sessionState';

/**
 * Loan risk screening.
 *
 * NO SCORING LOGIC LIVES HERE and none belongs here. The frontend must not
 * classify anything -- it sends four numbers and renders what came back.
 *
 * savings_consistency IS NOT SENT
 * -------------------------------
 * The backend derives it from the member's own hash-chained deposit history.
 * That is the product's core claim: the score is hers, computed from a ledger
 * she cannot edit, not a number she typed. If the frontend ever sent it, a
 * member could inflate her own score and the whole feature would be theatre.
 *
 * The four fields below are the ONLY ones the model uses. The old form's
 * monthly income / existing loan / repayment score inputs were never read by
 * anything and have been removed rather than sent and ignored.
 */

/** Sectors the model saw in training. Anything else carries no signal. */
export const SECTORS = [
  'Agriculture',
  'Food',
  'Retail',
  'Services',
  'Clothing',
  'Housing',
  'Education',
  'Health',
  'Arts',
  'Transportation',
  'Construction',
  'Manufacturing',
  'Personal Use',
  'Entertainment',
  'Wholesale',
];

/** Backend value -> the words a farmer actually uses. */
export const REPAYMENT_INTERVALS = [
  { value: 'monthly', label: 'Every month' },
  { value: 'weekly', label: 'Every week' },
  { value: 'bullet', label: 'All at the end' },
  { value: 'irregular', label: 'When I can' },
];

function adaptLoan(raw) {
  const detail = raw.savings_consistency_detail || {};
  return {
    memberId: raw.member_id,
    // Backend sends 0-1. Screens display a percentage; the conversion happens
    // here so no screen can render "0.99%" for a 99% score.
    riskScore: raw.risk_score,
    riskPercent: Math.round((raw.risk_score ?? 0) * 100),
    riskLabel: raw.risk_label,
    flaggedHighRisk: !!raw.flagged_high_risk,
    decisionThreshold: raw.decision_threshold,
    savingsConsistency: raw.savings_consistency,
    savingsConsistencyPercent: Math.round((raw.savings_consistency ?? 0) * 100),
    savingsDetail: {
      depositCount: detail.deposit_count ?? 0,
      basis: detail.basis || null,
      intervalRegularity: detail.interval_regularity ?? null,
      amountRegularity: detail.amount_regularity ?? null,
      isEstimated: !!detail.is_estimated,
    },
    request: {
      amount: raw.request?.amount_inr,
      termInMonths: raw.request?.term_in_months,
      sector: raw.request?.sector,
      repaymentInterval: raw.request?.repayment_interval,
    },
    model: {
      type: raw.model?.type,
      valAuc: raw.model?.val_auc,
      labelIsSynthetic: !!raw.model?.label_is_synthetic,
    },
    // Rendered verbatim. It is the backend's own statement of what the number
    // does and does not mean, and rewriting it would overstate the model.
    note: raw.note,
  };
}

/**
 * POST /request-loan.
 *
 * @param {object} input - amount, termInMonths, sector, repaymentInterval
 * @param {string} [input.memberId] - treasurer only; a member always scores
 *                                    herself and the backend enforces that.
 */
export async function requestLoan(input) {
  const body = {
    amount: Number(input.amount),
    term_in_months: Number(input.termInMonths),
    sector: input.sector,
    repayment_interval: input.repaymentInterval,
  };
  if (input.memberId) body.member_id = input.memberId;

  const result = adaptLoan(await apiPost(Config.ENDPOINTS.requestLoan, body));
  rememberLoan(result);
  return result;
}

export default { requestLoan, SECTORS, REPAYMENT_INTERVALS };
