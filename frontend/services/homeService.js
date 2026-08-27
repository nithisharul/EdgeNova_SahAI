import Config from '../constants/Config';
import { getJson } from './apiClient';
import { getFinanceSummary, getTransactions, getLoans } from './financeService';
import { verifyLedger } from './ledgerService';
import { getLatestCrop } from './sessionState';

/**
 * Everything the Home dashboard shows, assembled from the same services the
 * rest of the app uses.
 *
 * Home deliberately owns no data of its own. If Finance says the corpus is
 * one number, Home shows that number, because both read the same endpoint --
 * there is no second copy to drift.
 *
 * Four requests go out in parallel rather than one aggregate endpoint: each
 * response is already needed by another screen, so a Home-only endpoint would
 * mean two code paths deriving the same totals.
 */

/** The signed-in account, for the greeting. */
async function getCurrentUser() {
  try {
    const me = await getJson('/api/me');
    return { memberId: me.member_id, name: me.name, role: me.role };
  } catch {
    return { memberId: null, name: null, role: null };
  }
}

export async function getHomeDashboard() {
  const [summary, transactions, loans, integrity, me] = await Promise.all([
    getFinanceSummary(),
    getTransactions(),
    getLoans(),
    // A failed integrity check is information, not a reason to fail the
    // whole dashboard, so it is caught here rather than rejecting.
    verifyLedger().catch(() => null),
    getCurrentUser(),
  ]);

  const crop = getLatestCrop();

  return {
    user: {
      // The account's own id; the group name is configuration, not a record
      // in the database.
      memberId: me.memberId,
      name: me.name,
      role: me.role,
      groupName: Config.GROUP_NAME,
    },

    summary: {
      totalSavings: summary.totalSavings,
      availableBalance: summary.availableBalance,
      activeLoans: summary.outstandingLoans,
      activeLoanCount: loans.summary.activeCount,
      memberCount: summary.activeMembers,
      savingsThisMonth: summary.savingsThisMonth,
    },

    /**
     * The latest REAL crop recommendation, or null before one has been run.
     * Home renders a prompt in that case rather than a stale crop.
     */
    crop: crop
      ? { name: crop.crop, confidence: crop.confidence, at: crop.at }
      : null,

    ledger: integrity
      ? {
          verified: integrity.verified,
          totalRecords: integrity.totalRecords,
          checkedRecords: integrity.checkedRecords,
          tamperedRecordId: integrity.tamperedRecordId,
        }
      : null,

    recentActivity: transactions.slice(0, 4),
  };
}

export default { getHomeDashboard };
