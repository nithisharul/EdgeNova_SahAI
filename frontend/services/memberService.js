import Config from '../constants/Config';
import { getJson, postJson } from './apiClient';

/**
 * Member service.
 *
 * The roster used to live in a module-level array that reset on reload. It is
 * now the `users` table joined against each member's real ledger position, so
 * a member added during a demo is still there after a refresh.
 *
 * Savings and outstanding loan are NOT stored columns -- the backend derives
 * them from the hash-chained ledger, which is why they always agree with the
 * Finance and Transactions screens.
 */

/** Backend member -> the shape MemberCard and the detail screen render. */
function toMember(row) {
  return {
    id: row.member_id,
    name: row.name,
    phone: row.phone,
    village: row.village,
    savings: row.savings,
    outstandingLoan: row.outstanding_loan,
    repaymentStatus: row.repayment_status,
    joinedAt: row.joined_at,
  };
}

/** Backend history row -> the transaction shape the detail screen renders. */
function toHistoryEntry(row) {
  return {
    id: row.id,
    type:
      row.entry_type === 'savings_deposit'
        ? 'savings'
        : row.entry_type === 'loan_disbursed'
        ? 'disbursement'
        : 'repayment',
    description: row.description,
    amount: row.amount,
    date: row.date,
    status: 'Completed',
    statusTone: 'success',
  };
}

export async function getMembers() {
  const body = await getJson(Config.ENDPOINTS.members);
  return (body.members || []).map(toMember);
}

export async function getMemberById(id) {
  const row = await getJson(`${Config.ENDPOINTS.members}/${encodeURIComponent(id)}`);
  return {
    ...toMember(row),
    history: (row.history || []).map(toHistoryEntry),
  };
}

/**
 * Register a member.
 *
 * @param {object} input - { name, phone, village, initialSavings }
 *
 * An opening balance is written to the ledger as a real savings deposit, so
 * the group's corpus moves the moment the member is added.
 */
export async function addMember(input) {
  const row = await postJson(Config.ENDPOINTS.members, {
    name: input.name.trim(),
    phone: input.phone.trim(),
    village: input.village.trim(),
    initial_savings: Number(input.initialSavings) || 0,
  });
  return toMember(row);
}

export default { getMembers, getMemberById, addMember };
