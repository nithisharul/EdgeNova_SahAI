import Config from '../constants/Config';

/**
 * The single place the app talks to FastAPI.
 *
 * Screens never see fetch, a URL, a JSON body or a bearer token. They call a
 * service; the service calls apiGet/apiPost; this file handles transport. The
 * token lives here alone, so no screen can leak or mismanage it, and changing
 * host or auth scheme touches one module.
 *
 * ERRORS
 * ------
 * Everything that fails arrives as an ApiError carrying a `kind`, so callers
 * branch on the situation rather than pattern-matching a message:
 *
 *   network      the server could not be reached at all
 *   timeout      reached, but no answer in time
 *   auth         401 -- token missing, wrong or expired
 *   forbidden    403 -- authenticated, but this role may not do this
 *   notfound     404
 *   invalid      400 / 422 -- request did not match the API's schema
 *   unavailable  503 -- a model is not trained/loaded
 *   server       5xx
 *
 * `message` is always safe to show a farmer. `detail` keeps the backend's own
 * wording, which for 400/403/422/503 is usually the more useful sentence.
 */

export class ApiError extends Error {
  constructor(kind, message, { status = null, detail = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = status;
    this.detail = detail;
  }
}

/**
 * FastAPI returns `detail` as either a string or a list of validation objects.
 * Rendering the list directly produces "[object Object]", so flatten it here --
 * once, centrally, rather than in every screen.
 */
export function formatDetail(body) {
  if (body === null || body === undefined) return null;
  const detail = body.detail !== undefined ? body.detail : body;

  if (typeof detail === 'string') return detail;

  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (typeof item === 'string') return item;
        const where = Array.isArray(item.loc)
          ? item.loc.filter((part) => part !== 'body' && part !== 'query').join('.')
          : '';
        const msg = item.msg || item.message || '';
        return where && msg ? `${where}: ${msg}` : msg || null;
      })
      .filter(Boolean)
      .join('. ');
  }

  if (typeof detail === 'object') {
    return detail.msg || detail.message || null;
  }

  return String(detail);
}

const MESSAGES = {
  auth: 'Session expired. Please log in again.',
  forbidden: 'This section is available to the SHG treasurer.',
  notfound: 'That record could not be found.',
  invalid: 'Some of the information sent was not accepted. Please check and try again.',
  unavailable: 'Service unavailable. Please try again.',
  server: 'The server had a problem completing this request.',
  network: 'Cannot reach the SahAI server. Check that the backend is running.',
  timeout: 'The server took too long to respond. Please try again.',
};

function kindForStatus(status) {
  if (status === 401) return 'auth';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'notfound';
  if (status === 400 || status === 422) return 'invalid';
  if (status === 503) return 'unavailable';
  return 'server';
}

/**
 * Statuses where the backend's own sentence is more useful than our generic
 * one -- it names the missing field, the required role, or the untrained model.
 */
const PREFER_BACKEND_DETAIL = new Set(['forbidden', 'unavailable', 'invalid']);

/** Listeners notified when a request comes back 401. */
const unauthorizedListeners = new Set();

export function onUnauthorized(listener) {
  unauthorizedListeners.add(listener);
  return () => unauthorizedListeners.delete(listener);
}

/** Set by authService so this module does not have to import it (cycle). */
let tokenProvider = () => null;

export function setTokenProvider(fn) {
  tokenProvider = fn;
}

async function raw(method, path, { body, token } = {}) {
  const url = `${Config.API_BASE_URL}${path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Config.REQUEST_TIMEOUT);

  let response;
  try {
    response = await fetch(url, {
      method,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch (error) {
    // fetch only rejects on transport failure; an HTTP error status resolves.
    const kind = error?.name === 'AbortError' ? 'timeout' : 'network';
    throw new ApiError(kind, MESSAGES[kind], { detail: String(error?.message || error) });
  } finally {
    clearTimeout(timer);
  }

  const text = await response.text();
  let parsed = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }
  }

  if (!response.ok) {
    const kind = kindForStatus(response.status);
    const detail = formatDetail(parsed) || text || null;
    const message = PREFER_BACKEND_DETAIL.has(kind) && detail ? detail : MESSAGES[kind];
    throw new ApiError(kind, message, { status: response.status, detail });
  }

  return parsed;
}

/**
 * A request, optionally authenticated.
 *
 * A 401 means the stored token is dead. Rather than silently logging back in
 * with hidden credentials, every listener is notified so the app can clear the
 * session and send the user to Login -- the user should know they were signed
 * out, not watch screens half-fail.
 */
async function request(method, path, { body, auth = true } = {}) {
  const token = auth ? tokenProvider() : null;

  try {
    return await raw(method, path, { body, token });
  } catch (error) {
    if (auth && error instanceof ApiError && error.kind === 'auth') {
      unauthorizedListeners.forEach((listener) => {
        try {
          listener(error);
        } catch {
          // A misbehaving listener must not mask the original failure.
        }
      });
    }
    throw error;
  }
}

export function apiGet(path, options) {
  return request('GET', path, options);
}

export function apiPost(path, body, options) {
  return request('POST', path, { ...options, body });
}

/** Build a query string, skipping null/undefined/'' so no empty params are sent. */
export function query(params) {
  const pairs = Object.entries(params)
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
  return pairs.length ? `?${pairs.join('&')}` : '';
}

/** Is the backend reachable? Used by the development-only mode indicator. */
export async function checkHealth() {
  try {
    await raw('GET', Config.ENDPOINTS.fertilizerOptions, {});
    return true;
  } catch (error) {
    // 503 (model missing) still proves something answered on the other end.
    return error instanceof ApiError && error.kind === 'unavailable';
  }
}

export default { apiGet, apiPost, query, checkHealth, setTokenProvider, onUnauthorized, ApiError };
