import Config from '../constants/Config';
import {
  financeSummary,
  transactions,
  loanSummary,
  activeLoans,
} from '../data/mockFinanceData';
import { members } from '../data/mockMembers';

/**
 * Read side of the SHG finance module: dashboard totals, the transaction
 * ledger, savings breakdown and the loan book.
 *
 * Every function is a seam -- swap the body for a fetch against
 * Config.API_BASE_URL and no screen needs to change.
 */

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const LIST_DELAY = Math.round(Config.MOCK_DELAY / 2);

export async function getFinanceSummary() {
  await wait(LIST_DELAY);
  return { ...financeSummary };
}

export async function getTransactions() {
  await wait(LIST_DELAY);
  return transactions.map((entry) => ({ ...entry }));
}

/** Savings totals plus the per-member breakdown, largest balance first. */
export async function getSavings() {
  await wait(LIST_DELAY);

  const byMember = members
    .map(({ id, name, village, savings }) => ({ id, name, village, savings }))
    .sort((a, b) => b.savings - a.savings);

  return {
    totalSavings: financeSummary.totalSavings,
    savingsThisMonth: financeSummary.savingsThisMonth,
    byMember,
    recentDeposits: transactions
      .filter((entry) => entry.type === 'savings')
      .map((entry) => ({ ...entry })),
  };
}

export async function getLoans() {
  await wait(LIST_DELAY);
  return {
    summary: { ...loanSummary },
    loans: activeLoans.map((loan) => ({ ...loan })),
  };
}

/**
 * Records a savings deposit. Session-scoped like addMember -- nothing is
 * written anywhere permanent in this phase.
 */
export async function recordSavings(input) {
  await wait(Config.MOCK_DELAY);
  return {
    id: `TXN-${Date.now()}`,
    type: 'savings',
    description: 'Savings Deposit',
    member: input.member,
    amount: Number(input.amount),
    date: input.date,
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
