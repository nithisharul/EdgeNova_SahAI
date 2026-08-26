/**
 * Crop health demo data.
 *
 * IMPORTANT: nothing here comes from image analysis. There is no satellite
 * feed, no disease detection and no computer vision anywhere in SahAI. These
 * are the kind of figures a field officer would write into a monitoring
 * register, shaped the way a backend endpoint would eventually return them.
 * The screen wording says the same thing so a demo cannot be misread.
 *
 * Plot names match data/mockLandData.js, and the crop matches the crop
 * recommendation in services/cropService.js.
 */

import { MOCK_RECOMMENDATION as CROP } from '../services/cropService';

/**
 * Share of the monitored area in each band, so the three add up to 100.
 * `overallScore` is the field health index, not an average of the plot
 * scores below -- the two answer different questions.
 */
export const fieldHealth = {
  overallScore: 87,
  healthyPercentage: 82,
  warningPercentage: 13,
  criticalPercentage: 5,
  monitoredAcres: 4.8,
  lastSurveyed: '2026-08-26T07:15:00',
};

/** The three plots, in the same order as the land record. */
export const plotHealth = [
  {
    id: 'north-field',
    plot: 'North Field',
    crop: CROP.crop,
    healthScore: 91,
    status: 'Healthy',
    tone: 'success',
    moisture: 'Optimal',
    nutrients: 'Good',
  },
  {
    id: 'south-field',
    plot: 'South Field',
    crop: CROP.crop,
    healthScore: 74,
    status: 'Needs Attention',
    tone: 'warning',
    moisture: 'Slightly Low',
    nutrients: 'Below Target',
  },
  {
    id: 'nursery',
    plot: 'Nursery',
    crop: 'Seedlings',
    healthScore: 88,
    status: 'Healthy',
    tone: 'success',
    moisture: 'Optimal',
    nutrients: 'Good',
  },
];

/**
 * Areas flagged in the last survey. `route` is where the recommended action
 * actually leads, so the button on the card is never decorative.
 */
export const healthIssues = [
  {
    id: 'issue-nitrogen',
    plot: 'South Field',
    title: 'Possible nitrogen deficiency',
    severity: 'Medium',
    tone: 'warning',
    detail:
      'Leaf colour was reported as pale across roughly 0.6 acres at the last survey.',
    action: 'Review fertilizer recommendation',
    actionLabel: 'View Fertilizer Advice',
    route: '/fertilizer-advice',
  },
  {
    id: 'issue-moisture',
    plot: 'South Field',
    title: 'Moisture below the target band',
    severity: 'Low',
    tone: 'info',
    detail: 'Irrigation was last recorded four days ago for this section.',
    action: 'Check the crop recommendation for this soil',
    actionLabel: 'View Crop Recommendation',
    route: '/crop-recommendation',
  },
];

export default { fieldHealth, plotHealth, healthIssues };
