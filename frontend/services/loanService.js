import Config from '../constants/Config';

/**
 * Loan risk service.
 *
 * There is NO scoring logic here and none belongs here: the frontend must not
 * classify anything. These are canned payloads shaped exactly like the
 * response Config.ENDPOINTS.loanRisk will return.
 *
 * The inputs are never inspected and the answer never changes: the same
 * request has to produce the same result every time it is shown. The Medium
 * and High payloads stay in the list so those layouts can still be checked
 * while working on the result screen.
 */

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Canned responses, Low first. */
export const MOCK_ASSESSMENTS = [
  {
    riskLevel: 'Low',
    riskScore: 18,
    repaymentProbability: 82,
    recommendation: 'Suitable for approval',
    reasons: [
      'Consistent monthly savings',
      'Strong previous repayment behaviour',
      'Acceptable loan-to-income ratio',
    ],
  },
  {
    riskLevel: 'Medium',
    riskScore: 46,
    repaymentProbability: 61,
    recommendation: 'Approve with a shorter repayment period',
    reasons: [
      'Savings history is still building',
      'One delayed repayment in the last year',
      'Loan-to-income ratio near the group limit',
    ],
  },
  {
    riskLevel: 'High',
    riskScore: 74,
    repaymentProbability: 38,
    recommendation: 'Review before approving',
    reasons: [
      'Existing loan still outstanding',
      'Repayment score below the group threshold',
      'Requested amount is high relative to income',
    ],
  },
];

/** The payload every call returns until the backend is wired up. */
export const DEFAULT_ASSESSMENT = MOCK_ASSESSMENTS[0];

/**
 * @param {object} input - { memberId, memberName, requestedAmount,
 *                           monthlyIncome, existingLoan, repaymentScore,
 *                           durationMonths }
 * @returns {Promise<object>} the assessment payload.
 */
export async function assessLoanRisk(input) {
  await wait(Config.MOCK_DELAY);

  if (!Config.USE_MOCK_DATA) {
    // Reached once the backend is live; wired up in a later phase.
    throw new Error('Live loan risk assessment is not connected yet.');
  }

  // `input` is passed straight back, never examined.
  return { ...DEFAULT_ASSESSMENT, input };
}

export default { assessLoanRisk };
