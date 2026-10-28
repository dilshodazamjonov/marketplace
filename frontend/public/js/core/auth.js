import * as api from '../api/auth.js';
import { ApiError } from '../api/client.js';
import { AUTH_MODE } from '../config.js';
import { ROLES, canOpen, destinationFor, goToLogin, redirect } from './routes.js';
import { session } from './session.js';

const MISSING_ROLE =
  "Your account type is missing from the server's response (GET /auth/me has no user_type), " +
  "so your workspace can't be opened.";

/** The signed-in user from GET /auth/me, checked for the role every page depends on. */
async function currentUser() {
  const user = await api.getMe();
  if (!Object.hasOwn(ROLES, user?.user_type)) throw new ApiError(MISSING_ROLE);
  return user;
}

export async function signIn(credentials) {
  session.start(await api.login(credentials));
  try {
    return await currentUser();
  } catch (error) {
    session.clear();
    throw error;
  }
}

export async function signOut() {
  // A bearer token only has to be forgotten; an HttpOnly cookie can only be cleared by the API.
  if (AUTH_MODE === 'cookie') await api.logout().catch(() => {});
  session.clear();
  return redirect('/login/');
}

/** For signed-in pages: resolves with the user if they may open `path`, otherwise navigates away. */
export async function requireAccess(path) {
  // With a bearer token the browser knows there's no session; with a cookie only the API knows.
  if (AUTH_MODE === 'bearer') {
    const status = session.status();
    if (status === 'expired') return session.expire();
    if (status === 'none') return goToLogin();
  }

  const user = await currentUser(); // a 401 here ends the session too (api/client.js)
  if (!canOpen(user.user_type, path)) return redirect(ROLES[user.user_type].home);

  session.watchExpiry();
  return user;
}

/** For public pages: if this tab is already signed in, go straight to the user's workspace. */
export async function redirectIfSignedIn() {
  if (session.status() !== 'active') return;
  const user = await currentUser().catch(() => null); // unusable session: stay and sign in again
  if (user) await redirect(destinationFor(user));
}
