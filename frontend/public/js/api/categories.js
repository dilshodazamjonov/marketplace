import { ifAvailable, request } from './client.js';

/** POST /category/create (admins) -> { id, name, created_at }. The API trims the name. */
export function createCategory({ name }) {
  return request('/category/create', { method: 'POST', body: { name } });
}

/** GET /category/list -> [{ id, name, created_at }], or null until the API has it (backendtodo.md). */
export function listCategories() {
  return ifAvailable(request('/category/list'));
}
