import { ifAvailable, request } from './client.js';

/**
 * GET /admin/users (admins) -> [{ id, username, email, user_type, date_of_birth, created_at }],
 * or null until the API has it (backendtodo.md, "APIs the frontend needs").
 */
export function listUsers() {
  return ifAvailable(request('/admin/users'));
}

/** PATCH /admin/users/{id}/role (admins) with { user_type } -> the updated user. */
export function updateUserRole(id, user_type) {
  return request(`/admin/users/${encodeURIComponent(id)}/role`, { method: 'PATCH', body: { user_type } });
}
