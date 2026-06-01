// lib/intelligence/salon/storage-status.ts
// Salon intelligence storage audit — Postgres vs JSON / ephemeral runtime.

import { getStoreBackendInfo, countProspects } from "@/lib/studios/prospects/store";
import { listHarvestRuns } from "@/lib/studios/creator-lab/hashtag-harvest/store";
import { resolveSalonBackOfficeBackend } from "@/lib/intelligence/salon/backoffice/db";
import { promises as fs } from "fs";
import path from "path";

export type SalonStoreSliceStatus = {
  backend: "postgres" | "json" | "unknown";
  durable: boolean;
  count?: number;
  warning?: string;
};

export type SalonStorageStatus = {
  ok: boolean;
  backend: "postgres" | "json" | "unknown";
  durable: boolean;
  databaseUrlPresent: boolean;
  vercel: boolean;
  warnings: string[];
  stores: {
    prospects?: SalonStoreSliceStatus;
    harvestRuns?: SalonStoreSliceStatus;
    resolverRuns?: SalonStoreSliceStatus;
    importRuns?: SalonStoreSliceStatus;
  };
};

function harvestDataDir(): string {
  return process.env.VERCEL
    ? "/tmp/hashtag-harvest"
    : path.resolve(process.cwd(), "runtime-data", "studios", "hashtag-harvest");
}

function backofficeJsonDir(): string {
  return path.join(process.cwd(), "runtime-data", "intelligence", "salon", "backoffice");
}

async function countJsonFiles(dir: string): Promise<number> {
  try {
    const files = await fs.readdir(dir);
    return files.filter((f) => f.endsWith(".json")).length;
  } catch {
    return 0;
  }
}

export async function getSalonStorageStatus(): Promise<SalonStorageStatus> {
  const warnings: string[] = [];
  const vercel = Boolean(process.env.VERCEL);
  const databaseUrlPresent = Boolean(process.env.DATABASE_URL?.trim());

  const [prospectInfo, prospectCount, harvestRuns, backofficeBackend] = await Promise.all([
    getStoreBackendInfo(),
    countProspects(),
    listHarvestRuns(),
    resolveSalonBackOfficeBackend(),
  ]);

  const prospectsBackend = prospectInfo.backend;
  const prospectsDurable = prospectsBackend === "postgres";
  if (vercel && prospectsBackend === "json") {
    warnings.push(
      "Runtime JSON on Vercel is ephemeral; use Postgres for Salon intelligence.",
    );
  }

  const harvestBackend: "postgres" | "json" = "json";
  const harvestDurable = !vercel;
  if (vercel) {
    warnings.push("Hashtag harvest run files on Vercel use /tmp and are not durable across deploys.");
  }

  let importCount = 0;
  if (backofficeBackend === "json") {
    importCount = await countJsonFiles(backofficeJsonDir());
    if (vercel) {
      warnings.push("Back-office import JSON on Vercel is ephemeral unless Postgres is configured.");
    }
  }

  const globalBackend: SalonStorageStatus["backend"] = databaseUrlPresent
    ? prospectsDurable
      ? "postgres"
      : "json"
    : prospectsBackend === "json"
      ? "json"
      : "unknown";

  const durable =
    prospectsDurable && (harvestDurable || harvestRuns.length === 0) && backofficeBackend === "postgres";

  return {
    ok: true,
    backend: globalBackend,
    durable,
    databaseUrlPresent,
    vercel,
    warnings,
    stores: {
      prospects: {
        backend: prospectsBackend,
        durable: prospectsDurable,
        count: prospectCount,
        warning: vercel && !prospectsDurable
          ? "Prospect store is JSON on Vercel — data may be lost on cold start."
          : undefined,
      },
      harvestRuns: {
        backend: harvestBackend,
        durable: harvestDurable,
        count: harvestRuns.length,
        warning: vercel ? "Harvest runs stored under /tmp on Vercel." : undefined,
      },
      resolverRuns: {
        backend: "unknown",
        durable: false,
        warning: "IG resolver runs are not persisted as a separate store yet.",
      },
      importRuns: {
        backend: backofficeBackend,
        durable: backofficeBackend === "postgres",
        count: importCount || undefined,
      },
    },
  };
}
