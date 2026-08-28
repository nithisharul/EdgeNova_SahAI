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
 * The API runs on port 5000 (`uvicorn backend.app:app --reload --port 5000`).
 *
 * "localhost" is resolved by whatever device the JavaScript runs on, so it only
 * works in a browser on the same machine as the server. On a phone, localhost
 * is the PHONE. resolveApiBase() therefore reuses the LAN address Expo already
 * dialled to load the bundle -- during development that is the same machine the
 * backend is on. Set API_HOST_OVERRIDE when that guess is wrong (a tunnel, or a
 * backend running on a different box).
 */

const API_PORT = 5000;

/** Set to e.g. '192.168.1.7' to force a host. null = detect automatically. */
const API_HOST_OVERRIDE = null;

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
  if (API_HOST_OVERRIDE) return `http://${API_HOST_OVERRIDE}:${API_PORT}`;

  // Web dev + web export: the browser and the backend share a machine.
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.location?.hostname) {
      return `http://${window.location.hostname}:${API_PORT}`;
    }
    return `http://localhost:${API_PORT}`;
  }

  // Native: borrow the LAN IP the bundle arrived on.
  const host = expoHost().split(':')[0];
  if (host && host !== 'localhost' && host !== '127.0.0.1') {
    return `http://${host}:${API_PORT}`;
  }

  // Last resort. Correct for an emulator sharing the host's loopback; on a
  // physical phone it fails fast and visibly rather than silently.
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
