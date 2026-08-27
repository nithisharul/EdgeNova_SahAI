import { getFinanceSummary, getLoans, getTransactions } from './financeService';
import { verifyLedger } from './ledgerService';
import { getLatestCrop, getLatestFertilizer } from './sessionState';

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/** Savings deposits totalled per calendar month, oldest first. */
function monthlyDeposits(transactions, limit = 6) {
  const buckets = new Map();

  transactions
    .filter((txn) => txn.type === 'savings')
    .forEach((txn) => {
      const when = new Date(txn.timestamp * 1000);
      const key = `${when.getFullYear()}-${String(when.getMonth()).padStart(2, '0')}`;
      const bucket = buckets.get(key) || {
        id: key,
        month: `${MONTHS[when.getMonth()]} ${String(when.getFullYear()).slice(2)}`,
        amount: 0,
      };
      bucket.amount += txn.amount;
      buckets.set(key, bucket);
    });

  return [...buckets.values()]
    .sort((a, b) => a.id.localeCompare(b.id))
    .slice(-limit)
    .map((bucket) => ({ ...bucket, amount: Math.round(bucket.amount) }));
}

/**
 * Performance report.
 *
 * The fund half is fully derivable from the ledger and is reported in full.
 * The field half is not: the backend stores no farm-health survey and no land
 * register, so those figures are absent rather than estimated, and the screen
 * omits the cards it has no source for.
 *
 * Repayment health is the share of disbursed principal already repaid --
 * arithmetic on real ledger rows, not a score.
 */
export async function getPerformanceReport() {
  const [summary, loans, transactions, integrity] = await Promise.all([
    getFinanceSummary(),
    getLoans(),
    getTransactions(),
    verifyLedger().catch(() => null),
  ]);

  const principal = loans.loans.reduce((sum, loan) => sum + loan.principal, 0);
  const repaid = loans.loans.reduce((sum, loan) => sum + loan.repaid, 0);

  const crop = getLatestCrop();
  const fertilizer = getLatestFertilizer();

  return {
    field: {
      // Present only when a real prediction has been run this session.
      crop: crop ? { name: crop.crop, confidence: crop.confidence } : null,
      fertilizer: fertilizer ? { grade: fertilizer.fertilizer } : null,
      /**
       * No farm-health survey and no land register exist in the backend, so
       * there is no acreage or health percentage to report. The screen shows
       * nothing here rather than a number nobody measured.
       */
      farmHealth: null,
      monitoredAcres: null,
    },

    /**
     * Deposits totalled per calendar month, oldest first, from the real
     * ledger rows. Not a forecast and not smoothed -- just what was recorded.
     */
    savingsTrend: monthlyDeposits(transactions),

    fund: {
      totalSavings: summary.totalSavings,
      availableBalance: summary.availableBalance,
      outstandingLoans: summary.outstandingLoans,
      activeMembers: summary.activeMembers,
      activeLoanCount: loans.summary.activeCount,
      savingsThisMonth: summary.savingsThisMonth,
      repaymentHealth: principal > 0 ? Math.round((repaid / principal) * 100) : 0,
      ledgerVerified: integrity ? integrity.verified : null,
      ledgerChecked: integrity ? integrity.checkedRecords : 0,
      ledgerTotal: integrity ? integrity.totalRecords : 0,
    },
  };
}

export default { getPerformanceReport };
