import Config from '../constants/Config';
import { apiGet } from './apiClient';

/**
 * Group Summary -- the treasurer's view of the whole SHG.
 *
 * Every figure is summed from the ledger, so there is nothing to reconcile
 * against a separate accounts table: there isn't one.
 *
 * availableBalance is DERIVED, not fetched -- corpus minus outstanding loans.
 * That is arithmetic on two real backend numbers, which is fair; the old
 * fixtures' savingsThisMonth and "+8.2%" growth delta were not derivable from
 * anything the backend returns and have been dropped rather than faked.
 *
 * members[] IS NOT A ROSTER
 * -------------------------
 * The backend builds it from DISTINCT member_id in the ledger, so a registered
 * member with no recorded transaction yet will not appear. That is a real
 * limitation of deriving everything from the ledger, and the screen says so
 * rather than presenting the list as a complete membership register.
 */
export async function getGroupSummary() {
  const raw = await apiGet(Config.ENDPOINTS.groupSummary);

  const totalCorpus = raw.total_corpus ?? 0;
  const outstanding = raw.total_outstanding_loans ?? 0;

  return {
    memberCount: raw.member_count ?? 0,
    totalCorpus,
    outstandingLoans: outstanding,
    availableBalance: totalCorpus - outstanding,
    members: raw.members || [],
  };
}

export default { getGroupSummary };
