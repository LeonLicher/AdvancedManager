/**
 * Kickbase proxy + auth log store.
 *
 * Two jobs:
 *
 * 1. CORS proxy. api.kickbase.com answers preflights with 204 and no
 *    Access-Control-* headers, so the browser blocks every cross-origin call
 *    from GitHub Pages. Everything that is not /api/* is forwarded upstream
 *    with the CORS headers the browser needs.
 *
 * 2. /api/log and /api/logs, which used to live on kickbackend.onrender.com
 *    (now suspended). Backed by the D1 database bound as DB.
 *
 * Deploy: see worker/README.md
 */

const UPSTREAM = 'https://api.kickbase.com'

const ALLOWED_ORIGINS = [
    'https://leonlicher.github.io',
]

// Vite dev server / local preview on any port
const LOCALHOST = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/

// The two sites that use this Worker grew different path prefixes for the same
// two endpoints: AdvancedManager calls /api/log(s), Kickbase calls /auth/log(s).
// Both are accepted so they share one log store. Kickbase's own API lives under
// /v4/, so neither prefix can collide with something that should be proxied.
const LOG_WRITE_PATHS = new Set(['/api/log', '/auth/log'])
const LOG_READ_PATHS = new Set(['/api/logs', '/auth/logs'])
const LOCAL_PREFIXES = ['/api/', '/auth/']

const MAX_LOG_BODY_BYTES = 8 * 1024
const DEFAULT_LOG_LIMIT = 200
const MAX_LOG_LIMIT = 1000

function resolveOrigin(request) {
    const origin = request.headers.get('Origin')
    if (!origin) return null
    if (ALLOWED_ORIGINS.includes(origin) || LOCALHOST.test(origin)) return origin
    return null
}

function corsHeaders(origin) {
    return {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers':
            'Authorization, Content-Type, Accept, X-Admin-Token',
        'Access-Control-Max-Age': '86400',
        Vary: 'Origin',
    }
}

function json(body, status, origin) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
    })
}

/** Keep one abusive caller from filling the database with huge rows. */
function clamp(value, max) {
    if (value === null || value === undefined) return null
    return String(value).slice(0, max)
}

async function handleWriteLog(request, env, origin) {
    const raw = await request.text()
    if (raw.length > MAX_LOG_BODY_BYTES) {
        return json({ error: 'Payload too large' }, 413, origin)
    }

    let entry
    try {
        entry = JSON.parse(raw)
    } catch {
        return json({ error: 'Invalid JSON' }, 400, origin)
    }

    if (entry.action !== 'login' && entry.action !== 'logout') {
        return json({ error: "action must be 'login' or 'logout'" }, 400, origin)
    }

    await env.DB.prepare(
        `INSERT INTO auth_logs
           (timestamp, user_id, user_name, action, success, error, league_id, device_info)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
        .bind(
            new Date().toISOString(),
            clamp(entry.userId ?? 'unknown', 64),
            clamp(entry.userName ?? 'unknown', 254),
            entry.action,
            entry.success ? 1 : 0,
            clamp(entry.error, 500),
            clamp(entry.leagueId, 64),
            clamp(JSON.stringify(entry.deviceInfo ?? {}), 2048)
        )
        .run()

    return json({ ok: true }, 201, origin)
}

async function handleReadLogs(request, env, origin) {
    // These rows carry every user's email and device fingerprint, and a static
    // site cannot hide a token in its bundle — so reads require an explicitly
    // supplied admin token rather than being open to any allowed origin.
    if (!env.ADMIN_TOKEN) {
        return json({ error: 'ADMIN_TOKEN is not configured' }, 503, origin)
    }
    if (request.headers.get('X-Admin-Token') !== env.ADMIN_TOKEN) {
        return json({ error: 'Unauthorized' }, 401, origin)
    }

    const requested = Number(new URL(request.url).searchParams.get('limit'))
    const limit =
        Number.isFinite(requested) && requested > 0
            ? Math.min(requested, MAX_LOG_LIMIT)
            : DEFAULT_LOG_LIMIT

    const { results } = await env.DB.prepare(
        `SELECT timestamp, user_id, user_name, action, success, error, league_id, device_info
           FROM auth_logs
          ORDER BY timestamp DESC
          LIMIT ?`
    )
        .bind(limit)
        .all()

    // Shape must match the AuthLog interface in src/components/AuthLogs.tsx.
    const logs = results.map((row) => {
        let deviceInfo = {}
        try {
            deviceInfo = JSON.parse(row.device_info)
        } catch {
            // A malformed row should not break the whole response.
        }
        return {
            timestamp: row.timestamp,
            userId: row.user_id,
            userName: row.user_name,
            action: row.action,
            success: row.success === 1,
            error: row.error ?? undefined,
            leagueId: row.league_id ?? undefined,
            deviceInfo,
        }
    })

    return json(logs, 200, origin)
}

async function handleProxy(request, origin) {
    const url = new URL(request.url)
    const upstreamUrl = `${UPSTREAM}${url.pathname}${url.search}`

    const headers = new Headers()
    headers.set('Accept', 'application/json')
    headers.set(
        'User-Agent',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
    )
    const auth = request.headers.get('Authorization')
    if (auth) headers.set('Authorization', auth)
    const contentType = request.headers.get('Content-Type')
    if (contentType) headers.set('Content-Type', contentType)

    const upstream = await fetch(upstreamUrl, {
        method: request.method,
        headers,
        body: ['GET', 'HEAD'].includes(request.method)
            ? undefined
            : await request.text(),
    })

    // Upstream errors (e.g. 401 on bad credentials) must reach the browser with
    // CORS headers too, otherwise the real message is hidden behind a CORS
    // error instead of the status the app can act on.
    const responseHeaders = new Headers(corsHeaders(origin))
    const upstreamContentType = upstream.headers.get('Content-Type')
    if (upstreamContentType) {
        responseHeaders.set('Content-Type', upstreamContentType)
    }

    return new Response(upstream.body, {
        status: upstream.status,
        statusText: upstream.statusText,
        headers: responseHeaders,
    })
}

export default {
    async fetch(request, env) {
        const origin = resolveOrigin(request)

        if (request.method === 'OPTIONS') {
            if (!origin) return new Response('Origin not allowed', { status: 403 })
            return new Response(null, { status: 204, headers: corsHeaders(origin) })
        }

        if (!origin) return new Response('Origin not allowed', { status: 403 })

        const { pathname } = new URL(request.url)

        try {
            if (LOG_WRITE_PATHS.has(pathname) && request.method === 'POST') {
                return await handleWriteLog(request, env, origin)
            }
            if (LOG_READ_PATHS.has(pathname) && request.method === 'GET') {
                return await handleReadLogs(request, env, origin)
            }
            if (LOCAL_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
                return json({ error: 'Not found' }, 404, origin)
            }
            return await handleProxy(request, origin)
        } catch (err) {
            // Without CORS headers here, a worker crash surfaces in the browser
            // as an opaque CORS error instead of a readable 500.
            return json({ error: `Worker error: ${err.message}` }, 500, origin)
        }
    },
}
