import Config from '../constants/Config';
import {
  intentKeywords,
  assistantResponses,
  fallbackResponse,
} from '../data/mockAssistantData';

/**
 * Assistant service.
 *
 * There is no language model here and none belongs here. This is a small
 * keyword matcher over a fixed set of preset answers -- deliberately tiny and
 * readable so a demo is deterministic.
 *
 * Later the body of sendAssistantMessage is replaced with a backend call and
 * the screen keeps working unchanged.
 */

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

/**
 * @param {string} message - what the user typed or tapped.
 * @returns {Promise<object>} a preset response, or the fallback.
 */
export async function sendAssistantMessage(message) {
  // A shorter pause than a prediction call -- it should feel like a reply.
  await wait(Math.round(Config.MOCK_DELAY * 0.75));

  const intent = matchIntent(message);
  const response = intent ? assistantResponses[intent] : fallbackResponse;

  return { ...response };
}

export default { sendAssistantMessage, matchIntent };
