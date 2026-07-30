/** Split migrations replaced by `2026-07-production-baseline` (ledger compat only). */
export const LEGACY_PRODUCTION_MIGRATION_IDS = [
  "2026-07-product-variant-atributos",
  "2026-07-site-personalization-shape",
  "2026-07-site-whatsapp-template-parts",
] as const;

export const PRODUCTION_BASELINE_MIGRATION_ID =
  "2026-07-production-baseline" as const;
