/**
 * Runtime configuration.
 *
 * One place for the backend address and the credentials the app signs in
 * with. Screens never read any of this -- only the service layer does.
 */

/**
 * Where FastAPI is listening.
 *
 * ON A PHYSICAL PHONE this must be the laptop's LAN address. `localhost` on
 * the phone means the phone itself, so the request never leaves the handset.
 * Start the backend with `--host 0.0.0.0`, put the laptop's IPv4 here, and
 * keep both devices on the same Wi-Fi:
 *
 *     API_BASE_URL: 'http://192.168.1.24:8000'
 *
 * On Windows prefer 127.0.0.1 over `localhost` for web and emulator runs: the
 * name resolves to IPv6 ::1 first and every request waits ~200ms for that to
 * fail before retrying IPv4.
 */
const API_BASE_URL = 'http://127.0.0.1:8000';

const Config = {
  APP_NAME: 'SahAI',
  APP_TAGLINE: 'From Field to Fund',

  /**
   * The self-help group this install belongs to. A label for the header, not
   * a record in the database -- the backend stores members and ledger
   * entries, not group metadata.
   */
  GROUP_NAME: 'Pragati Mahila SHG',

  API_BASE_URL,

  /**
   * Normal operation is REAL backend data, so this is false.
   *
   * It is kept as a development escape hatch, not a fallback: no service
   * silently reverts to fixtures when a request fails, because an integration
   * bug that renders as a working screen is worse than a visible error.
   */
  USE_MOCK_DATA: false,

  /** Give up on a request after this long so a screen cannot hang forever. */
  REQUEST_TIMEOUT: 15000,

  /**
   * The account the app authenticates as.
   *
   * The backend gates member, transaction, ledger and loan-risk data behind a
   * JWT, and this build has no sign-in screen, so the service layer logs in
   * once on demand and reuses the token until it expires.
   *
   * These are local demo credentials for a database that contains no real
   * people, created by backend/seed_demo.py. Replace this with a real sign-in
   * flow before the app ever points at genuine member data.
   */
  DEMO_ACCOUNT: {
    memberId: 'TRE-001',
    password: 'sahai-demo-2026',
  },

  /** Paths as the backend actually serves them (see backend/app.py). */
  ENDPOINTS: {
    health: '/health',
    login: '/auth/login',

    cropRecommendation: '/predict-crop',
    cropAdvisory: '/crop-advisory',
    fertilizerRecommendation: '/recommend-fertilizer',
    fertilizerOptions: '/fertilizer/options',
    loanRisk: '/request-loan',

    members: '/api/members',
    financeSummary: '/api/finance/summary',
    transactions: '/api/transactions',
    loans: '/api/loans',

    ledgerAll: '/ledger/all',
    ledgerVerify: '/ledger/verify',
    ledgerAdd: '/ledger/add',
  },
};

export default Config;
