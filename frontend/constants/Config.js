import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Runtime configuration.
 *
 * Every backend-supported screen reads the live FastAPI backend. There is no
 * mock-data switch: a screen either shows what the server returned or shows
 * the error, never a fabricated success. The one exception is My Land, which
 * has no backend at all and says so on its face.
 *
 * WHERE THE BACKEND LIVES
 * -----------------------
 * The API runs on port 5000 (`python dev.py`, or
 * `uvicorn backend.app:app --reload --port 5000`).
 *
 * Resolved in three steps, first match wins:
 *
 *   1. EXPO_PUBLIC_API_BASE_URL   an explicit override, for a phone or a
 *                                 backend on another machine
 *   2. the address Expo served    on web, the browser's own host; on native,
 *      this bundle from           the LAN IP the bundle arrived on, which in
 *                                 development is the same machine as the API
 *   3. localhost                  last resort
 *
 * Step 2 matters because "localhost" is resolved by whatever device runs the
 * JavaScript. In a browser on the dev machine that is correct; on a PHONE
 * localhost is the phone, and the request would never leave it.
 *
 * NO DEVELOPER'S IP IS COMMITTED HERE. To point a physical phone at your
 * machine, set the variable in frontend/.env.local (gitignored) or inline:
 *
 *   EXPO_PUBLIC_API_BASE_URL=http://192.168.1.7:5000 npm start
 */

const API_PORT = 5000;

/**
 * Expo inlines EXPO_PUBLIC_* at build time, so this is a literal lookup rather
 * than a dynamic one -- process.env[name] would not be substituted.
 */
const ENV_API_BASE_URL =
  typeof process !== 'undefined' ? process.env.EXPO_PUBLIC_API_BASE_URL : undefined;

/** The host:port Expo served this bundle from, e.g. "192.168.1.7:8081". */
function expoHost() {
  const candidate =
    Constants.expoConfig?.hostUri ||
    Constants.expoGoConfig?.debuggerHost ||
    Constants.manifest2?.extra?.expoGo?.debuggerHost ||
    '';
  return String(candidate).split('/').pop();
}

function resolveApiBase() {
  // 1. Explicit override always wins.
  if (ENV_API_BASE_URL) return String(ENV_API_BASE_URL).replace(/\/+$/, '');

  // 2a. Web dev and web export: the browser and the backend share a machine.
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.location?.hostname) {
      return `http://${window.location.hostname}:${API_PORT}`;
    }
    return `http://localhost:${API_PORT}`;
  }

  // 2b. Native: borrow the LAN IP the bundle arrived on.
  const host = expoHost().split(':')[0];
  if (host && host !== 'localhost' && host !== '127.0.0.1') {
    return `http://${host}:${API_PORT}`;
  }

  // 3. Correct for an emulator sharing the host's loopback; on a physical
  // phone it fails fast and visibly rather than silently.
  return `http://localhost:${API_PORT}`;
}

const Config = {
  APP_NAME: 'SahAI',
  APP_TAGLINE: 'From Field to Fund',

  API_BASE_URL: resolveApiBase(),

  /**
   * Abandon a request after this long rather than spinning forever.
   *
   * 20s rather than a snappier 5s because /crop-advisory may call out to
   * Open-Meteo before it can answer; the backend's own weather timeout is 6s
   * per upstream call and it makes two.
   */
  REQUEST_TIMEOUT: 20000,

  /** Real FastAPI paths, verified against backend/routes/ on this branch. */
  ENDPOINTS: {
    register: '/auth/register',
    login: '/auth/login',
    me: '/auth/me',

    weather: '/weather',
    predictCrop: '/predict-crop',
    cropAdvisory: '/crop-advisory',
    fertilizerOptions: '/fertilizer/options',
    recommendFertilizer: '/recommend-fertilizer',

    requestLoan: '/request-loan',

    ledgerAdd: '/ledger/add',
    ledgerVerify: '/ledger/verify',
    ledgerAll: '/ledger/all',

    memberPortfolio: (memberId) => `/member/${encodeURIComponent(memberId)}/portfolio`,
    groupSummary: '/group/summary',
  },
};

export default Config;
