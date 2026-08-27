/**
 * Assistant copy.
 *
 * Wording only: the greeting, the suggestion chips, the keyword sets the
 * intent matcher uses, and the two responses that carry no data.
 *
 * Every answer that quotes a figure is built at query time in
 * services/assistantService.js from the same services the screens use, so the
 * Assistant cannot state a balance the Finance screen disagrees with. No
 * number belongs in this file.
 */

export const welcomeMessage = {
  id: 'welcome',
  role: 'assistant',
  text:
    'Namaste! I am SahAI.\n\n' +
    'I can help you understand crop recommendations, fertilizer guidance, ' +
    'SHG finances, loan risk and ledger records.\n\n' +
    'What would you like to know?',
};

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

export const fallbackResponse = {
  intent: 'unknown',
  text:
    'I can currently help with crop recommendations, fertilizer guidance, ' +
    'SHG finances, loan risk and ledger information.\n\n' +
    'Try one of the suggested questions below.',
};

export const errorResponse = {
  intent: 'error',
  text: 'I could not process that right now.\n\nPlease try again.',
};

export default {
  welcomeMessage,
  suggestedQuestions,
  intentKeywords,
  fallbackResponse,
  errorResponse,
};
