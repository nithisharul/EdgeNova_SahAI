/**
 * The most recent REAL prediction results, for this session.
 *
 * Home and the Assistant both want to talk about "your latest crop
 * recommendation". The backend stores predictions nowhere -- they are pure
 * functions of the values a farmer typed -- so the only honest source is the
 * result the app actually received.
 *
 * This holds exactly that: nothing is written here unless a real API call
 * returned it. Before the first prediction the getters return null and the
 * screens say so, rather than showing a crop nobody asked for.
 *
 * Deliberately a plain module, not a state library: it is one small piece of
 * session-scoped memory, and it is expected to disappear on reload.
 */

let latestCrop = null;
let latestFertilizer = null;
let latestLoanRisk = null;

export function setLatestCrop(result) {
  latestCrop = result ? { ...result, at: Date.now() } : null;
}

export function getLatestCrop() {
  return latestCrop;
}

export function setLatestFertilizer(result) {
  latestFertilizer = result ? { ...result, at: Date.now() } : null;
}

export function getLatestFertilizer() {
  return latestFertilizer;
}

export function setLatestLoanRisk(result) {
  latestLoanRisk = result ? { ...result, at: Date.now() } : null;
}

export function getLatestLoanRisk() {
  return latestLoanRisk;
}

/** Test helper; also used when switching demo accounts. */
export function clearSessionResults() {
  latestCrop = null;
  latestFertilizer = null;
  latestLoanRisk = null;
}

export default {
  setLatestCrop,
  getLatestCrop,
  setLatestFertilizer,
  getLatestFertilizer,
  setLatestLoanRisk,
  getLatestLoanRisk,
  clearSessionResults,
};
