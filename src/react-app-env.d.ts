/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_KICKBASE_USERNAME: string
  readonly VITE_KICKBASE_PASSWORD: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}