# Backend TODO

Backend work the frontend (`frontend/`) needs, most important first. The last section,
[APIs the frontend needs](#apis-the-frontend-needs), lists every endpoint it uses or will need.

## 1. Auth: before deploying

Auth is done: HttpOnly cookies, 1-hour access tokens (`ACCESS_TOKEN_TTL` in `backend/utils/jwt.py`),
7-day refresh tokens rotated on every `POST /auth/refresh` with reuse detection, and a logout that
revokes the sign-in. What's left:

- Over https, add `secure=True` to every `set_cookie` and `delete_cookie` (`backend/utils/tokens.py`
  and `backend/auth.py`).
- Clean up `refresh_tokens`: used and expired rows stay forever. Delete rows whose `expires_at` has
  passed, e.g. on each login or from a scheduled job.
- Logout can't revoke an access token that was already copied, because access tokens aren't stored;
  it stays valid until its hour is up. Shorten `ACCESS_TOKEN_TTL` if that window is too long.
- CSRF: `SameSite=Strict` plus serving everything from one origin (nginx) covers it. If the
  frontend ever moves to a different site, add a CSRF token.

## 2. Validation the API should enforce

The frontend checks these, but anyone can call the API directly:

- `ProductBase.condition` has no max length, but the column is `String(200)`, so longer input
  fails with a 500. Add `max_length=200`. Consider an Enum (new, like new, good, fair, for parts):
  the frontend only suggests those values.
- `ProductBase.title`, `description` and `condition` accept `""` and whitespace. Add
  `min_length=1` and `str_strip_whitespace=True`, like `CategoryBase` has.
- `ProductBase.description` is required by the API but nullable in the database. Pick one.
- `UserModel.date_of_birth` accepts future dates.
- `UserModel.username` isn't trimmed, so `" bob"` and `"bob"` are different users.
- Category names are unique only case-sensitively, so "Phones" and "phones" can both exist. Compare
  with `func.lower(Category.name)` and add a unique index on `lower(name)`.

## 3. Error responses

- The two 409s from `/auth/registration` (email taken, username taken) are plain strings with the
  same status, so the UI can't tell which field they belong to and shows them above the form.
  Return them in the 422 shape instead: `{"detail": [{"loc": ["body", "email"], "msg": "..."}]}`.
  The frontend will then put each one under its field automatically.
- "Email already registered, login instead in /auth/login" mentions an API path, and users see this
  text. Use something like "This email is already registered."
- `POST /category/create` has no response model. Use the `CategoryResponse` you added, so the contract is
  explicit and shows up in `/docs`.

## 4. Brute-force protection

Rate-limit `POST /auth/login` and `POST /auth/registration` (per IP and per email).

## 5. The first admin

Registration correctly only allows `buyer` or `seller`, so the very first admin has to come from the
database (or a seed/CLI command you add):

```sql
UPDATE users SET user_type = 'admin' WHERE email = 'you@example.com';
```

After that, admins can promote others from the Users page once `PATCH /admin/users/{id}/role` exists.

## Not needed: CORS

nginx serves the frontend and forwards `/api/*` to FastAPI, so the browser only sees one origin. If
the frontend is ever served from another origin, add `CORSMiddleware` with an explicit list of
origins and `allow_credentials=True` (never `"*"` together with credentials).

---

## APIs the frontend needs

### Conventions

- Give every endpoint a `response_model`, so the contract shows in `/docs`.
- Errors: `HTTPException(detail="A readable sentence.")` for general errors, the 422 shape for field
  errors. The frontend shows the first above the form and puts the second under the matching field.
- A real "not found" needs its own message ("User not found."). The frontend treats FastAPI's bare
  `"Not Found"` as "this endpoint doesn't exist yet" and shows a placeholder instead of an error.
- Lists come newest first unless stated. Once they get long, add `?limit=&offset=` and return
  `{"items": [...], "total": n}`, and update `frontend/public/js/api/*.js` to match.

Already in place: `CategoryResponse` (`backend/models/category.py`), `UserResponse`
(`backend/models/admin.py`), and the `/admin` router in `backend/admin.py`, whose `require_admin`
dependency makes every route in that file admin-only. Add new admin endpoints there.

### Already called by the frontend

Each of these switches a page on as soon as it exists. Until then that page shows a
"not available yet" state.

| Endpoint | Who | Request | Response | Used by |
|---|---|---|---|---|
| `PATCH /admin/users/{id}/role` | admin | `{"user_type": "buyer" \| "seller" \| "admin"}` | `UserResponse` | role dropdown on the Users page |

For the role change: answer 404 "User not found." for an unknown id, and 400 when admins try to
change their own role, so the last admin can't lock everyone out. The Users page already disables
your own row.

### Admin

All admin-only.

| Endpoint | Request | Response | For |
|---|---|---|---|
| `GET /admin/stats` | — | `{"users": {"buyer": n, "seller": n, "admin": n}, "products": n, "categories": n}` | an Overview page with counts |
| `GET /admin/users?q=&role=` | — | `list[UserResponse]` | server-side search once there are many users |
| `GET /admin/users/{id}` | — | `UserResponse` plus `"products_count"` | a user detail page |
| `PATCH /admin/users/{id}/status` | `{"is_active": false}` | `UserResponse` | suspending and restoring accounts (see below) |
| `DELETE /admin/users/{id}` | — | `204`, or 409 while they still have listings | removing an account for good |
| `DELETE /admin/products/{id}` | — | `204` | taking down any listing (moderation) |
| `GET /admin/activity?limit=50` | — | `[{"id", "event_type", "user_id", "product_id", "created_at"}]` | a recent-activity feed from the existing `product_events` table |

Suspending is safer than deleting because listings and history stay intact. It needs an `is_active`
column (default true), and both `POST /auth/login` and `get_current_user` must reject inactive users.

### Categories

Admin-only.

| Endpoint | Request | Response | For |
|---|---|---|---|
| `PATCH /category/{id}` | `{"name"}` | `CategoryResponse`, or 409 if the name is taken | renaming |
| `DELETE /category/{id}` | — | `204`, or 409 while products use it | removing |

### Products

| Endpoint | Who | Request | Response | For |
|---|---|---|---|---|
| `GET /product/{id}` | signed in | — | `ProductResponse` plus `seller_username`, `category_name` | a product page |
| `PATCH /product/{id}` | owner or admin | any `ProductBase` fields | `ProductResponse` | editing a listing |
| `DELETE /product/{id}` | owner or admin | — | `204` | removing a listing |
| `GET /product/list?q=&category_id=&seller_id=&sort=` | signed in | — | as above | server-side search and filters, replacing the in-browser filtering once the catalog grows |

### Account

| Endpoint | Request | Response | For |
|---|---|---|---|
| `PATCH /auth/me` | any of `username`, `email`, `date_of_birth` | the `/auth/me` shape | editing the profile |
| `POST /auth/change-password` | `{"current_password", "new_password"}` | `204`, or 400 if the current password is wrong | changing the password |
