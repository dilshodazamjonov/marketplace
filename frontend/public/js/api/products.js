import { ifAvailable, request } from './client.js';

/**
 * POST /product/create (sellers and admins) -> ProductResponse.
 * Body matches ProductBase; `price` is a decimal string such as "19.90" (at most 2 decimals).
 */
export function createProduct({ title, description, price, category_id, condition }) {
  return request('/product/create', {
    method: 'POST',
    body: { title, description, price, category_id, condition },
  });
}

/** GET /product/list -> ProductResponse[], or null until the API has it (backendtodo.md). */
export function listProducts() {
  return ifAvailable(request('/product/list'));
}
