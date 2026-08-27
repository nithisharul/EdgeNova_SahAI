import Config from '../constants/Config';
import { postJson } from './apiClient';
import { setLatestCrop } from './sessionState';

/**
 * Crop recommendation service.
 *
 * The frontend contains NO prediction logic -- this maps the form's field
 * names onto the trained model's feature names, calls FastAPI, and maps the
 * response back into the shape the screen already renders.
 *
 * MODEL CONTRACT (models/train_crop_model.py, 22 crops, 97.9% test accuracy)
 *   features : N, P, K, temperature, humidity, ph, rainfall
 *   output   : crop label + softmax probability + ranked alternatives
 *
 * The screen's nitrogen/phosphorus/potassium are the same three quantities as
 * N/P/K, so this is a rename, not a conversion.
 */

/** Screen field names -> the model's training feature names. */
function toModelFeatures(input) {
  return {
    N: input.nitrogen,
    P: input.phosphorus,
    K: input.potassium,
    temperature: input.temperature,
    humidity: input.humidity,
    ph: input.ph,
    rainfall: input.rainfall,
  };
}

const titleCase = (s) => String(s).charAt(0).toUpperCase() + String(s).slice(1);

/**
 * API payload -> the shape the screen renders.
 *
 * `confidence` is a real softmax probability from the trained classifier, so
 * it is shown as a percentage. The model offers no explanation of WHY a crop
 * won, so none is claimed: `factors` reports its ranked runners-up, labelled
 * as exactly that.
 */
function fromApi(payload, input) {
  const alternatives = (payload.alternatives || []).filter(
    (alt) => alt.crop !== payload.recommended_crop
  );

  return {
    crop: titleCase(payload.recommended_crop),
    confidence: Math.round((payload.confidence ?? 0) * 100),
    message: 'Best match for these readings out of the 22 crops the model knows.',
    factors: alternatives.length
      ? alternatives.map(
          (alt) =>
            `Next closest: ${titleCase(alt.crop)} (${Math.round((alt.confidence ?? 0) * 100)}%)`
        )
      : ['No close alternative for these readings'],
    fertilizerAvailable: !!payload.fertilizer_available,
    input,
  };
}

/**
 * @param {object} input - { nitrogen, phosphorus, potassium, temperature,
 *                           humidity, ph, rainfall } as numbers.
 */
export async function recommendCrop(input) {
  const payload = await postJson(
    Config.ENDPOINTS.cropRecommendation,
    toModelFeatures(input)
  );
  const result = fromApi(payload, input);
  // Remembered so Home and the Assistant can refer to the real latest
  // recommendation instead of a constant.
  setLatestCrop(result);
  return result;
}

export default { recommendCrop };
