/**
 * Runtime configuration.
 *
 * While the backend is being built the app runs on mock data from the
 * services layer. Flip USE_MOCK_DATA to false once the FastAPI endpoints
 * in API_BASE_URL are live -- screens should not need any changes.
 */

const Config = {
  APP_NAME: 'SahAI',
  APP_TAGLINE: 'From Field to Fund',

  API_BASE_URL: 'http://localhost:8000',
  USE_MOCK_DATA: true,

  /** Artificial delay (ms) so mock predictions still feel like real work. */
  MOCK_DELAY: 1200,

  ENDPOINTS: {
    cropRecommendation: '/predict/crop',
    fertilizerRecommendation: '/predict/fertilizer',
    loanRisk: '/predict/loan-risk',
    ledgerVerify: '/ledger/verify',
  },
};

export default Config;
