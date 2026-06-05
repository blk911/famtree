// lib/intelligence/transpo/demand/demand-store.ts

import { promises as fs } from "fs";
import path from "path";
import type { TranspoCountyDemandRecord } from "./demand-types";

const DEMAND_DIR = process.env.VERCEL
  ? path.join("/tmp", "transpo-demand")
  : path.join(process.cwd(), "runtime-data", "intelligence", "transpo", "demand");

const DEMAND_FILE = path.join(DEMAND_DIR, "county_demand.v1.json");

export async function readCountyDemandCache(): Promise<TranspoCountyDemandRecord[]> {
  try {
    const raw = await fs.readFile(DEMAND_FILE, "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (r): r is TranspoCountyDemandRecord =>
        !!r && typeof r === "object" && typeof (r as TranspoCountyDemandRecord).countyFips === "string",
    );
  } catch {
    return [];
  }
}

export async function writeCountyDemandCache(
  records: TranspoCountyDemandRecord[],
): Promise<string | null> {
  try {
    await fs.mkdir(DEMAND_DIR, { recursive: true });
    await fs.writeFile(DEMAND_FILE, JSON.stringify(records, null, 2), "utf8");
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}
