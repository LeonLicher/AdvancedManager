# Kickbase CORS proxy

`api.kickbase.com` sends no `Access-Control-*` headers (its preflight is a bare
`204`), so the browser blocks every call made directly from
`https://leonlicher.github.io`. This Worker forwards the request server-side and
adds the CORS headers.

## Deploy

`wrangler` is a devDependency, so run these from the **repo root** (not from
`worker/`) after `npm install`:

```bash
npm run worker:login     # opens a browser, needs a (free) Cloudflare account
npm run worker:deploy
```

`worker:deploy` prints the public URL, e.g.
`https://kickbase-proxy.<your-subdomain>.workers.dev`.

`npm run worker:dev` runs it locally on `http://localhost:8787` if you want to
test against it before deploying.

## Point the app at it

Put the URL in `.env` for local dev and in the deploy workflow for production:

```
VITE_KICKBASE_API=https://kickbase-proxy.<your-subdomain>.workers.dev
```

Without it the app falls back to `https://api.kickbase.com` directly, which only
works outside the browser.

## Allowed origins

Only the origins in `ALLOWED_ORIGINS` (plus any `localhost` port) can use the
proxy — otherwise it would be an open relay for anyone's Kickbase traffic. Add
new deploy domains to that list in `kickbase-proxy.js`.

## Auth log endpoints

The Worker also serves the two endpoints that used to live on
`kickbackend.onrender.com` (suspended), backed by a D1 database:

| Endpoint | Auth | Purpose |
|---|---|---|
| `POST /api/log` | none (the login page must post) | Append a login/logout record |
| `GET /api/logs?limit=N` | `X-Admin-Token` header | Read records, newest first |

`/api/logs` returns every user's email address and device fingerprint, so it is
gated behind an admin token. A static site cannot hide a secret in its bundle,
so `src/components/AuthLogs.tsx` asks for the token once and keeps it in
`localStorage`; the route is `/authlogs`.

Writes are deliberately unauthenticated — the sign-in page has no credentials
yet when it reports a *failed* login. Abuse is bounded instead: bodies over 8 KB
are rejected with 413, `action` must be `login` or `logout`, and every field is
length-clamped before insert.

### Rotating the admin token

```bash
node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"
npx wrangler secret put ADMIN_TOKEN --config worker/wrangler.toml
```

Anyone holding the old token then has to re-enter the new one at `/authlogs`.

### Schema changes

`worker/schema.sql` is idempotent (`IF NOT EXISTS`), so re-applying is safe:

```bash
npx wrangler d1 execute kickbase-logs --remote --file worker/schema.sql --config worker/wrangler.toml
```

Inspect rows directly with:

```bash
npx wrangler d1 execute kickbase-logs --remote --config worker/wrangler.toml \
  --command "SELECT timestamp, user_name, success FROM auth_logs ORDER BY timestamp DESC LIMIT 10"
```
