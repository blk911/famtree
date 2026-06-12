import {
  resolveTaikosStorageBackend,
  taikosDatabaseUrlPresent,
  type TaikosStorageBackend,
} from "@/lib/taikos/storage/taikos-db";

/** JSON filesystem storage is dev-only; Vercel must use Postgres. */
export function taikosJsonFallbackAllowed(): boolean {
  return !process.env.VERCEL;
}

export function taikosProductionRequiresPostgres(): boolean {
  return Boolean(process.env.VERCEL);
}

export async function getTaikosStorageBackend(): Promise<TaikosStorageBackend> {
  return resolveTaikosStorageBackend();
}

export async function assertTaikosWritableBackend(): Promise<
  { ok: true; backend: TaikosStorageBackend } | { ok: false; error: string }
> {
  const backend = await resolveTaikosStorageBackend();
  if (backend === "postgres") return { ok: true, backend };
  if (taikosProductionRequiresPostgres()) {
    return {
      ok: false,
      error: taikosDatabaseUrlPresent()
        ? "Postgres tables unavailable — check DATABASE_URL connectivity"
        : "DATABASE_URL is required for tAIkOS on Vercel",
    };
  }
  return { ok: true, backend: "json" };
}
