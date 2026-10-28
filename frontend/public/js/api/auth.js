import { request } from './client.js';

/** POST /auth/registration -> { message, user_id }. Body matches UserModel (backend/models/auth.py). */
export function register({ username, email, date_of_birth, user_type, password }) {
  return request('/auth/registration', {
    method: 'POST',
    auth: false,
    body: { username, email, date_of_birth, user_type, password },
  });
}

/** POST /auth/login -> { access_token, token_type }. A wrong password is a 401 shown on the form. */
export function login({ email, password }) {
  return request('/auth/login', { method: 'POST', auth: false, body: { email, password } });
}

/** GET /auth/me -> { id, username, email, date_of_birth, created_at, user_type (backendtodo.md #1) }. */
export function getMe() {
  return request('/auth/me');
}

/** POST /auth/logout. Cookie mode only: only the API can clear an HttpOnly cookie (backendtodo.md). */
export function logout() {
  return request('/auth/logout', { method: 'POST', auth: false });
}
