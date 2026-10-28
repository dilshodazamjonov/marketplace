import { AUTH_MODE } from '../config.js';
import { goToLogin } from './routes.js';

// What this tab knows about the session, kept in sessionStorage (dropped when the tab closes).
// Cookie mode stores no token: the tokens are HttpOnly cookies. Bearer mode stores the JWT, which
// page scripts could read; the strict Content-Security-Policy in nginx.conf limits what runs here.
const STORAGE_KEY = 'marketplace.session';

let expiryTimer;

export const session = {
  /** Stores what POST /auth/login returned. */
  start(loginResponse) {
    if (AUTH_MODE === 'bearer') {
      const token = loginResponse.access_token;
      save({ token, expiresAt: tokenExpiry(token) });
    } else {
      // No expiry to watch: when the access cookie expires, api/client.js refreshes it, and the
      // session only ends when the refresh token is rejected (a 401 from POST /auth/refresh).
      save({ expiresAt: null });
    }
  },

  /** 'none' (not signed in in this tab), 'expired' or 'active'. */
  status() {
    const record = load();
    if (!record) return 'none';
    return record.expiresAt && record.expiresAt <= Date.now() ? 'expired' : 'active';
  },

  /** The bearer token while the session is active, otherwise null. */
  token() {
    return this.status() === 'active' ? (load().token ?? null) : null;
  },

  clear() {
    clearTimeout(expiryTimer);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // Storage unavailable: nothing to clear.
    }
  },

  /** Ends a session the API no longer accepts and asks the user to sign in again. */
  expire() {
    const hadSession = this.status() !== 'none';
    this.clear();
    return goToLogin({ expired: hadSession });
  },

  /** Signs the user out the moment the token expires, even if the page is left open. */
  watchExpiry() {
    const expiresAt = load()?.expiresAt;
    if (!expiresAt) return;

    const check = () => {
      if (Date.now() >= expiresAt) this.expire();
    };
    clearTimeout(expiryTimer);
    expiryTimer = setTimeout(check, expiresAt - Date.now());
    // Browsers delay timers in background tabs, so check again when the tab is shown.
    document.addEventListener('visibilitychange', check);
  },
};

function load() {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

function save(record) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    // Storage blocked by the browser: the user will have to sign in again on the next page.
  }
}

/** Reads `exp` from the JWT payload. Not verified here: the API checks the signature on every call. */
function tokenExpiry(token) {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const { exp } = JSON.parse(atob(payload));
    return Number.isFinite(exp) ? exp * 1000 : null;
  } catch {
    return null;
  }
}
