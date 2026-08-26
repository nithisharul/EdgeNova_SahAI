import Config from '../constants/Config';

/**
 * Loan risk service.
 *
 * There is NO scoring logic here and none belongs here: the frontend must not
 * classify anything. These are canned payloads shaped exactly like the
 * response Config.ENDPOINTS.loanRisk will return.
 *
 * The inputs are never inspected. Successive calls simply step through the
 * three canned results so all of Low / Medium / High can be seen during a
 * demo -- that is presentation rotation, not a prediction.
 */

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Canned responses, in the order a demo walks through them. */
const MOCK_ASSESSMENTS = [
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

let callIndex = 0;

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

  // Rotation only -- `input` is passed straight back, never examined.
  const assessment = MOCK_ASSESSMENTS[callIndex % MOCK_ASSESSMENTS.length];
  callIndex += 1;

  return { ...assessment, input };
}

/** Test/demo helper: next assessment starts from Low again. */
export function resetAssessmentCycle() {
  callIndex = 0;
}

export default { assessLoanRisk, resetAssessmentCycle };
