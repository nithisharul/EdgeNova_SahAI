/**
 * Home quick actions.
 *
 * Navigation configuration, not data: labels and routes describing where the
 * buttons go. Nothing here is a value that could disagree with the backend,
 * which is why it stayed a constant when the rest of Home moved onto the API.
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

export default { quickActions };
