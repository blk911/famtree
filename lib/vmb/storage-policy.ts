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

export async function assertVmbMoneyWritableBackend(): Promise<
  { ok: true; backend: "postgres" | "memory" } | { ok: false; error: string }
> {
  if (
    process.env.VMB_MONEY_TEST_MEMORY === "1" &&
    process.env.NODE_ENV !== "production" &&
    !process.env.VERCEL
  ) {
    return { ok: true, backend: "memory" };
  }
  const backend = await resolveVmbStorageBackend();
  if (backend === "postgres") return { ok: true, backend };
  return { ok: false, error: "Postgres is required for VMB money state" };
}
