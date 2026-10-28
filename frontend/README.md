# Marketplace frontend

Plain HTML, CSS and JavaScript (ES modules). There's no build step and there are no dependencies.

## Run

```bash
docker compose up -d --build
```

Then open <http://localhost:8080>. The `web` service (nginx) serves `public/` and forwards
`/api/*` to the FastAPI service, so the browser talks to a single origin.

To get the first admin account, register, then run this in the database:
`UPDATE users SET user_type = 'admin' WHERE email = '…';`

## Pages

| Path | Who | What |
|---|---|---|
| `/login/`, `/register/` | anyone | sign in; sign up as buyer or seller |
| `/buyer/` | everyone signed in | catalog with search, category filter and sorting (home for buyers) |
| `/seller/` | sellers, admins | your listings and "New listing" (home for sellers) |
| `/admin/` | admins | categories and "New category" (home for admins) |
| `/admin/users/` | admins | users and their roles |
| `/account/` | everyone signed in | profile from `GET /auth/me` |

Pages that depend on endpoints the API doesn't have yet show a "not available yet" state, and start
working as soon as the endpoint exists (see `backendtodo.md`, "APIs the frontend needs").

## Structure

```
public/
  */index.html       one folder per page (clean URLs); static markup, JS fills in data
  assets/            favicon, icons.svg (hand-made icon sprite), fonts/ (Inter, self-hosted)
  css/
    tokens.css       colours (light-dark()), type scale, spacing, radii, shadows
    base.css         fonts, reset, typography, utilities
    layout.css       app shell (sidebar + content panel), page header, toolbar, sign-in layout
    components.css   buttons, inputs, tables, cards, dialogs, toasts, skeletons, empty states
  js/
    theme-init.js    applies the saved theme before first paint (classic script)
    config.js        API base path and auth mode
    api/             one function per endpoint; client.js turns FastAPI errors into ApiError
    core/            session.js (token + expiry), auth.js (sign in/out, page guard), routes.js (roles, pages)
    ui/              dom helpers, forms, dialogs, toasts, theme switch, collection (searchable lists),
                     shared components, shell (sidebar + page boot)
    pages/           one small module per page
```

## How it behaves

- **Lists** load with skeletons, filter instantly in the browser, show a count, and have empty,
  no-match and error-with-retry states.
- **Creating things** happens in dialogs (native `<dialog>`: focus trap, Escape, focus return).
  Success shows a toast; validation errors appear under the field they belong to.
- **Theme:** follows the system, or light/dark from the switch in the sidebar (remembered per browser).

## Auth

- **Token storage:** `POST /auth/login` sets the JWT as an HttpOnly cookie, so JavaScript never sees
  it and the browser sends it with every `/api` request (`AUTH_MODE = 'cookie'` in `js/config.js`).
  Signing out calls `POST /auth/logout`, the only way to clear that cookie. `'bearer'` mode (token in
  `sessionStorage`, sent as a header) is still there for an API that returns the token instead.
- **Expiry:** the session ends when the login's `expires_in` runs out, using a timer plus a check
  when the tab comes back. Any 401 also ends it. The user is sent to sign in and returned to the same page.
- **Page guards:** signed-in pages show nothing until `GET /auth/me` confirms access. Users who
  aren't signed in go to `/login/`, and the wrong role is sent to its own home page. This is only for
  the UI: the API still checks permissions on every request.
- **XSS hardening:** a strict Content-Security-Policy (`nginx.conf`) allows only same-origin scripts,
  and API data is only ever inserted as text, never as HTML.
