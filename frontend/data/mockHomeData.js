/**
 * Dashboard mock data.
 *
 * Every figure the Home screen shows is IMPORTED from the module that owns
 * it rather than retyped here, so the dashboard can never contradict the
 * screen a tile links to. Same rule as data/mockAssistantData.js.
 *
 * Sources:
 *   crop        -> services/cropService.js
 *   fertilizer  -> services/fertilizerService.js
 *   loan risk   -> services/loanService.js
 *   finance     -> data/mockFinanceData.js
 *   ledger      -> data/mockLedgerData.js
 *
 * Numbers stay raw (48500, not "Rs 48,500") -- formatting belongs to
 * utils/currency.js so it stays consistent everywhere.
 */

import { MOCK_RECOMMENDATION as CROP } from '../services/cropService';
import { MOCK_RECOMMENDATION as FERTILIZER } from '../services/fertilizerService';
import { DEFAULT_ASSESSMENT as LOAN } from '../services/loanService';
import { financeSummary, loanSummary, transactions } from './mockFinanceData';
import { ledgerSummary, verifiedResult } from './mockLedgerData';
import { formatRelativeDateTime } from '../utils/datetime';

/** The signed-in SHG member. Placeholder identity, not a real person. */
export const homeUser = {
  name: 'Meera',
  groupName: 'Annapurna SHG',
  village: 'Kondapur, Telangana',
  role: 'Group member',
};

/** Headline numbers for the summary tiles: two field, two fund. */
export const homeSummary = {
  farmRecommendationStatus: 'Ready',
  cropMatch: CROP.confidence,
  recommendedCrop: CROP.crop,
  totalSavings: financeSummary.totalSavings,
  activeLoans: financeSummary.outstandingLoans,
  activeLoanCount: loanSummary.activeCount,
  memberCount: financeSummary.activeMembers,
  savingsDelta: financeSummary.savingsDelta,
  season: 'Kharif 2026',
};

/** Ledger integrity strip. The verdict comes from the ledger data, not here. */
export const ledgerStatus = {
  label: verifiedResult.verified ? 'Verified' : 'Tamper detected',
  tone: verifiedResult.verified ? 'success' : 'error',
  title: 'SHG Ledger',
  message: verifiedResult.verified
    ? `No tampering detected across ${ledgerSummary.totalRecords} entries.`
    : 'A record failed the integrity check.',
  lastCheckedLabel: `Last checked ${formatRelativeDateTime(verifiedResult.verifiedAt)}`,
};

/**
 * Model-backed suggestions shown under AI Insights.
 * Shapes follow RecommendationCard's props so the screen just spreads them.
 * Each one quotes the same figures as the screen it opens.
 */
export const homeInsights = [
  {
    id: 'crop-match',
    title: 'Best Crop Match',
    headline: CROP.crop,
    subheadline: `${CROP.confidence}% suitability`,
    icon: 'leaf',
    tone: 'success',
    badge: 'Agriculture',
    badgeTone: 'accent',
    route: '/crop-recommendation',
    message: CROP.message,
  },
  {
    id: 'fertilizer',
    title: 'Fertilizer Advice',
    headline: FERTILIZER.fertilizer,
    subheadline: `${FERTILIZER.quantity} ${FERTILIZER.quantityUnit}`,
    icon: 'flask',
    tone: 'success',
    badge: 'Agriculture',
    badgeTone: 'accent',
    route: '/fertilizer-advice',
    message: FERTILIZER.message,
  },
  {
    id: 'loan-risk',
    title: 'Loan Risk Outlook',
    headline: `${LOAN.riskLevel} risk`,
    subheadline: `${LOAN.repaymentProbability}% repayment probability`,
    icon: 'shield-checkmark',
    tone: 'success',
    badge: 'Finance',
    badgeTone: 'info',
    route: '/loan-risk',
    message: LOAN.recommendation,
  },
];

/**
 * Latest ledger movements. Home shows a short tail of the same list Finance
 * owns, so the two screens can never disagree about a transaction.
 */
export const recentActivities = transactions.slice(0, 3);

/**
 * Quick Actions grid. Two field shortcuts, two fund shortcuts, so the split
 * that defines SahAI is visible without scrolling far.
 */
export const quickActions = [
  {
    id: 'crop',
    label: 'Recommend Crop',
    caption: 'Soil → best crop',
    icon: 'leaf-outline',
    tone: 'field',
    route: '/crop-recommendation',
  },
  {
    id: 'fertilizer',
    label: 'Fertilizer Advice',
    caption: 'Balance your NPK',
    icon: 'flask-outline',
    tone: 'field',
    route: '/fertilizer-advice',
  },
  {
    id: 'finance',
    label: 'SHG Finance',
    caption: 'Savings & loans',
    icon: 'wallet-outline',
    tone: 'fund',
    route: '/finance',
  },
  {
    id: 'loan-risk',
    label: 'Check Loan Risk',
    caption: 'Score a request',
    icon: 'speedometer-outline',
    tone: 'fund',
    route: '/loan-risk',
  },
];

export default {
  homeUser,
  homeSummary,
  ledgerStatus,
  homeInsights,
  recentActivities,
  quickActions,
};
