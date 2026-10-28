# Backend TODO

## Before deploying

- Uncomment `REDIS_URL` under `api` in `compose.yaml` to turn rate limiting back on.
- Serve the site over https, then set `COOKIE_SECURE=true` in `.env` so the auth cookies are only
  ever sent over https.
- Remove `ports: "8000:8000"` from `api` in `compose.yaml`. The API trusts `X-Forwarded-For`
  (`FORWARDED_ALLOW_IPS: "*"`), so anyone calling port 8000 directly, instead of going through
  nginx, can fake their IP and skip the per-IP rate limits. To keep `/docs` reachable from the
  server itself, use `"127.0.0.1:8000:8000"` instead.

---

## Conventions for new endpoints

- Give every endpoint a `response_model`, so the contract shows in `/docs`.
- Errors: `HTTPException(detail="A readable sentence.")` for general errors, the 422 shape for field
  errors. The frontend shows the first above the form and puts the second under the matching field.
- A real "not found" needs its own message ("User not found."). The frontend treats FastAPI's bare
  `"Not Found"` as "this endpoint doesn't exist yet" and shows a placeholder instead of an error.
- Lists come newest first unless stated. Once they get long, add `?limit=&offset=` and return
  `{"items": [...], "total": n}`, and update `frontend/public/js/api/*.js` to match.
- New admin endpoints go in `backend/admin.py`: its `require_admin` dependency makes every route
  there admin-only.
