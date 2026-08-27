import Config from '../constants/Config';

/**
 * The one place the app talks to FastAPI.
 *
 * Every service goes through get/post here so timeouts, authentication and
 * error handling happen once instead of seven times. Errors thrown from this
 * module already carry a message that is safe to put in front of a farmer:
 * no status codes, no ECONNREFUSED, no tracebacks.
 *
 * Authentication is handled here too. The backend protects most data behind a
 * JWT and this build has no sign-in screen, so the client logs in on demand
 * with the account in Config.DEMO_ACCOUNT, caches the token, and retries once
 * when the backend says it has expired.
 */

/** Error with a user-safe `message`; `detail` is for logs, never for a screen. */
export class ApiError extends Error {
  constructor(message, { status = null, detail = null, kind = 'error' } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
    this.kind = kind; // network | timeout | auth | unavailable | invalid | notfound | conflict | error
  }
}

const UNREACHABLE =
  'Unable to reach the SahAI service. Check that the backend is running and try again.';
const TIMED_OUT = 'The service took too long to respond. Please try again.';
const FAILED = 'Something went wrong. Please try again.';

// ---------------------------------------------------------------- token

let token = null;
let inFlightLogin = null;

/** Drop the cached token so the next call signs in again. */
export function clearSession() {
  token = null;
  inFlightLogin = null;
}

/**
 * Return a valid token, logging in if needed.
 *
 * Concurrent callers share one login request -- the app fires several reads at
 * once on Home, and without this each would open its own session.
 */
async function getToken() {
  if (token) return token;
  if (inFlightLogin) return inFlightLogin;

  inFlightLogin = (async () => {
    const { memberId, password } = Config.DEMO_ACCOUNT;
    const body = await rawRequest(Config.ENDPOINTS.login, {
      method: 'POST',
      body: { member_id: memberId, password },
      auth: false,
    });
    if (!body?.token) {
      throw new ApiError('Could not sign in to the SahAI service.', { kind: 'auth' });
    }
    token = body.token;
    return token;
  })();

  try {
    return await inFlightLogin;
  } finally {
    inFlightLogin = null;
  }
}

// -------------------------------------------------------------- request

/**
 * FastAPI's 422 body is a list of {loc, msg}. Turn the first entry into a
 * sentence rather than showing a validation array.
 */
function readDetail(body) {
  const detail = body?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0];
    const field = Array.isArray(first?.loc) ? first.loc[first.loc.length - 1] : null;
    if (field && first?.msg) return `${field}: ${first.msg}`;
    if (first?.msg) return first.msg;
  }
  return null;
}

async function rawRequest(path, { method = 'GET', body = null, auth = true } = {}) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (auth) headers.Authorization = `Bearer ${await getToken()}`;

  // AbortController exists in React Native and Expo Web, so the timeout needs
  // no extra dependency.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Config.REQUEST_TIMEOUT);

  let response;
  try {
    response = await fetch(`${Config.API_BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (error) {
    const timedOut = error?.name === 'AbortError';
    throw new ApiError(timedOut ? TIMED_OUT : UNREACHABLE, {
      detail: error?.message ?? String(error),
      kind: timedOut ? 'timeout' : 'network',
    });
  } finally {
    clearTimeout(timer);
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null; // empty or non-JSON body; the status checks below handle it
  }

  if (response.ok) return payload;

  const detail = readDetail(payload);

  if (response.status === 401 || response.status === 403) {
    throw new ApiError('Your session has expired. Please try again.', {
      status: response.status,
      detail,
      kind: 'auth',
    });
  }
  if (response.status === 404) {
    throw new ApiError(detail || 'Not found.', { status: 404, detail, kind: 'notfound' });
  }
  if (response.status === 409) {
    throw new ApiError(detail || 'That record already exists.', {
      status: 409,
      detail,
      kind: 'conflict',
    });
  }
  if (response.status === 503) {
    throw new ApiError(detail || 'This service is not available yet.', {
      status: 503,
      detail,
      kind: 'unavailable',
    });
  }
  if (response.status === 400 || response.status === 422) {
    throw new ApiError(detail || 'Please check the values entered and try again.', {
      status: response.status,
      detail,
      kind: 'invalid',
    });
  }

  throw new ApiError(FAILED, { status: response.status, detail });
}

/**
 * Make a request, re-authenticating once if the token had expired.
 *
 * The backend's tokens last 30 minutes, which is shorter than a demo session,
 * so this retry is the difference between the app working and the app dying
 * halfway through judging.
 */
async function request(path, options = {}) {
  try {
    return await rawRequest(path, options);
  } catch (error) {
    if (error instanceof ApiError && error.kind === 'auth' && options.auth !== false) {
      clearSession();
      return rawRequest(path, options);
    }
    throw error;
  }
}

export function getJson(path, options = {}) {
  return request(path, { ...options, method: 'GET' });
}

export function postJson(path, body, options = {}) {
  return request(path, { ...options, method: 'POST', body });
}

/** Backend reachability plus which models and data are present. Never throws. */
export async function checkHealth() {
  try {
    const body = await rawRequest(Config.ENDPOINTS.health, { auth: false });
    return {
      reachable: true,
      status: body?.status ?? 'ok',
      models: body?.models ?? {},
      database: body?.database ?? {},
    };
  } catch (error) {
    return {
      reachable: false,
      status: 'unreachable',
      models: {},
      database: {},
      message: error.message,
    };
  }
}

export default { getJson, postJson, checkHealth, clearSession, ApiError };
