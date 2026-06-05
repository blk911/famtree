// lib/intelligence/transpo/opportunity-dossiers/county-opportunity-store.ts

import { promises as fs } from "fs";
import path from "path";
import type { CountyOpportunityDossier } from "./county-opportunity-types";

const OPP_DIR = process.env.VERCEL
  ? path.join("/tmp", "transpo-county-opportunities")
  : path.join(process.cwd(), "runtime-data", "intelligence", "transpo", "county-opportunities");

const OPP_FILE = path.join(OPP_DIR, "county_opportunities.v1.json");

export async function readCountyOpportunityCache(): Promise<CountyOpportunityDossier[]> {
  try {
    const raw = await fs.readFile(OPP_FILE, "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (d): d is CountyOpportunityDossier =>
        !!d && typeof d === "object" && typeof (d as CountyOpportunityDossier).id === "string",
    );
  } catch {
    return [];
  }
}

export async function writeCountyOpportunityCache(
  dossiers: CountyOpportunityDossier[],
): Promise<string | null> {
  try {
    await fs.mkdir(OPP_DIR, { recursive: true });
    await fs.writeFile(OPP_FILE, JSON.stringify(dossiers, null, 2), "utf8");
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}
