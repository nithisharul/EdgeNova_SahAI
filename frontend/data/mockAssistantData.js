/**
 * SahAI Assistant preset content.
 *
 * Every figure the Assistant quotes is IMPORTED from the module that owns it,
 * never retyped here. That is deliberate: if the crop mock or the finance
 * summary changes, the Assistant's answer changes with it and the two can
 * never contradict each other on screen.
 *
 * Sources:
 *   crop        -> services/cropService.js
 *   fertilizer  -> services/fertilizerService.js
 *   loan risk   -> services/loanService.js
 *   finance     -> data/mockFinanceData.js
 *   ledger      -> data/mockLedgerData.js  (Phase 6)
 */

import { MOCK_RECOMMENDATION as CROP } from '../services/cropService';
import { MOCK_RECOMMENDATION as FERTILIZER } from '../services/fertilizerService';
import { MOCK_ASSESSMENTS } from '../services/loanService';
import { financeSummary } from './mockFinanceData';
import { verifiedResult, ledgerSummary } from './mockLedgerData';
import { formatCurrency } from '../utils/currency';

/** The Low-risk assessment, i.e. what the loan demo shows first. */
const LOAN = MOCK_ASSESSMENTS[0];

/** Opening message shown whenever the conversation starts or is reset. */
export const welcomeMessage = {
  id: 'welcome',
  role: 'assistant',
  text:
    'Namaste! I am SahAI.\n\n' +
    'I can help you understand crop recommendations, fertilizer guidance, ' +
    'SHG finances, loan risk and ledger records.\n\n' +
    'What would you like to know?',
};

/** Suggestion chips: three agriculture, three finance, so neither dominates. */
export const suggestedQuestions = [
  { id: 'q-crop', icon: 'leaf', label: 'Which crop suits my soil?', domain: 'Agriculture' },
  {
    id: 'q-fert',
    icon: 'flask',
    label: 'Which fertilizer should I use?',
    domain: 'Agriculture',
  },
  {
    id: 'q-cost',
    icon: 'trending-down',
    label: 'How can I reduce farming costs?',
    domain: 'Agriculture',
  },
  {
    id: 'q-finance',
    icon: 'wallet',
    label: 'How is our SHG performing?',
    domain: 'Finance',
  },
  {
    id: 'q-loan',
    icon: 'shield-checkmark',
    label: 'Can this member safely take a loan?',
    domain: 'Finance',
  },
  {
    id: 'q-ledger',
    icon: 'lock-closed',
    label: 'Are our ledger records verified?',
    domain: 'Finance',
  },
];

/**
 * Keyword sets for the preset matcher. Checked in the order listed in
 * services/assistantService.js so "loan risk" resolves to loan, not finance.
 */
export const intentKeywords = {
  crop: ['crop', 'soil', 'plant', 'sow', 'rice', 'harvest', 'grow', 'cultivat', 'seed'],
  fertilizer: [
    'fertilizer',
    'fertiliser',
    'npk',
    'nutrient',
    'urea',
    'manure',
    'farming cost',
    'farming',
  ],
  loan: ['loan', 'risk', 'repayment', 'borrow', 'credit', 'approve', 'lend'],
  ledger: ['ledger', 'tamper', 'record', 'integrity', 'secure', 'verified', 'audit', 'hash'],
  finance: ['saving', 'shg', 'finance', 'money', 'fund', 'balance', 'group', 'member'],
};

/** Preset answers. Each may carry a structured card and one navigation action. */
export const assistantResponses = {
  crop: {
    intent: 'crop',
    text: `${CROP.crop} is currently your strongest crop match.`,
    card: {
      title: 'Best Crop Match',
      headline: CROP.crop,
      icon: 'leaf',
      tone: 'success',
      stats: [{ label: 'Suitability', value: `${CROP.confidence}%` }],
      highlights: CROP.factors,
    },
    action: { label: 'View Crop Recommendation', route: '/crop-recommendation' },
  },

  fertilizer: {
    intent: 'fertilizer',
    text: 'Your current fertilizer recommendation is:',
    card: {
      title: 'Fertilizer Guidance',
      headline: FERTILIZER.fertilizer,
      icon: 'flask',
      tone: 'success',
      stats: [
        {
          label: 'Recommended Quantity',
          value: `${FERTILIZER.quantity} ${FERTILIZER.quantityUnit}`,
        },
        { label: 'Estimated Saving', value: formatCurrency(FERTILIZER.estimatedSaving) },
      ],
      highlights: FERTILIZER.actions,
    },
    action: { label: 'View Fertilizer Advice', route: '/fertilizer-advice' },
  },

  finance: {
    intent: 'finance',
    text: `Your SHG has ${financeSummary.activeMembers} active members and is holding:`,
    card: {
      title: 'SHG Finance Summary',
      headline: formatCurrency(financeSummary.totalSavings),
      icon: 'wallet',
      tone: 'success',
      stats: [
        { label: 'Available Balance', value: formatCurrency(financeSummary.availableBalance) },
        { label: 'Outstanding Loans', value: formatCurrency(financeSummary.outstandingLoans) },
      ],
      highlights: [
        `${financeSummary.activeMembers} active members`,
        `${formatCurrency(financeSummary.savingsThisMonth)} saved this month`,
      ],
    },
    action: { label: 'Open SHG Finance', route: '/finance' },
  },

  loan: {
    intent: 'loan',
    text: 'The latest demonstration assessment is:',
    card: {
      title: 'Loan Risk Assessment',
      headline: `${LOAN.riskLevel.toUpperCase()} RISK`,
      icon: 'shield-checkmark',
      tone: 'success',
      stats: [
        { label: 'Risk Score', value: `${LOAN.riskScore}%` },
        { label: 'Repayment Probability', value: `${LOAN.repaymentProbability}%` },
      ],
      highlights: LOAN.reasons,
    },
    action: { label: 'View Loan Assessment', route: '/loan-risk' },
  },

  ledger: {
    intent: 'ledger',
    text: verifiedResult.verified
      ? 'Your SHG ledger is currently verified.'
      : 'Your SHG ledger needs attention.',
    card: {
      title: 'Ledger Integrity',
      headline: verifiedResult.verified ? 'VERIFIED' : 'TAMPERING DETECTED',
      icon: 'lock-closed',
      tone: verifiedResult.verified ? 'success' : 'error',
      stats: [
        {
          label: 'Records Checked',
          value: `${verifiedResult.checkedRecords} of ${verifiedResult.totalRecords}`,
        },
        { label: 'Savings Entries', value: String(ledgerSummary.savingsEntries) },
      ],
      highlights: verifiedResult.verified
        ? [
            'No tampering was detected',
            'Every record matches its stored hash',
            'The chain is unbroken back to the first entry',
          ]
        : ['A record failed the integrity check'],
    },
    action: { label: 'Open Secure Ledger', route: '/ledger' },
  },
};

/** Shown when nothing matches -- the Assistant says what it can do instead. */
export const fallbackResponse = {
  intent: 'unknown',
  text:
    'I can currently help with crop recommendations, fertilizer guidance, ' +
    'SHG finances, loan risk and ledger information.\n\n' +
    'Try one of the suggested questions below.',
};

/** Shown when the service itself fails. */
export const errorResponse = {
  intent: 'error',
  text: 'I could not process that right now.\n\nPlease try again.',
};

export default {
  welcomeMessage,
  suggestedQuestions,
  intentKeywords,
  assistantResponses,
  fallbackResponse,
  errorResponse,
};
