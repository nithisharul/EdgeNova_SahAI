/**
 * Dashboard mock data.
 *
 * Everything the Home screen renders lives here so the screen itself stays
 * layout-only. When the FastAPI endpoints in Config.js go live these shapes
 * are what the services layer should return, which keeps the swap mechanical.
 *
 * Numbers are stored raw (48500, not "Rs 48,500") -- formatting belongs to
 * utils/currency.js so it stays consistent everywhere.
 */

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
  cropMatch: 94,
  recommendedCrop: 'Rice',
  totalSavings: 48500,
  activeLoans: 18000,
  memberCount: 12,
  savingsDelta: '+8.2%',
  season: 'Kharif 2026',
};

/** Ledger integrity strip. Mock status only -- no hashing logic yet. */
export const ledgerStatus = {
  label: 'Verified',
  tone: 'success',
  title: 'SHG Ledger',
  message: 'No tampering detected across 46 entries.',
  lastCheckedLabel: 'Checked today, 6:40 AM',
};

/**
 * Model-backed suggestions shown under AI Insights.
 * Shapes follow RecommendationCard's props so the screen just spreads them.
 */
export const homeInsights = [
  {
    id: 'crop-match',
    title: 'Best Crop Match',
    headline: 'Rice',
    subheadline: '94% suitability',
    icon: 'leaf',
    tone: 'success',
    badge: 'Agriculture',
    badgeTone: 'success',
    route: '/crop-recommendation',
    message:
      'Your soil nitrogen and this season’s rainfall profile strongly match rice cultivation.',
  },
  {
    id: 'fertilizer',
    title: 'Fertilizer Recommendation',
    headline: 'NPK 20-20-20',
    subheadline: 'Balanced dose',
    icon: 'flask',
    tone: 'warning',
    badge: 'Agriculture',
    badgeTone: 'warning',
    route: '/fertilizer-advice',
    message:
      'Potassium is running low for the current crop stage. A balanced NPK dose can lift yield.',
  },
  {
    id: 'loan-risk',
    title: 'Loan Risk Outlook',
    headline: 'Low risk',
    subheadline: 'Score 78 / 100',
    icon: 'shield-checkmark',
    tone: 'info',
    badge: 'Finance',
    badgeTone: 'info',
    route: '/loan-risk',
    message:
      'Steady repayments across the group keep this month’s lending capacity comfortable.',
  },
];

/**
 * Latest ledger movements. Home shows a short tail; Finance owns the rest.
 * `type` drives TransactionCard's icon, sign and default label.
 */
export const recentActivities = [
  {
    id: 'txn-01',
    type: 'savings',
    description: 'Savings Deposit',
    member: 'Asha Devi',
    amount: 2000,
    date: 'Today',
  },
  {
    id: 'txn-02',
    type: 'disbursement',
    description: 'Loan Disbursement',
    member: 'Sunita Devi',
    amount: 5000,
    date: 'Yesterday',
  },
  {
    id: 'txn-03',
    type: 'repayment',
    description: 'Loan Repayment',
    member: 'Asha Devi',
    amount: 1500,
    date: '25 Aug',
  },
];

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
