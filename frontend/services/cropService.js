import Config from '../constants/Config';

/**
 * Crop recommendation service.
 *
 * The frontend deliberately contains NO prediction logic -- this module is a
 * seam, not a model. Today it resolves a canned response after the configured
 * delay; in a later phase the body of recommendCrop is replaced with a call to
 * Config.API_BASE_URL + Config.ENDPOINTS.cropRecommendation and every screen
 * keeps working unchanged.
 */

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Placeholder response, shaped exactly like the eventual API payload. */
export const MOCK_RECOMMENDATION = {
  crop: 'Rice',
  confidence: 94,
  message:
    'Your soil nutrients and environmental conditions strongly match rice cultivation.',
  factors: [
    'Suitable rainfall conditions',
    'Healthy soil pH range',
    'Strong nitrogen compatibility',
  ],
};

/**
 * @param {object} input - { nitrogen, phosphorus, potassium, temperature,
 *                           humidity, ph, rainfall } as numbers.
 * @returns {Promise<object>} the recommendation payload.
 */
export async function recommendCrop(input) {
  await wait(Config.MOCK_DELAY);

  if (!Config.USE_MOCK_DATA) {
    // Reached once the backend is live; wired up in a later phase.
    throw new Error('Live crop prediction is not connected yet.');
  }

  // The payload is returned as-is: no scoring, thresholds or branching here.
  return { ...MOCK_RECOMMENDATION, input };
}

export default { recommendCrop };
