/**
 * Performance report data.
 *
 * Nothing is retyped here. Every figure is imported from the module that
 * owns it, so the report is a view over the same numbers the rest of the app
 * shows and cannot drift away from them.
 *
 * Sources:
 *   crop         -> services/cropService.js
 *   fertilizer   -> services/fertilizerService.js
 *   loan risk    -> services/loanService.js
 *   field health -> data/mockCropHealthData.js
 *   land         -> data/mockLandData.js
 *   finance      -> data/mockFinanceData.js
 *   ledger       -> data/mockLedgerData.js
 */

import { MOCK_RECOMMENDATION as CROP } from '../services/cropService';
import { MOCK_RECOMMENDATION as FERTILIZER } from '../services/fertilizerService';
import { DEFAULT_ASSESSMENT as LOAN } from '../services/loanService';
import { fieldHealth } from './mockCropHealthData';
import { farmProfile } from './mockLandData';
import { financeSummary, loanSummary } from './mockFinanceData';
import { ledgerSummary, verifiedResult } from './mockLedgerData';
import { formatCurrency } from '../utils/currency';

export const reportPeriod = {
  label: 'August 2026',
  season: farmProfile.season,
  caption: 'Field and fund side by side for the current month.',
};

/** The field half of the report. */
export const fieldReport = {
  cropMatch: CROP.confidence,
  recommendedCrop: CROP.crop,
  fertilizer: FERTILIZER.fertilizer,
  fertilizerQuantity: `${FERTILIZER.quantity} ${FERTILIZER.quantityUnit}`,
  estimatedSaving: FERTILIZER.estimatedSaving,
  farmHealth: fieldHealth.overallScore,
  monitoredAcres: fieldHealth.monitoredAcres,
};

/** The fund half of the report. */
export const fundReport = {
  totalSavings: financeSummary.totalSavings,
  savingsThisMonth: financeSummary.savingsThisMonth,
  availableBalance: financeSummary.availableBalance,
  outstandingLoans: financeSummary.outstandingLoans,
  activeLoanCount: loanSummary.activeCount,
  activeMembers: financeSummary.activeMembers,
  repaymentHealth: LOAN.repaymentProbability,
  ledgerVerified: verifiedResult.verified,
  ledgerChecked: verifiedResult.checkedRecords,
  ledgerTotal: ledgerSummary.totalRecords,
};

/**
 * Monthly deposits. The last month is the group's savings-this-month figure,
 * so the trend always ends on the number the finance screens show.
 */
export const savingsTrend = [
  { id: 'may', month: 'May', amount: 4200 },
  { id: 'jun', month: 'Jun', amount: 5400 },
  { id: 'jul', month: 'Jul', amount: 6800 },
  { id: 'aug', month: 'Aug', amount: financeSummary.savingsThisMonth },
];

/** Plain-language takeaways, each pointing at the screen that owns it. */
export const reportHighlights = [
  {
    id: 'crop',
    text: `${CROP.crop} remains the strongest match for this soil at ${CROP.confidence}% suitability.`,
    route: '/crop-recommendation',
  },
  {
    id: 'fertilizer',
    text: `Following the ${FERTILIZER.fertilizer} plan carries an estimated saving of ${formatCurrency(FERTILIZER.estimatedSaving)}.`,
    route: '/fertilizer-advice',
  },
  {
    id: 'ledger',
    text: `All ${ledgerSummary.totalRecords} ledger records passed the last integrity check.`,
    route: '/ledger',
  },
];

export default {
  reportPeriod,
  fieldReport,
  fundReport,
  savingsTrend,
  reportHighlights,
};
