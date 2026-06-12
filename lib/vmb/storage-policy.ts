import {
  ensureVmbStorageTables,
  resolveVmbStorageBackend,
  vmbDatabaseUrlPresent,
  type VmbStorageBackend,
} from "@/lib/vmb/db";

/** JSON filesystem storage is dev-only; Vercel must use Postgres. */
export function vmbJsonFallbackAllowed(): boolean {
  return !process.env.VERCEL;
}

export function vmbProductionRequiresPostgres(): boolean {
  return Boolean(process.env.VERCEL);
}

export async function getVmbStorageBackend(): Promise<VmbStorageBackend> {
  return resolveVmbStorageBackend();
}

export async function assertVmbWritableBackend(): Promise<
  { ok: true; backend: VmbStorageBackend } | { ok: false; error: string }
> {
  const backend = await resolveVmbStorageBackend();
  if (backend === "postgres") return { ok: true, backend };
  if (vmbProductionRequiresPostgres()) {
    return {
      ok: false,
      error: vmbDatabaseUrlPresent()
        ? "Postgres tables unavailable — check DATABASE_URL connectivity"
        : "DATABASE_URL is required for VMB on Vercel",
    };
  }
  return { ok: true, backend: "json" };
}
