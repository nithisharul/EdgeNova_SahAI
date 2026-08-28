/**
 * SahAI Assistant static content.
 *
 * Only wording lives here -- greetings, suggestion chips, keyword sets and the
 * educational answers that quote no figures. Every NUMBER the Assistant says
 * is fetched at question time by services/assistantService.js.
 *
 * That split is the point. The previous version built its answers at module
 * load from mock constants, so it would happily state a savings total that no
 * longer matched the screen it linked to. Nothing in this file can go stale,
 * because nothing in it is a fact about the group.
 */

export const welcomeMessage = {
  id: 'welcome',
  role: 'assistant',
  text:
    'Namaste. Ask me about your field or your money.\n\n' +
    'I read the same records the rest of the app does, so what I tell you is ' +
    'what is actually recorded.',
};

/**
 * Suggestion chips. `roles` limits a chip to certain signed-in roles:
 * omitted means everyone, including signed-out visitors.
 */
export const suggestedQuestions = [
  { id: 'q-crop', icon: 'leaf', label: 'Crop recommendation', domain: 'Agriculture' },
  { id: 'q-fert', icon: 'flask', label: 'Fertilizer', domain: 'Agriculture' },
  { id: 'q-land', icon: 'map', label: 'My land', domain: 'Agriculture' },
  {
    id: 'q-savings',
    icon: 'wallet',
    label: 'My savings',
    domain: 'Finance',
    roles: ['member', 'treasurer', 'admin'],
  },
  {
    id: 'q-loan',
    icon: 'shield-checkmark',
    label: 'Loan assessment',
    domain: 'Finance',
    roles: ['member', 'treasurer', 'admin'],
  },
  {
    id: 'q-group',
    icon: 'people',
    label: 'Group summary',
    domain: 'Finance',
    roles: ['treasurer', 'admin'],
  },
  {
    id: 'q-ledger',
    icon: 'lock-closed',
    label: 'Ledger status',
    domain: 'Finance',
    roles: ['treasurer', 'admin'],
  },
];

/**
 * Keyword sets for the matcher. Order is set in assistantService's
 * INTENT_ORDER so "loan risk" resolves to loan rather than the broader finance.
 */
export const intentKeywords = {
  crop: ['crop', 'soil', 'plant', 'sow', 'rice', 'harvest', 'grow', 'cultivat', 'seed', 'weather'],
  fertilizer: ['fertilizer', 'fertiliser', 'npk', 'nutrient', 'urea', 'manure', 'dose'],
  land: ['land', 'field', 'plot', 'acre', 'farm profile', 'holding', 'my land'],
  loan: ['loan', 'risk', 'borrow', 'credit', 'lend', 'repay'],
  ledger: ['ledger', 'tamper', 'integrity', 'secure', 'verified', 'audit', 'hash', 'record'],
  group: ['shg', 'group', 'corpus', 'everyone', 'all members', 'our savings'],
  savings: ['saving', 'deposit', 'balance', 'portfolio', 'my money', 'my account'],
};

/** Answers that teach rather than report. No figures, so they never go stale. */
export const staticAnswers = {
  help: {
    intent: 'help',
    text:
      'I can help you with:\n\n' +
      '- Crop and fertilizer advice, and why a crop was suggested\n' +
      '- Your savings, deposits and loan position\n' +
      '- Whether a loan request looks low or high risk\n' +
      '- Your field profile\n\n' +
      'Ask in your own words, or tap a suggestion below.',
  },
};

export const fallbackResponse = {
  intent: 'unknown',
  text:
    'I can help with crop advice, fertilizer, your savings and loans, and your ' +
    'group records.\n\nTry one of the suggestions below.',
};

export const errorResponse = {
  intent: 'error',
  text: 'I could not check that just now.\n\nPlease try again in a moment.',
};

export default {
  welcomeMessage,
  suggestedQuestions,
  intentKeywords,
  staticAnswers,
  fallbackResponse,
  errorResponse,
};
