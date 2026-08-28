import {
  intentKeywords,
  staticAnswers,
  fallbackResponse,
  errorResponse,
} from '../data/assistantPresets';
import { farmProfile, fieldSections } from '../data/mockLandData';
import authService from './authService';
import { getGroupSummary } from './groupService';
import { getPortfolio } from './portfolioService';
import { verifyLedger } from './ledgerService';
import { getLastAdvisory, getLastFertilizer, getLastLoan } from './sessionState';
import { formatCurrency } from '../utils/currency';

/**
 * The SahAI Assistant.
 *
 * There is no language model here and none belongs here: this is a small
 * keyword matcher over a fixed set of topics, which keeps a demo deterministic
 * and costs nothing. No external API is called.
 *
 * WHAT CHANGED, AND WHY IT MATTERS
 * --------------------------------
 * Answers are now COMPOSED AT QUESTION TIME from the same services the screens
 * use. The old version built every answer once at module load from mock
 * constants, so it could state a savings figure that contradicted the screen
 * it linked to. Now "how are my savings doing?" performs a real
 * GET /member/{id}/portfolio, and if that call fails the Assistant says so
 * rather than quoting a number it no longer has.
 *
 * ROLE SAFETY
 * -----------
 * The Assistant is not a side door. Group summary and ledger verification are
 * treasurer-only on the server, so a member asking for them is told who can
 * see that -- the request is never attempted with someone else's authority,
 * and a 403 is reported honestly rather than answered from a cached figure.
 */

/**
 * Checked in this order, so a narrow topic wins over a broad one: "loan risk"
 * must reach `loan`, not `savings`.
 */
const INTENT_ORDER = ['fertilizer', 'crop', 'land', 'loan', 'ledger', 'group', 'savings'];

export function matchIntent(message) {
  const text = String(message || '').toLowerCase();
  if (!text.trim()) return null;

  if (/\b(help|what can you do|who are you)\b/.test(text)) return 'help';

  return (
    INTENT_ORDER.find((intent) =>
      (intentKeywords[intent] || []).some((word) => text.includes(word))
    ) || null
  );
}

const percent = (value) => `${Math.round((value ?? 0) * 100)}%`;

/** The signed-out / wrong-role answer. Never a substitute figure. */
function restricted(what) {
  return {
    intent: 'restricted',
    text: `${what} is available to the SHG treasurer.`,
  };
}

function needsSignIn(what) {
  return {
    intent: 'signed-out',
    text: `Please log in to see ${what}.`,
    action: { label: 'Log in', route: '/login' },
  };
}

// ---------------------------------------------------------------------------
// Topic handlers. Each returns a response object, or throws for the caller to
// turn into errorResponse. None of them invents a value.
// ---------------------------------------------------------------------------

function answerCrop() {
  const advisory = getLastAdvisory();
  if (!advisory?.crop?.name) {
    return {
      intent: 'crop',
      text:
        'I do not have a crop recommendation for you yet.\n\n' +
        'Open the Crop Advisor and share your soil readings, and I can explain ' +
        'the result here.',
      action: { label: 'Open Crop Advisor', route: '/crop-advisor' },
    };
  }

  const { crop, why } = advisory;
  const others = crop.alternatives
    .filter((alt) => alt.crop !== crop.name)
    .slice(0, 2)
    .map((alt) => `${alt.crop} (${percent(alt.confidence)})`);

  return {
    intent: 'crop',
    // why.summary is the model's own sentence. Quoted, never paraphrased.
    text: why?.summary || `${crop.name} is your strongest match.`,
    card: {
      title: 'Crop recommendation',
      headline: String(crop.name).toUpperCase(),
      icon: 'leaf',
      tone: 'success',
      stats: [{ label: 'Match', value: percent(crop.confidence) }],
      highlights: others.length ? [`Other options: ${others.join(', ')}`] : [],
    },
    action: { label: 'Open Crop Advisor', route: '/crop-advisor' },
  };
}

function answerFertilizer() {
  const standalone = getLastFertilizer();
  const advisory = getLastAdvisory();
  const fertilizer = standalone || advisory?.fertilizer;

  if (advisory && !fertilizer && advisory.needsSoilTest) {
    return {
      intent: 'fertilizer',
      text:
        'Your crop recommendation is ready, but fertilizer advice needs a soil ' +
        'test first -- the nitrogen, potassium and phosphorous readings.\n\n' +
        'I will not guess those values.',
      action: { label: 'Open Crop Advisor', route: '/crop-advisor' },
    };
  }

  if (!fertilizer?.fertilizer) {
    return {
      intent: 'fertilizer',
      text:
        'I do not have a fertilizer recommendation for you yet.\n\n' +
        'Open Fertilizer Advice and tell me your crop and soil readings.',
      action: { label: 'Open Fertilizer Advice', route: '/fertilizer-advice' },
    };
  }

  const fromModel = fertilizer.source === 'model';
  const stats = [
    { label: 'Source', value: fromModel ? 'Prediction model' : 'General guidance' },
  ];
  // A guideline-table answer has no probability behind it, so no figure is shown.
  if (fromModel && fertilizer.confidence !== null) {
    stats.push({ label: 'Confidence', value: percent(fertilizer.confidence) });
  }

  return {
    intent: 'fertilizer',
    text: fromModel
      ? 'The model suggests this fertilizer for your field:'
      : 'This is general agricultural guidance for your crop, not a model prediction:',
    card: {
      title: 'Fertilizer',
      headline: fertilizer.fertilizer,
      icon: 'flask',
      tone: 'success',
      stats,
      highlights: [fertilizer.note, fertilizer.soilNote].filter(Boolean),
    },
    action: { label: 'Open Fertilizer Advice', route: '/fertilizer-advice' },
  };
}

