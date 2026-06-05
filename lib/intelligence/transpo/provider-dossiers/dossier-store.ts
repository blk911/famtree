// lib/intelligence/transpo/provider-dossiers/dossier-store.ts

import { promises as fs } from "fs";
import path from "path";
import type { TranspoProviderDossier } from "./dossier-types";

const DOSSIER_DIR = process.env.VERCEL
  ? path.join("/tmp", "transpo-provider-dossiers")
  : path.join(process.cwd(), "runtime-data", "intelligence", "transpo", "provider-dossiers");

const DOSSIER_FILE = path.join(DOSSIER_DIR, "provider_dossiers.v1.json");

export async function readProviderDossierCache(): Promise<TranspoProviderDossier[]> {
  try {
    const raw = await fs.readFile(DOSSIER_FILE, "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (d): d is TranspoProviderDossier =>
        !!d && typeof d === "object" && typeof (d as TranspoProviderDossier).providerId === "string",
    );
  } catch {
    return [];
  }
}

export async function writeProviderDossierCache(
  dossiers: TranspoProviderDossier[],
): Promise<string | null> {
  try {
    await fs.mkdir(DOSSIER_DIR, { recursive: true });
    await fs.writeFile(DOSSIER_FILE, JSON.stringify(dossiers, null, 2), "utf8");
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}
