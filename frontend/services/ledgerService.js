import Config from '../constants/Config';
import { getJson } from './apiClient';

/**
 * Secure SHG ledger service.
 *
 * No hashing, no chain walking and no verification logic lives here or
 * anywhere else in the frontend. GET /ledger/all returns the stored chain and
 * GET /ledger/verify recomputes every SHA-256 hash in backend/ledger.py and
 * reports the verdict. This module only reshapes those responses.
 *
 * The verdict is rendered exactly as the backend returns it. If the backend
 * reports a broken chain the UI shows a broken chain -- there is no path here
 * that can force a VERIFIED result.
 */

export const GENESIS_HASH =
  '0000000000000000000000000000000000000000000000000000000000000000';

/** Ledger entry_type -> the label and styling vocabulary the cards use. */
const KIND = {
  savings_deposit: { kind: 'savings', label: 'Savings Deposit', direction: 'in' },
  loan_disbursed: { kind: 'disbursement', label: 'Loan Disbursement', direction: 'out' },
  loan_repayment: { kind: 'repayment', label: 'Loan Repayment', direction: 'in' },
};

/**
 * Layout simulation modes, opt-in via /ledger?demo=tampered|empty|error.
 *
 * These do NOT fake data on the normal path: 'verified' -- the default and
 * the only state anyone reaches without editing the URL -- calls the real
 * backend. The others exist so the tamper, empty and failure layouts can be
 * checked without corrupting a real database, and each one is reported to the
 * screen as a simulation rather than as a backend verdict.
 */
const MODES = ['verified', 'tampered', 'empty', 'error'];

let demoMode = 'verified';

export function setLedgerDemoMode(mode) {
  demoMode = MODES.includes(mode) ? mode : 'verified';
}

export function getLedgerDemoMode() {
  return demoMode;
}

/** One backend ledger row in the shape the records list renders. */
function toRecord(row, names) {
  const meta = KIND[row.entry_type] || {
    kind: row.entry_type,
    label: row.entry_type,
    direction: 'in',
  };
  return {
    id: `TXN-${String(row.id).padStart(3, '0')}`,
    sequence: row.id,
    memberName: names[row.member_id] || row.member_id,
    memberId: row.member_id,
    type: meta.label,
    kind: meta.kind,
    direction: meta.direction,
    amount: row.amount,
    timestamp: new Date(row.timestamp * 1000).toISOString(),
    note: null, // the ledger stores no free-text note
    verified: true, // per-row status comes from the chain check below
    currentHash: row.entry_hash,
    previousHash: row.prev_hash,
  };
}

function summarise(records) {
  return {
    totalRecords: records.length,
    savingsEntries: records.filter((r) => r.kind === 'savings').length,
    loanEntries: records.filter((r) => r.kind === 'disbursement').length,
    repaymentEntries: records.filter((r) => r.kind === 'repayment').length,
  };
}

/** Fetch the chain plus the member names the rows refer to. */
async function loadChain() {
  const [rows, membersBody] = await Promise.all([
    getJson(Config.ENDPOINTS.ledgerAll),
    getJson(Config.ENDPOINTS.members),
  ]);

  const names = {};
  (membersBody.members || []).forEach((m) => {
    names[m.member_id] = m.name;
  });

  // Newest first, which is how every screen reads it.
  return (rows || []).map((row) => toRecord(row, names)).reverse();
}

/** Backend verify response -> the integrity shape the screens render. */
function toIntegrity(result, total) {
  const brokenId = result.broken_entry_id;
  return {
    verified: !!result.valid,
    totalRecords: total,
    // A broken chain stops being trustworthy at the first bad entry.
    checkedRecords: result.valid ? total : Math.max(total - 1, 0),
    tamperedRecordId: brokenId == null ? null : `TXN-${String(brokenId).padStart(3, '0')}`,
    verifiedAt: new Date().toISOString(),
    simulated: false,
  };
}

/**
 * Loads the ledger page.
 * @returns {Promise<{records: object[], summary: object, integrity: object}>}
 */
export async function getLedgerRecords() {
  if (demoMode === 'error') {
    throw new Error('Unable to load ledger records.');
  }
  if (demoMode === 'empty') {
    return {
      records: [],
      summary: summarise([]),
      integrity: {
        verified: true,
        totalRecords: 0,
        checkedRecords: 0,
        tamperedRecordId: null,
        verifiedAt: new Date().toISOString(),
        simulated: true,
      },
    };
  }

  const records = await loadChain();

  if (demoMode === 'tampered') {
    // Layout check only: mark the middle record and say so.
    const target = records[Math.floor(records.length / 2)];
    return {
      records: records.map((r) => (r.id === target?.id ? { ...r, verified: false } : r)),
      summary: summarise(records),
      integrity: {
        verified: false,
        totalRecords: records.length,
        checkedRecords: Math.max(records.length - 1, 0),
        tamperedRecordId: target?.id ?? null,
        verifiedAt: new Date().toISOString(),
        simulated: true,
      },
    };
  }

  const result = await getJson(Config.ENDPOINTS.ledgerVerify);
  const integrity = toIntegrity(result, records.length);

  return {
    records: records.map((r) =>
      integrity.tamperedRecordId && r.id === integrity.tamperedRecordId
        ? { ...r, verified: false }
        : r
    ),
    summary: summarise(records),
    integrity,
  };
}

/**
 * Runs an integrity check across the chain.
 *
 * The verdict is the backend's; this function only reshapes it.
 */
export async function verifyLedger() {
  if (demoMode === 'error') {
    throw new Error('Ledger verification could not be completed.');
  }

  const { integrity } = await getLedgerRecords();
  return integrity;
}

/**
 * Single record for the detail screen.
 * @param {string} id - e.g. "TXN-024".
 */
export async function getLedgerRecordById(id) {
  if (demoMode === 'error') {
    throw new Error('Unable to load this ledger record.');
  }

  const { records } = await getLedgerRecords();
  const record = records.find((entry) => entry.id === id);
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