function answerLand() {
  return {
    intent: 'land',
    text:
      `${farmProfile.farmName} is recorded as ${farmProfile.totalAcres} acres across ` +
      `${fieldSections.length} sections.\n\n` +
      'This field profile is a prototype record kept on this device -- it is not ' +
      'stored on the SahAI server yet.',
    action: { label: 'Open My Land', route: '/my-land' },
  };
}

async function answerSavings() {
  const session = authService.getSession();
  if (!session) return needsSignIn('your savings');

  const portfolio = await getPortfolio(session.memberId);
  return {
    intent: 'savings',
    text: `You have ${formatCurrency(portfolio.totalSavings)} in savings recorded in the group ledger.`,
    card: {
      title: 'My portfolio',
      headline: formatCurrency(portfolio.totalSavings),
      icon: 'wallet',
      tone: 'success',
      stats: [
        { label: 'Outstanding loan', value: formatCurrency(portfolio.outstandingLoan) },
        { label: 'Net position', value: formatCurrency(portfolio.netPosition) },
      ],
      highlights: [`${portfolio.depositCount} deposits recorded`],
    },
    action: { label: 'Open My Portfolio', route: '/portfolio' },
  };
}

async function answerLoan() {
  const session = authService.getSession();
  if (!session) return needsSignIn('your loan assessment');

  const loan = getLastLoan();
  if (!loan) {
    // No assessment yet -- explain what drives it using her REAL deposit count.
    const portfolio = await getPortfolio(session.memberId);
    return {
      intent: 'loan',
      text:
        'You have not run a loan check yet.\n\n' +
        `Your risk screening is based on your own savings history -- ` +
        `${portfolio.depositCount} deposits are on record so far. You cannot ` +
        'change that score by typing anything; it is read from the ledger.',
      action: { label: 'Request a Loan', route: '/request-loan' },
    };
  }

  return {
    intent: 'loan',
    // Screening language only. Never "approved", never a repayment probability.
    text: loan.flaggedHighRisk
      ? 'Your last request was flagged for treasurer review.'
      : 'Your last request screened as worth reviewing.',
    card: {
      title: 'Loan screening',
      headline: `${loan.riskLabel} RISK`,
      icon: 'shield-checkmark',
      tone: loan.riskLabel === 'LOW' ? 'success' : loan.riskLabel === 'MEDIUM' ? 'warning' : 'error',
      stats: [
        { label: 'Risk score', value: `${loan.riskPercent}%` },
        {
          label: 'Savings regularity',
          value: loan.savingsDetail.isEstimated
            ? 'Not enough history'
            : `${loan.savingsConsistencyPercent}%`,
        },
      ],
      highlights: [loan.note].filter(Boolean),
    },
    action: { label: 'Request a Loan', route: '/request-loan' },
  };
}

async function answerGroup() {
  const session = authService.getSession();
  if (!session) return needsSignIn('group finances');
  if (!authService.isTreasurer()) return restricted('The group summary');

  const summary = await getGroupSummary();
  return {
    intent: 'group',
    text: `The group holds ${formatCurrency(summary.totalCorpus)} across ${summary.memberCount} members.`,
    card: {
      title: 'Group summary',
      headline: formatCurrency(summary.totalCorpus),
      icon: 'people',
      tone: 'success',
      stats: [
        { label: 'Outstanding loans', value: formatCurrency(summary.outstandingLoans) },
        { label: 'Available', value: formatCurrency(summary.availableBalance) },
      ],
      highlights: [`${summary.memberCount} members with recorded activity`],
    },
    action: { label: 'Open Group Summary', route: '/group-summary' },
  };
}

async function answerLedger() {
  const session = authService.getSession();
  if (!session) return needsSignIn('the ledger check');
  if (!authService.isTreasurer()) return restricted('Ledger verification');

  // The verdict is the server's. The Assistant never decides "verified".
  const result = await verifyLedger();
  return {
    intent: 'ledger',
    text: result.valid
      ? 'I just checked the chain: every entry matches its stored hash.'
      : 'I just checked the chain and it does NOT match.',
    card: {
      title: 'Ledger integrity',
      headline: result.valid ? 'VERIFIED' : 'TAMPERING DETECTED',
      icon: result.valid ? 'lock-closed' : 'warning',
      tone: result.valid ? 'success' : 'error',
      stats: result.valid ? [] : [{ label: 'Broken entry', value: `#${result.brokenEntryId}` }],
      highlights: result.valid
        ? ['Checked just now against the server']
        : ['Open the ledger to see which entry failed'],
    },
    action: { label: 'Open Secure Ledger', route: '/ledger' },
  };
}

const HANDLERS = {
  crop: answerCrop,
  fertilizer: answerFertilizer,
  land: answerLand,
  savings: answerSavings,
  loan: answerLoan,
  group: answerGroup,
  ledger: answerLedger,
};

/**
 * @param {string} message - what the user typed or tapped.
 * @returns {Promise<object>} a composed response.
 */
export async function sendAssistantMessage(message) {
  const intent = matchIntent(message);

  if (!intent) return { ...fallbackResponse };
  if (intent === 'help') return { ...staticAnswers.help };

  const handler = HANDLERS[intent];
  if (!handler) return { ...fallbackResponse };

  try {
    return await handler();
  } catch (error) {
    // A 403 from the server is reported as a permission answer, not as a
    // failure -- and never worked around with a stale figure.
    if (error?.kind === 'forbidden') return restricted('That information');
    if (error?.kind === 'auth') return needsSignIn('that');
    return { ...errorResponse, detail: error?.message || null };
  }
}

export default { sendAssistantMessage, matchIntent };
