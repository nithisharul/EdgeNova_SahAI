import Config from '../constants/Config';
import { getJson, postJson } from './apiClient';
import { setLatestFertilizer } from './sessionState';

/**
 * Fertilizer recommendation service.
 *
 * MODEL CONTRACT (models/train_fertilizer_model.py -> 7 fertilizer grades)
 *   numeric     : temperature, humidity, moisture, nitrogen, potassium, phosphorous
 *   categorical : soil_type (5 values), crop_type (11 values)
 *
 * The backend accepts either a fertilizer-dataset crop name or a crop-model
 * name and translates between the two vocabularies itself
 * (backend/services/agri_pipeline.py). For the ten fruit and plantation crops
 * the model has no category for, it answers from a published guideline table
 * and tags the response `source: "guideline_table"` -- that distinction is
 * carried through to the UI rather than being smoothed over.
 *
 * The model returns a fertilizer GRADE and nothing else. It has no opinion on
 * dosage or on money saved, so those fields are null instead of being filled
 * with plausible-looking numbers.
 */

/** Screen field names -> the API's field names. */
function toModelFeatures(input) {
  return {
    temperature: Number(input.temperature),
    humidity: Number(input.humidity),
    moisture: Number(input.moisture),
    nitrogen: Number(input.nitrogen),
    potassium: Number(input.potassium),
    phosphorous: Number(input.phosphorus),
    soil_type: input.soilType,
    crop_type: input.crop,
  };
}

/** API payload -> the shape the screen renders. */
function fromApi(payload, input) {
  const fromGuideline = payload.source === 'guideline_table';

  const actions = [];
  if (payload.note) actions.push(payload.note);
  if (payload.soil_note) actions.push(payload.soil_note);
  if (payload.mapping_is_approximate) {
    actions.push(`Matched to '${payload.crop_type_used}', the closest category the model has.`);
  }
  if (!actions.length) {
    actions.push('Confirm dosage with your local agri-extension officer.');
  }

  return {
    fertilizer: payload.recommended_fertilizer,
    // Guideline-table answers carry no probability, so none is shown.
    confidence:
      payload.confidence == null ? null : Math.round(payload.confidence * 100),
    source: fromGuideline ? 'guideline' : 'model',
    message: fromGuideline
      ? 'General guidance for this crop -- the trained model has no category for it.'
      : 'Recommended for these soil readings and this crop.',
    // The model predicts a grade only. Dosage and savings are not its output.
    quantity: null,
    quantityUnit: null,
    estimatedSaving: null,
    actions,
    input,
  };
}

/** Soil types, crop types and grades the model actually knows. */
export async function getFertilizerOptions() {
  const body = await getJson(Config.ENDPOINTS.fertilizerOptions);
  return {
    soilTypes: body.soil_types || [],
    cropTypes: body.crop_types || [],
    fertilizerClasses: body.fertilizer_classes || [],
    guidelineOnlyCrops: body.guideline_only_crops || [],
  };
}

/**
 * @param {object} input - { crop, soilType, temperature, humidity, moisture,
 *                           nitrogen, phosphorus, potassium }
 */
export async function recommendFertilizer(input) {
  const payload = await postJson(
    Config.ENDPOINTS.fertilizerRecommendation,
    toModelFeatures(input)
  );
  const result = fromApi(payload, input);
  setLatestFertilizer(result);
  return result;
}

export default { recommendFertilizer, getFertilizerOptions };
