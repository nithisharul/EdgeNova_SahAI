import Config from '../constants/Config';
import { ApiError, apiGet, apiPost, setTokenProvider } from './apiClient';

/**
 * Session state: who is signed in, and the token that proves it.
 *
 * WHERE THE SESSION LIVES
 * -----------------------
 * In a module-level object, mirrored to localStorage where one exists (Expo
 * Web). On a phone the session therefore lasts until the app is closed, which
 * is honest for a prototype and avoids adding a storage dependency for it.
 * Swapping in expo-secure-store later means changing readStored/writeStored
 * and nothing else.
 *
 * The token is never handed to a screen. apiClient pulls it through the
 * provider registered at the bottom of this file, so a screen physically
 * cannot attach the wrong one or log it.
 */

const STORAGE_KEY = 'sahai.session';

/** { token, memberId, role, name } or null when signed out. */
let session = null;

const listeners = new Set();

function hasWebStorage() {
  try {
    return typeof window !== 'undefined' && !!window.localStorage;
  } catch {
    // Some privacy modes throw on property access rather than on use.
    return false;
  }
}

function readStored() {
  if (!hasWebStorage()) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeStored(value) {
  if (!hasWebStorage()) return;
  try {
    if (value) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // A full or blocked store must not break signing in.
  }
}

function notify() {
  listeners.forEach((listener) => {
    try {
      listener(session);
    } catch {
      // One bad subscriber must not stop the others being told.
    }
  });
}

function setSession(next) {
  session = next;
  writeStored(next);
  notify();
}

/** Subscribe to sign-in/sign-out. Returns an unsubscribe function. */
export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSession() {
  return session;
}

export function getToken() {
  return session?.token || null;
}

export function getRole() {
  return session?.role || null;
}

export function isSignedIn() {
  return !!session?.token;
}

/** admin counts as staff: the backend's STAFF_ROLES includes it. */
export function isTreasurer() {
  return ['treasurer', 'admin'].includes(session?.role);
}

/**
 * Restore a session saved by a previous run.
 *
 * The stored token is NOT trusted on sight -- it is checked against
 * GET /auth/me, because a token can expire while the app is closed and a
 * cached role would otherwise unlock treasurer screens that then 403.
 */
export async function restoreSession() {
  const stored = readStored();
  if (!stored?.token) {
    setSession(null);
    return null;
  }

  // Provisional, so the /auth/me call below can find the token.
  session = stored;

  try {
    const me = await apiGet(Config.ENDPOINTS.me);
    const confirmed = {
      ...stored,
      memberId: me.member_id ?? stored.memberId,
      role: me.role ?? stored.role,
    };
    setSession(confirmed);
    return confirmed;
  } catch (error) {
    if (error instanceof ApiError && ['auth', 'forbidden'].includes(error.kind)) {
      setSession(null);
      return null;
    }
    // Server down or offline: keep the session rather than signing the user
    // out over a network blip. The next real call will 401 if it truly expired.
    notify();
    return session;
  }
}

function adopt(response, fallbackName) {
  const next = {
    token: response.token,
    memberId: response.member_id,
    role: response.role,
    name: fallbackName || response.member_id,
  };
  setSession(next);
  return next;
}

/** POST /auth/login -- member_id IS the username; there is no separate field. */
export async function login({ memberId, password }) {
  const response = await apiPost(
    Config.ENDPOINTS.login,
    { member_id: String(memberId).trim(), password },
    { auth: false }
  );
  return adopt(response);
}

/** Adopt and validate a Keycloak access token obtained through OIDC. */
export async function loginWithAccessToken(token) {
  session = { token };
  try {
    const me = await apiGet(Config.ENDPOINTS.me);
    return adopt({ token, member_id: me.member_id, role: me.role }, me.name || me.member_id);
  } catch (error) {
    setSession(null);
    throw error;
  }
}

/**
 * POST /auth/register.
 *
 * setup_key is sent ONLY for role="treasurer" -- it is the shared secret that
 * stops any visitor registering as a treasurer and reading the whole group's
 * finances. It is not a password, an API key, or anything a member ever needs.
 */
export async function register({ memberId, name, password, role, setupKey }) {
  const body = {
    member_id: String(memberId).trim(),
    name: String(name).trim(),
    password,
    role,
  };
  if (role === 'treasurer') body.setup_key = setupKey;

  const response = await apiPost(Config.ENDPOINTS.register, body, { auth: false });
  return adopt(response, body.name);
}

export function logout() {
  setSession(null);
}

// apiClient asks for the token on every authenticated request.
setTokenProvider(() => session?.token || null);

export default {
  login,
  loginWithAccessToken,
  register,
  logout,
  restoreSession,
  getSession,
  getToken,
  getRole,
  isSignedIn,
  isTreasurer,
  subscribe,
};
