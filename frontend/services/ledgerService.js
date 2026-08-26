import Config from '../constants/Config';
import {
  ledgerRecords,
  ledgerSummary,
  verifiedResult,
  tamperedResult,
} from '../data/mockLedgerData';

/**
 * Secure SHG ledger service.
 *
 * This module is the seam between the app and the backend. No hashing, no
 * chain walking and no verification logic lives here or anywhere else in the
 * frontend -- those belong to ledger.py behind
 * Config.API_BASE_URL + Config.ENDPOINTS.ledgerVerify. Today every function
 * resolves canned data shaped like the eventual API payload, so screens will
 * not change when the real endpoints are wired up.
 */

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Demo modes for the hackathon walkthrough.
 *
 * 'verified' is the default and the only state a real user sees. The others
 * exist so the tamper, empty and failure screens can be shown on demand:
 * open /ledger?demo=tampered (or empty / error) during a demo, or change
 * demoMode below. Nothing in the UI advertises them.
 */
const MODES = ['verified', 'tampered', 'empty', 'error'];

let demoMode = 'verified';

export function setLedgerDemoMode(mode) {
  demoMode = MODES.includes(mode) ? mode : 'verified';
}

export function getLedgerDemoMode() {
  return demoMode;
}

/** Records for the current demo mode, newest first. */
function recordsForMode() {
  if (demoMode === 'empty') return [];
  if (demoMode === 'tampered') {
    return ledgerRecords.map((record) =>
      record.id === tamperedResult.tamperedRecordId ? { ...record, verified: false } : record
    );
  }
  return ledgerRecords;
}

function summaryForMode() {
  if (demoMode === 'empty') {
    return { totalRecords: 0, savingsEntries: 0, loanEntries: 0, repaymentEntries: 0 };
  }
  return ledgerSummary;
}

/**
 * Loads the ledger page.
 * @returns {Promise<{records: object[], summary: object, integrity: object}>}
 */
export async function getLedgerRecords() {
  await wait(Config.MOCK_DELAY);

  if (!Config.USE_MOCK_DATA) {
    // Reached once the backend is live; wired up in a later phase.
    throw new Error('Unable to load ledger records.');
  }

  if (demoMode === 'error') {
    throw new Error('Unable to load ledger records.');
  }

  return {
    records: recordsForMode(),
    summary: summaryForMode(),
    integrity: integrityForMode(),
  };
}

/** Integrity result as the backend would report it for the current mode. */
function integrityForMode() {
  if (demoMode === 'tampered') return tamperedResult;
  if (demoMode === 'empty') {
    return { ...verifiedResult, totalRecords: 0, checkedRecords: 0 };
  }
  return verifiedResult;
}

/**
 * Runs an integrity check across the chain.
 * @returns {Promise<{verified: boolean, totalRecords: number,
 *                    checkedRecords: number, tamperedRecordId: ?string,
 *                    verifiedAt: string}>}
 */
export async function verifyLedger() {
  await wait(Config.MOCK_DELAY);

  if (!Config.USE_MOCK_DATA) {
    throw new Error('Ledger verification is not connected yet.');
  }

  if (demoMode === 'error') {
    throw new Error('Ledger verification could not be completed.');
  }

  // The verdict is returned as-is: the frontend never decides it.
  return { ...integrityForMode(), verifiedAt: new Date().toISOString() };
}

/**
 * Single record for the detail screen.
 * @param {string} id - e.g. "TXN-024".
 * @returns {Promise<object>} the record, including its stored hashes.
 */
export async function getLedgerRecordById(id) {
  await wait(Math.min(Config.MOCK_DELAY, 400));

  if (demoMode === 'error') {
    throw new Error('Unable to load this ledger record.');
  }

  const record = recordsForMode().find((entry) => entry.id === id);
  if (!record) {
    throw new Error('This ledger record could not be found.');
  }

  return record;
}

export default {
  getLedgerRecords,
  verifyLedger,
  getLedgerRecordById,
  setLedgerDemoMode,
  getLedgerDemoMode,
};
