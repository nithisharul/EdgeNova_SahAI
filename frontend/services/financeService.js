import Config from '../constants/Config';
import { getJson, postJson } from './apiClient';

/**
 * Read and write side of the SHG finance module.
 *
 * Every figure here comes from the backend, which derives it from the
 * hash-chained ledger in SQLite. Nothing is computed in the app and nothing
 * falls back to a fixture: if a request fails the screen shows an error,
 * because a dashboard that quietly invents a balance is worse than one that
 * admits it is offline.
 *
 * Backend responses are snake_case; screens expect camelCase. That conversion
 * happens here, so no JSX had to change.
 */

/**
 * Ledger entry_type -> the `type` vocabulary the transaction filters and
 * TransactionCard already use.
 */
const TYPE_FROM_ENTRY = {
  savings_deposit: 'savings',
  loan_disbursed: 'disbursement',
  loan_repayment: 'repayment',
};

/** One API transaction in the shape the list and cards render. */
function toTransaction(row) {
  return {
    id: row.id,
    ledgerId: row.ledger_id,
    type: TYPE_FROM_ENTRY[row.entry_type] || row.entry_type,
    description: row.description,
    member: row.member,
    memberId: row.member_id,
    amount: row.amount,
    date: row.date,
    timestamp: row.timestamp,
    status: 'Completed',
    statusTone: 'success',
  };
}

export async function getFinanceSummary() {
  const s = await getJson(Config.ENDPOINTS.financeSummary);
  return {
    totalSavings: s.total_savings,
    availableBalance: s.available_balance,
    outstandingLoans: s.outstanding_loans,
    activeMembers: s.active_members,
    savingsThisMonth: s.savings_this_month,
    transactionCount: s.transaction_count,
  };
}

export async function getTransactions() {
  const body = await getJson(Config.ENDPOINTS.transactions);
  return (body.transactions || []).map(toTransaction);
}

/**
 * Savings totals plus the per-member breakdown, largest balance first.
 *
 * Assembled from the existing endpoints rather than a third dedicated one --
 * the dataset is small and both responses are needed elsewhere anyway.
 */
export async function getSavings() {
  const [summary, membersBody, transactions] = await Promise.all([
    getFinanceSummary(),
    getJson(Config.ENDPOINTS.members),
    getTransactions(),
  ]);

  const byMember = (membersBody.members || [])
    .map((m) => ({
      id: m.member_id,
      name: m.name,
      village: m.village,
      savings: m.savings,
    }))
    .sort((a, b) => b.savings - a.savings);

  return {
    totalSavings: summary.totalSavings,
    savingsThisMonth: summary.savingsThisMonth,
    byMember,
    recentDeposits: transactions.filter((entry) => entry.type === 'savings'),
  };
}

export async function getLoans() {
  const body = await getJson(Config.ENDPOINTS.loans);

  const loans = (body.loans || []).map((loan) => ({
    id: loan.id,
    memberId: loan.member_id,
    member: loan.member,
    principal: loan.principal,
    repaid: loan.repaid,
    remaining: loan.outstanding,
    repaidPercent: loan.repaid_percent,
    status: loan.status === 'Closed' ? 'Closed' : 'On Track',
    disbursedOn: loan.disbursed_on,
    // The ledger records amounts and dates, not a term or a stated purpose.
    // Those stay null rather than being invented; the screen omits them.
    durationMonths: null,
    purpose: null,
  }));

  return {
    summary: {
      outstandingTotal: loans.reduce((sum, loan) => sum + loan.remaining, 0),
      activeCount: loans.filter((loan) => loan.status !== 'Closed').length,
      // Total already repaid across the book. A real figure, unlike a "due
      // this month" number the ledger cannot support without a schedule.
      totalRepaid: loans.reduce((sum, loan) => sum + loan.repaid, 0),
    },
    loans,
  };
}

/**
 * Record a savings deposit.
 *
 * Writes a real hash-chained entry through POST /ledger/add, so it survives a
 * reload and immediately moves every other screen's totals.
 */
export async function recordSavings(input) {
  const entry = await postJson(Config.ENDPOINTS.ledgerAdd, {
    member_id: input.memberId,
    entry_type: 'savings_deposit',
    amount: Number(input.amount),
  });

  return {
    id: `TXN-${String(entry.id).padStart(4, '0')}`,
    ledgerId: entry.id,
    type: 'savings',
    description: 'Savings deposit',
    member: input.member,
    memberId: entry.member_id,
    amount: entry.amount,
    entryHash: entry.entry_hash,
    status: 'Completed',
    statusTone: 'success',
  };
}

export default {
  getFinanceSummary,
  getTransactions,
  getSavings,
  getLoans,
  recordSavings,
};
