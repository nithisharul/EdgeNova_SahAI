import Config from '../constants/Config';
import { apiGet, apiPost } from './apiClient';
import { notifyDataChanged } from './dataSync';

/**
 * The tamper-evident ledger.
 *
 * VERIFICATION IS NOT A FRONTEND DECISION
 * ---------------------------------------
 * verifyLedger() returns exactly what GET /ledger/verify said. No constant, no
 * optimistic default, no "assume valid while loading". The whole security
 * claim is that a SHA-256 chain was walked server-side; a frontend that
 * decided "verified" on its own would be lying about the one thing this
 * product exists to prove.
 *
 * ENTRY TYPES
 * -----------
 * The backend has exactly three, and "expense" is not among them. Rather than
 * invent a ledger row the backend cannot store, that old category is gone.
 */

/** Backend entry_type -> the words shown to a member. */
export const ENTRY_TYPE_LABELS = {
  savings_deposit: 'Deposit',
  loan_disbursed: 'Loan received',
  loan_repayment: 'Repayment',
};

/** Treasurer wording, where "loan received" is really a disbursement. */
export const ENTRY_TYPE_TREASURER_LABELS = {
  savings_deposit: 'Savings deposit',
  loan_disbursed: 'Loan disbursement',
  loan_repayment: 'Loan repayment',
};

/** How each type reads on a statement -- drives colour only. */
export const ENTRY_TYPE_TONES = {
  savings_deposit: 'success',
  loan_disbursed: 'accent',
  loan_repayment: 'warning',
};

/**
 * Entry types a member may write for herself: deliberately just the one.
 *
 * A member who could record her own deposits could manufacture the savings
 * history the loan model reads, so the backend rejects it. The UI must not
 * offer a control that is guaranteed to 403.
 */
export const MEMBER_ENTRY_TYPES = ['loan_repayment'];
export const TREASURER_ENTRY_TYPES = ['savings_deposit', 'loan_disbursed', 'loan_repayment'];

/** Backend timestamps are epoch SECONDS; JavaScript wants milliseconds. */
export function entryDate(entry) {
  return new Date((entry.timestamp || 0) * 1000);
}

export function adaptEntry(raw) {
  return {
    id: raw.id,
    memberId: raw.member_id,
    entryType: raw.entry_type,
    label: ENTRY_TYPE_LABELS[raw.entry_type] || raw.entry_type,
    // Always positive on the wire. Direction comes from entryType, never from
    // the sign -- reading a positive amount as "money in" would misreport
    // every disbursement.
    amount: raw.amount,
    timestamp: raw.timestamp,
    date: entryDate(raw),
    prevHash: raw.prev_hash,
    entryHash: raw.entry_hash,
  };
}

/** POST /ledger/add. Role rules are enforced by the backend; see above. */
export async function addLedgerEntry({ memberId, entryType, amount }) {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error('Amount must be greater than zero.');
  }

  const raw = await apiPost(Config.ENDPOINTS.ledgerAdd, {
    member_id: String(memberId).trim(),
    entry_type: entryType,
    amount: value,
  });

  // The write moved the member's portfolio, the group corpus and the ledger
  // list. Tell any mounted screen to re-read them from the server rather than
  // adjusting its own copy.
  notifyDataChanged();

  return {
    id: raw.id,
    memberId: raw.member_id,
    entryType: raw.entry_type,
    amount: raw.amount,
    timestamp: raw.timestamp,
    entryHash: raw.entry_hash,
  };
}

/** GET /ledger/verify -- treasurer only. The single source of truth. */
export async function verifyLedger() {
  const raw = await apiGet(Config.ENDPOINTS.ledgerVerify);
  return {
    valid: raw.valid,
    brokenEntryId: raw.broken_entry_id ?? null,
    checkedAt: new Date(),
  };
}

/** GET /ledger/all -- treasurer only. Newest first for display. */
export async function getAllEntries() {
  const raw = await apiGet(Config.ENDPOINTS.ledgerAll);
  return (raw || []).map(adaptEntry).sort((a, b) => b.id - a.id);
}

export default {
  addLedgerEntry,
  verifyLedger,
  getAllEntries,
  adaptEntry,
  entryDate,
  ENTRY_TYPE_LABELS,
  ENTRY_TYPE_TREASURER_LABELS,
  ENTRY_TYPE_TONES,
  MEMBER_ENTRY_TYPES,
  TREASURER_ENTRY_TYPES,
};
