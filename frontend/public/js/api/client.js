import { API_BASE, AUTH_MODE } from '../config.js';
import { session } from '../core/session.js';

/** A failed request: a message that's safe to show, plus per-field messages from 422 responses. */
export class ApiError extends Error {
  constructor(message, { status = 0, fields = {} } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fields = fields;
  }
}

const MESSAGES = {
  network: "Can't reach the server. Check your connection and try again.",
  invalid: 'Some fields need attention.',
  forbidden: "You don't have permission to do that.",
  server: 'The server ran into a problem. Please try again.',
  unknown: 'Something went wrong. Please try again.',
};

/**
 * Calls the API and resolves with the JSON body.
 * With `auth: true` the user's credentials are sent. On a 401 the access token has expired: in
 * cookie mode the session is refreshed once and the request retried; if that fails the session is
 * over, the user is sent to sign in and the returned promise never settles.
 */
export async function request(path, { method = 'GET', body, auth = true, retried = false } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  if (auth && AUTH_MODE === 'bearer') {
    const token = session.token();
    if (!token) return session.expire();
    headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(API_BASE + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: 'same-origin', // carries the auth cookie in cookie mode
    });
  } catch {
    throw new ApiError(MESSAGES.network);
  }

  const data = await readJson(response);
  if (response.ok) return data;
  if (response.status === 401 && auth) {
    if (AUTH_MODE === 'cookie' && !retried && (await refreshSession())) {
      return request(path, { method, body, auth, retried: true });
    }
    return session.expire();
  }
  throw toApiError(response.status, data);
}

let refreshing = null;

/**
 * POST /auth/refresh: trades the refresh-token cookie for new cookies (the API rotates the refresh
 * token). Requests that hit a 401 at the same time share one call, so the token is used only once.
 */
function refreshSession() {
  refreshing ??= fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    headers: { Accept: 'application/json' },
    credentials: 'same-origin',
  })
    .then((response) => response.ok)
    .catch(() => false)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

/**
 * True when the API has no such endpoint yet. FastAPI answers an unknown route with exactly
 * {"detail": "Not Found"} (or 405 for a wrong method), unlike real 404s such as "User not found".
 */
export function isMissingEndpoint(error) {
  return error instanceof ApiError && (error.status === 405 || (error.status === 404 && error.message === 'Not Found'));
}

/** For endpoints the API doesn't have yet (backendtodo.md): resolves null instead of failing. */
export async function ifAvailable(pending) {
  try {
    return await pending;
  } catch (error) {
    if (isMissingEndpoint(error)) return null;
    throw error;
  }
}

async function readJson(response) {
  if (!response.headers.get('Content-Type')?.includes('application/json')) return null;
  try {
    return await response.json();
  } catch {
    return null;
  }
}

// FastAPI answers {"detail": "message"} for an HTTPException and
// {"detail": [{"loc": ["body", "<field>"], "msg": "...", ...}]} when request validation fails (422).
function toApiError(status, data) {
  const detail = data?.detail;

  if (Array.isArray(detail)) {
    const fields = {};
    let message = null;
    for (const issue of detail) {
      const [source, field] = issue.loc ?? [];
      // Invalid emails come with a readable `reason`; custom validators prefix "Value error, ".
      const text = capitalize((issue.ctx?.reason ?? issue.msg ?? '').replace(/^Value error, /, ''));
      if (source === 'body' && typeof field === 'string') fields[field] ??= text;
      else message ??= text;
    }
    return new ApiError(message ?? MESSAGES.invalid, { status, fields });
  }

  if (typeof detail === 'string') return new ApiError(detail, { status });
  if (status === 403) return new ApiError(MESSAGES.forbidden, { status });
  return new ApiError(status >= 500 ? MESSAGES.server : MESSAGES.unknown, { status });
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
