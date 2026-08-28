import Config from '../constants/Config';
import { apiGet, apiPost, query } from './apiClient';
import { rememberAdvisory } from './sessionState';

/**
 * Crop Advisor.
 *
 * The screen's primary call is POST /crop-advisory, which returns crop +
 * fertilizer + explainability in one round trip. There is NO prediction logic
 * in this file and none belongs here -- it adapts snake_case backend fields to
 * the camelCase the screens read, and nothing else.
 *
 * TWO NPK SCALES, NEVER MIXED
 * ---------------------------
 * The crop model's N/P/K and the fertilizer model's nitrogen/potassium/
 * phosphorous come from different datasets on different measurement bases
 * (crop runs 0-140, fertilizer 4-42). This module never copies one into the
 * other. When the farmer has no fertilizer soil test the backend replies
 * needs_soil_test, and the screen says exactly that.
 */

/** Backend soil vocabulary for the crop-advisory soil_type field. */
export const SOIL_TYPES = ['Sandy', 'Loamy', 'Black', 'Red', 'Clayey'];

function adaptWeather(raw) {
  if (!raw) return null;
  return {
    temperature: raw.temperature,
    humidity: raw.humidity,
    rainfall: raw.rainfall,
    source: raw.source,
    locatedBy: raw.located_by,
    latitude: raw.latitude,
    longitude: raw.longitude,
    rainfallBasis: raw.rainfall_basis,
    rainfallDaysCounted: raw.rainfall_days_counted,
    resolvedLocation: raw.resolved_location
      ? {
          name: raw.resolved_location.resolved_name,
          admin1: raw.resolved_location.admin1,
          country: raw.resolved_location.country,
        }
      : null,
  };
}

/**
 * GET /weather -- prefill temperature/humidity/rainfall from a location.
 * @param {{latitude?: number, longitude?: number, place?: string}} where
 */
export async function fetchWeather({ latitude, longitude, place } = {}) {
  const raw = await apiGet(Config.ENDPOINTS.weather + query({ latitude, longitude, place }), {
    auth: false,
  });
  return adaptWeather(raw);
}

/** The weather provenance block an advisory response carries back. */
function adaptWeatherMeta(meta) {
  if (!meta) return null;
  return {
    source: meta.weather_source,
    locatedBy: meta.located_by || null,
    latitude: meta.latitude ?? null,
    longitude: meta.longitude ?? null,
    fetchedFields: meta.fetched_fields || [],
    rainfallBasis: meta.rainfall_basis || null,
    caveat: meta.caveat || null,
    resolvedLocation: meta.resolved_location
      ? {
          name: meta.resolved_location.resolved_name,
          admin1: meta.resolved_location.admin1,
          country: meta.resolved_location.country,
        }
      : null,
  };
}

function adaptWhy(why) {
  if (!why) return null;
  return {
    summary: why.summary,
    method: why.method,
    caveat: why.caveat,
    topFactors: (why.top_factors || []).map((factor) => ({
      feature: factor.feature,
      label: factor.label,
      value: factor.value,
      influence: factor.influence,
      direction: factor.direction,
    })),
  };
}

/**
 * The fertilizer half of an advisory response, and of the standalone endpoint.
 *
 * `confidence` stays null for guideline-table answers: there is no probability
 * behind a published table, so the UI must not draw a confidence bar for one.
 */
export function adaptFertilizer(fertilizer) {
  if (!fertilizer) return null;
  const confidence = fertilizer.confidence;
  return {
    fertilizer: fertilizer.fertilizer ?? fertilizer.recommended_fertilizer,
    confidence: confidence === null || confidence === undefined ? null : confidence,
    source: fertilizer.source || null,
    note: fertilizer.note || null,
    soilNote: fertilizer.soil_note || null,
    cropTypeUsed: fertilizer.crop_type_used || null,
    mappingIsApproximate: fertilizer.mapping_is_approximate ?? null,
    alternatives: (fertilizer.alternatives || []).map((alt) => ({
      fertilizer: alt.fertilizer,
      confidence: alt.confidence,
    })),
  };
}

function adaptAdvisory(raw) {
  const crop = raw.crop || {};
  return {
    crop: {
      name: crop.crop,
      confidence: crop.confidence,
      alternatives: (crop.alternatives || []).map((alt) => ({
        crop: alt.crop,
        confidence: alt.confidence,
      })),
    },
    mappedCropType: raw.mapped_crop_type ?? null,
    mappingIsApproximate: raw.mapping_is_approximate ?? false,
    fertilizer: adaptFertilizer(raw.fertilizer),
    needsSoilTest: !!raw.needs_soil_test,
    needsManualCropType: !!raw.needs_manual_crop_type,
    message: raw.message || null,
    why: adaptWhy(raw.why),
    inputsUsed: raw.inputs_used || null,
    weather: adaptWeatherMeta(raw.weather),
  };
}

/**
 * POST /crop-advisory.
 *
 * @param {object} input
 *   Soil (required):      n, p, k, ph, soilType, moisture
 *   Location (optional):  latitude, longitude, place
 *   Weather (optional):   temperature, humidity, rainfall -- typed values win
 *   Soil test (optional, all three or none):
 *                         fertNitrogen, fertPotassium, fertPhosphorous
 *
 * Weather is left out of the body when the farmer did not type it, and that
 * absence is what tells the backend to look it up from the location.
 */
export async function getCropAdvisory(input) {
  const body = {
    N: Number(input.n),
    P: Number(input.p),
    K: Number(input.k),
    ph: Number(input.ph),
    soil_type: input.soilType,
    moisture: Number(input.moisture),
  };

  if (input.latitude !== undefined && input.latitude !== null) {
    body.latitude = Number(input.latitude);
  }
  if (input.longitude !== undefined && input.longitude !== null) {
    body.longitude = Number(input.longitude);
  }
  if (input.place) body.place = String(input.place).trim();

  ['temperature', 'humidity', 'rainfall'].forEach((field) => {
    const value = input[field];
    if (value !== undefined && value !== null && value !== '') body[field] = Number(value);
  });

  // The fertilizer model needs all three of its own soil-test values or none:
  // a partial set would make the backend answer needs_soil_test anyway.
  const triple = [input.fertNitrogen, input.fertPotassium, input.fertPhosphorous];
  if (triple.every((v) => v !== undefined && v !== null && v !== '')) {
    body.fert_nitrogen = Number(input.fertNitrogen);
    body.fert_potassium = Number(input.fertPotassium);
    body.fert_phosphorous = Number(input.fertPhosphorous);
  }

  const result = adaptAdvisory(
    await apiPost(Config.ENDPOINTS.cropAdvisory, body, { auth: false })
  );
  rememberAdvisory(result);
  return result;
}

export default { getCropAdvisory, fetchWeather, adaptFertilizer, SOIL_TYPES };
