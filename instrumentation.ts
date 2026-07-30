export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  try {
    const { runDataMigrations } = await import(
      "@/src/lib/data/migrations/runner"
    );
    const summary = await runDataMigrations({ trigger: "startup" });
    if (summary.applied.length > 0) {
      console.info("[migrations] startup applied:", summary.applied.join(", "));
    }
  } catch (e) {
    // Never take down the Node server/worker because a migration failed.
    // Admin/storefront must stay up; ops can retry via `npm run data:migrate`.
    console.error("[migrations] startup failed:", e);
  }
}
