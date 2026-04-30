/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MERCADOPAGO_PUBLIC_KEY: string
  readonly VITE_MP_PLAN_MONTHLY_ID: string
  readonly VITE_MP_PLAN_YEARLY_ID: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
