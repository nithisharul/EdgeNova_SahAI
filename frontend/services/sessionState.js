/**
 * The last REAL results this session produced.
 *
 * Home and the Assistant both want to talk about "your crop recommendation" or
 * "your last loan check". Neither may invent one. This module holds only what
 * the backend actually returned during this run: nothing is seeded, and every
 * getter returns null until a real call has succeeded.
 *
 * Cleared on sign-out, because a result belongs to the member who asked for it.
 */

let lastAdvisory = null; // full /crop-advisory response, adapted
let lastFertilizer = null; // full /recommend-fertilizer response, adapted
let lastLoan = null; // full /request-loan response, adapted

export function rememberAdvisory(result) {
  lastAdvisory = result || null;
}

export function rememberFertilizer(result) {
  lastFertilizer = result || null;
}

export function rememberLoan(result) {
  lastLoan = result || null;
}

export function getLastAdvisory() {
  return lastAdvisory;
}

export function getLastFertilizer() {
  return lastFertilizer;
}

export function getLastLoan() {
  return lastLoan;
}

/** Called on sign-out. A member must not see the previous member's numbers. */
export function clearSessionResults() {
  lastAdvisory = null;
  lastFertilizer = null;
  lastLoan = null;
}

export default {
  rememberAdvisory,
  rememberFertilizer,
  rememberLoan,
  getLastAdvisory,
  getLastFertilizer,
  getLastLoan,
  clearSessionResults,
};
