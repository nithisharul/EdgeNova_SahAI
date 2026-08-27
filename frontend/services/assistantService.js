import { intentKeywords, fallbackResponse } from '../data/assistantPresets';
import { formatCurrency } from '../utils/currency';
import { getFinanceSummary } from './financeService';
import { verifyLedger } from './ledgerService';
import { getLatestCrop, getLatestFertilizer, getLatestLoanRisk } from './sessionState';

/**
 * Assistant service.
 *
 * There is no language model here and none belongs here. This is a small
 * keyword matcher that decides WHICH question was asked; the answer itself is
 * then assembled from the same services every screen uses.
 *
 * That is the important part. The Assistant used to read from a fixed table
 * of sentences with figures baked into them, which meant it could confidently
 * state a balance the Finance screen disagreed with. Now a finance question
 * calls getFinanceSummary(), a ledger question calls verifyLedger(), and a
 * crop question reports the prediction the farmer actually received. If there
 * is nothing real to report, it says so instead of inventing something.
 */

/**
 * Checked in this order so a phrase like "loan risk" resolves to the loan
 * answer rather than the broader finance one.
 */
const INTENT_ORDER = ['crop', 'fertilizer', 'loan', 'ledger', 'finance'];

/**
 * Finds the first topic whose keywords appear in the message.
 * @returns {string|null} the intent name, or null when nothing matches.
 */
export function matchIntent(message) {
  const text = String(message || '').toLowerCase();
  if (!text.trim()) return null;

  return (
    INTENT_ORDER.find((intent) =>
      (intentKeywords[intent] || []).some((word) => text.includes(word))
    ) || null
  );
}

/** Said when a question is about something the farmer has not run yet. */
function nothingYet(intent, what, route, label) {
  return {
    intent,
    text: `You have not run ${what} yet in this session.\n\nOnce you do, I can tell you exactly what it said.`,
    action: { label, route },
  };
}

async function answerCrop() {
  const crop = getLatestCrop();
  if (!crop) {
    return nothingYet(
      'crop',
      'a crop recommendation',
      '/crop-recommendation',
      'Recommend a crop'
    );
  }
  return {
    intent: 'crop',
    text: `${crop.crop} is your strongest crop match for the readings you entered.`,
    card: {
      title: 'Best Crop Match',
      headline: crop.crop,
      icon: 'leaf',
      tone: 'success',
      stats: [{ label: 'Suitability', value: `${crop.confidence}%` }],
      highlights: crop.factors,
    },
    action: { label: 'View Crop Recommendation', route: '/crop-recommendation' },
  };
}

async function answerFertilizer() {
  const fert = getLatestFertilizer();
  if (!fert) {
    return nothingYet(
      'fertilizer',
      'fertilizer advice',
      '/fertilizer-advice',
      'Get fertilizer advice'
    );
  }

  // Only report a confidence when the answer came from the model; the
  // guideline table carries no probability.
  const stats = [];
  if (fert.confidence != null) {
    stats.push({ label: 'Model Confidence', value: `${fert.confidence}%` });
  }
  if (fert.source === 'guideline') {
    stats.push({ label: 'Source', value: 'Published guideline' });
  }

  return {
    intent: 'fertilizer',
    text: 'Your current fertilizer recommendation is:',
    card: {
      title: 'Fertilizer Guidance',
      headline: fert.fertilizer,
      icon: 'flask',
      tone: 'success',
      stats,
      highlights: fert.actions,
    },
    action: { label: 'View Fertilizer Advice', route: '/fertilizer-advice' },
  };
}

async function answerFinance() {
  const summary = await getFinanceSummary();
  return {
    intent: 'finance',
    text: `Your SHG has ${summary.activeMembers} active members and is holding:`,
    card: {
      title: 'Group Position',
      headline: formatCurrency(summary.totalSavings),
      icon: 'wallet',
      tone: 'accent',
      stats: [
        { label: 'Available', value: formatCurrency(summary.availableBalance) },
        { label: 'Lent out', value: formatCurrency(summary.outstandingLoans) },
      ],
      highlights: [
        `${formatCurrency(summary.savingsThisMonth)} saved this month`,
        `${summary.transactionCount} entries in the group ledger`,
      ],
    },
    action: { label: 'Open Finance', route: '/finance' },
  };
}

async function answerLoan() {
  const risk = getLatestLoanRisk();
  if (!risk) {
    return nothingYet('loan', 'a loan risk check', '/loan-risk', 'Check loan risk');
  }
  return {
    intent: 'loan',
    text: `The last assessment came back ${risk.riskLevel.toLowerCase()} risk.`,
    card: {
      title: 'Loan Risk',
      headline: `${risk.riskLevel} risk`,
      icon: 'shield-checkmark',
      tone: risk.riskLevel === 'Low' ? 'success' : risk.riskLevel === 'High' ? 'error' : 'warning',
      stats: [
        { label: 'Risk score', value: `${risk.riskScore}%` },
        { label: 'Savings regularity', value: `${Math.round((risk.savingsConsistency ?? 0) * 100)}%` },
      ],
      highlights: risk.reasons,
    },
    action: { label: 'Open Loan Risk', route: '/loan-risk' },
  };
}

async function answerLedger() {
  const integrity = await verifyLedger();
  return {
    intent: 'ledger',
    text: integrity.verified
      ? 'Yes. Every entry still matches its recorded hash.'
      : 'No. The chain does not verify.',
    card: {
      title: 'Ledger Integrity',
      headline: integrity.verified ? 'Verified' : 'Tampered',
      icon: 'lock-closed',
      tone: integrity.verified ? 'success' : 'error',
      stats: [
        {
          label: 'Entries checked',
          value: `${integrity.checkedRecords} of ${integrity.totalRecords}`,
        },
      ],
      highlights: integrity.verified
        ? ['Checked by the backend, not by this app']
        : [`First mismatch at ${integrity.tamperedRecordId}`],
    },
    action: { label: 'Open Secure Ledger', route: '/ledger' },
  };
}

const ANSWERS = {
  crop: answerCrop,
  fertilizer: answerFertilizer,
  finance: answerFinance,
  loan: answerLoan,
  ledger: answerLedger,
};

/**
 * @param {string} message - what the user typed or tapped.
 * @returns {Promise<object>} an answer built from live data, or the fallback.
 */
export async function sendAssistantMessage(message) {
  const intent = matchIntent(message);
  if (!intent) return { ...fallbackResponse };

  // A failure here is the data layer's, so it surfaces as an error rather
  // than as a confident answer built from nothing.
  return ANSWERS[intent]();
}

export default { sendAssistantMessage, matchIntent };
