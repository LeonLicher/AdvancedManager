/**
 * Kickbase's API sends no CORS headers, so browser calls must go through the
 * proxy in `worker/` (see worker/README.md). Set VITE_KICKBASE_API to the
 * deployed Worker URL; the fallback is the upstream API, which only works from
 * non-browser clients.
 */
export const KICKBASE_API_URL =
    import.meta.env.VITE_KICKBASE_API || 'https://api.kickbase.com'

/**
 * The same Worker also serves /api/log and /api/logs, which used to live on
 * kickbackend.onrender.com (now suspended) — so this defaults to the proxy URL
 * and needs no separate configuration.
 */
export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || KICKBASE_API_URL
