/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_KICKBASE_USERNAME: string
    readonly VITE_KICKBASE_PASSWORD: string
    readonly VITE_KICKBASE_API: string
    readonly VITE_BACKEND_URL: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
