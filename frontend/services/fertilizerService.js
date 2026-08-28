import Config from '../constants/Config';
import { apiGet, apiPost } from './apiClient';
import { adaptFertilizer } from './cropService';
import { rememberFertilizer } from './sessionState';

/**
 * Standalone Fertilizer -- for someone who already knows their crop.
 *
 * The dropdown vocabulary is NOT hardcoded here. GET /fertilizer/options reads
 * the categories straight out of the trained model's OneHotEncoder, so the
 * options a user can pick are exactly the ones the model was fitted on. A
 * hardcoded list would silently drift the moment the model is retrained, and
 * an unrecognised category does not error -- it becomes an all-zero block and
 * the model returns a confident-looking answer driven by NPK alone.
 *
 * Note the backend's spelling: "phosphorous", not "phosphorus". Mapped here so
 * no screen has to remember it.
 */

/** GET /fertilizer/options -- soil types, crop types, grades, guideline crops. */
export async function getFertilizerOptions() {
  const raw = await apiGet(Config.ENDPOINTS.fertilizerOptions, { auth: false });
  return {
    soilTypes: raw.soil_types || [],
    cropTypes: raw.crop_types || [],
    fertilizerClasses: raw.fertilizer_classes || [],
    guidelineOnlyCrops: raw.guideline_only_crops || [],
  };
}

/**
 * POST /recommend-fertilizer.
 *
 * @param {object} input - temperature, humidity, moisture, nitrogen,
 *                         potassium, phosphorus, soilType, cropType
 *
 * cropType accepts either vocabulary: a fertilizer-dataset name ("Paddy") or a
 * crop-model name ("rice"). The backend translates, and falls back to its
 * guideline table for crops the model cannot handle -- which is why the result
 * carries a `source` the UI must display.
 */
export async function recommendFertilizer(input) {
  const body = {
    temperature: Number(input.temperature),
    humidity: Number(input.humidity),
    moisture: Number(input.moisture),
    nitrogen: Number(input.nitrogen),
    potassium: Number(input.potassium),
    phosphorous: Number(input.phosphorus),
    soil_type: input.soilType,
    crop_type: String(input.cropType).trim(),
  };

  const result = adaptFertilizer(
    await apiPost(Config.ENDPOINTS.recommendFertilizer, body, { auth: false })
  );
  rememberFertilizer(result);
  return result;
}

export default { getFertilizerOptions, recommendFertilizer };
