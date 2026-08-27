import Config from '../constants/Config';

/**
 * Fertilizer recommendation service.
 *
 * Same contract as cropService: a replaceable seam with no agronomy logic in
 * it. The mock payload mirrors what Config.ENDPOINTS.fertilizerRecommendation
 * will return so the screen never has to change.
 */

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Placeholder response, shaped exactly like the eventual API payload. */
export const MOCK_RECOMMENDATION = {
  fertilizer: 'NPK 20-20-20',
  quantity: 35,
  quantityUnit: 'kg/ha',
  estimatedSaving: 1200,
  message:
    'A balanced NPK application is recommended for the current nutrient profile.',
  actions: [
    'Reduce excess nitrogen application',
    'Apply after soil moisture improves',
    'Recheck nutrients after the next crop cycle',
  ],
};

/**
 * @param {object} input - { crop, nitrogen, phosphorus, potassium, ph }.
 * @returns {Promise<object>} the recommendation payload.
 */
export async function recommendFertilizer(input) {
  await wait(Config.MOCK_DELAY);

  if (!Config.USE_MOCK_DATA) {
    // Reached once the backend is live; wired up in a later phase.
    throw new Error('Live fertilizer prediction is not connected yet.');
  }

  // The payload is returned as-is: no dosing maths or branching here.
  return { ...MOCK_RECOMMENDATION, input };
}

export default { recommendFertilizer };
