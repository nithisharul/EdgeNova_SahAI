import Config from '../constants/Config';
import { apiGet } from './apiClient';
import { adaptEntry } from './ledgerService';

/**
 * My Portfolio -- one member's position, derived from the ledger.
 *
 * The backend keeps no savings or loans table: every figure below is summed
 * from hash-chained ledger rows. That is why a portfolio and the ledger can
 * never disagree, and why there is nothing here to "sync".
 *
 * WHAT THE BACKEND DOES NOT RETURN
 * --------------------------------
 * No name, phone, village, join date, loan purpose, term or repayment status.
 * Those fields existed only in the old prototype fixtures. They are not
 * invented here -- a screen that wants them has to do without.
 */
export async function getPortfolio(memberId) {
  const raw = await apiGet(Config.ENDPOINTS.memberPortfolio(memberId));

  const history = (raw.history || []).map(adaptEntry).sort((a, b) => b.timestamp - a.timestamp);

  return {
    memberId: raw.member_id,
    totalSavings: raw.total_savings ?? 0,
    outstandingLoan: raw.total_loans_outstanding ?? 0,
    netPosition: raw.net_position ?? 0,
    history,
    depositCount: history.filter((e) => e.entryType === 'savings_deposit').length,
  };
}

export default { getPortfolio };
