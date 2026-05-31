// lib/studios/prospects/store.ts
// Adapter router — routes to JSON or Postgres backend based on PROSPECT_STORE_BACKEND.
//
// PROSPECT_STORE_BACKEND:
//   "json"     — always use JSON flat file (default, no DB required)
//   "postgres" — always use Postgres (requires studio_prospects table)
//   "auto"     — use Postgres if DATABASE_URL is set AND the table exists; else JSON
//
// JSON backend is the default for dev and always available as a fallback.

export type { UpsertInput, ProspectFilter } from "./store-json";

import type { ProspectRecord } from "./types";
import type { UpsertInput, ProspectFilter } from "./store-json";

import {
  getJsonStorePath,
  upsertProspectJson,
  updateProspectJson,
  updateProspectClassificationJson,
  listProspectsJson,
  filterProspectsJson,
  countProspectsJson,
  clearAllProspectsJson,
} from "./store-json";

// ─── Backend resolution ───────────────────────────────────────────────────────

type Backend = "json" | "postgres";

let _resolvedBackend: Backend | null = null;

async function resolveBackend(): Promise<Backend> {
  if (_resolvedBackend) return _resolvedBackend;

  const env = (process.env.PROSPECT_STORE_BACKEND ?? "json").toLowerCase();

  if (env === "postgres") {
    _resolvedBackend = "postgres";
    return "postgres";
  }

  if (env === "json") {
    _resolvedBackend = "json";
    return "json";
  }

  // "auto" — probe Postgres
  if (process.env.DATABASE_URL) {
    try {
      const { checkPostgresTableExists } = await import("./store-postgres");
      const ok = await checkPostgresTableExists();
      _resolvedBackend = ok ? "postgres" : "json";
    } catch {
      _resolvedBackend = "json";
    }
  } else {
    _resolvedBackend = "json";
  }

  return _resolvedBackend;
}

// ─── Backend info (for error visibility / run reports) ───────────────────────

export interface ProspectStoreBackendInfo {
  backend: Backend;
  storePath: string | null;   // JSON file path (null when using Postgres)
  envSetting: string;
}

export async function getStoreBackendInfo(): Promise<ProspectStoreBackendInfo> {
  const backend = await resolveBackend();
  return {
    backend,
    storePath:  backend === "json" ? getJsonStorePath() : null,
    envSetting: process.env.PROSPECT_STORE_BACKEND ?? "json",
  };
}

// ─── Compat: getProspectStorePath (legacy callers expect a sync path) ────────

export function getProspectStorePath(): string {
  return getJsonStorePath();
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function upsertProspect(incoming: UpsertInput): Promise<ProspectRecord> {
  const backend = await resolveBackend();
  if (backend === "postgres") {
    const { upsertProspectPostgres } = await import("./store-postgres");
    return upsertProspectPostgres(incoming);
  }
  return upsertProspectJson(incoming);
}

export async function updateProspect(
  prospectId: string,
  patch: Partial<Pick<ProspectRecord, "status" | "notes" | "validationStatus" | "archiveReason">>
): Promise<ProspectRecord | null> {
  const backend = await resolveBackend();
  if (backend === "postgres") {
    const { updateProspectPostgres } = await import("./store-postgres");
    return updateProspectPostgres(prospectId, patch);
  }
  return updateProspectJson(prospectId, patch);
}

export async function updateProspectClassification(
  prospectId: string,
  patch: Partial<Pick<ProspectRecord,
    "businessCategory" | "businessSubcategory" | "relationshipOpportunityType" |
    "relationshipScore" | "audienceScore" | "operationalDataScore" | "communityScore" |
    "overallOpportunityScore" | "offerFitTags" | "platformSignals" | "categoryConfidence" |
    "classificationNotes" | "classificationLocked"
  >>
): Promise<ProspectRecord | null> {
  const backend = await resolveBackend();
  if (backend === "postgres") {
    const { updateProspectClassificationPostgres } = await import("./store-postgres");
    return updateProspectClassificationPostgres(prospectId, patch);
  }
  return updateProspectClassificationJson(prospectId, patch);
}

export async function listProspects(): Promise<ProspectRecord[]> {
  const backend = await resolveBackend();
  if (backend === "postgres") {
    const { listProspectsPostgres } = await import("./store-postgres");
    return listProspectsPostgres();
  }
  return listProspectsJson();
}

export async function filterProspects(filter: ProspectFilter): Promise<ProspectRecord[]> {
  const backend = await resolveBackend();
  if (backend === "postgres") {
    const { filterProspectsPostgres } = await import("./store-postgres");
    return filterProspectsPostgres(filter);
  }
  return filterProspectsJson(filter);
}

export async function countProspects(): Promise<number> {
  const backend = await resolveBackend();
  if (backend === "postgres") {
    const { countProspectsPostgres } = await import("./store-postgres");
    return countProspectsPostgres();
  }
  return countProspectsJson();
}

export async function clearAllProspects(): Promise<number> {
  const backend = await resolveBackend();
  if (backend === "postgres") {
    const { clearAllProspectsPostgres } = await import("./store-postgres");
    return clearAllProspectsPostgres();
  }
  return clearAllProspectsJson();
}

// ─── Convenience: load all (used by migration script) ────────────────────────
// Always reads from JSON regardless of backend — used for migration source.

export { loadAllProspects } from "./store-json";
