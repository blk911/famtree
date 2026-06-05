// lib/intelligence/transpo/market-gaps/gap-store.ts
// Cached market gap analysis artifacts (does not touch carrier master).

import { promises as fs } from "fs";
import path from "path";
import type { TranspoMarketGapRecord } from "./types";

const GAP_DIR = process.env.VERCEL
  ? path.join("/tmp", "transpo-market-gaps")
  : path.join(process.cwd(), "runtime-data", "intelligence", "transpo", "market-gaps");

const GAP_FILE = path.join(GAP_DIR, "market_gaps.v1.json");

export function getMarketGapStorePath(): string {
  return GAP_FILE;
}

export async function readMarketGapCache(): Promise<TranspoMarketGapRecord[]> {
  try {
    const raw = await fs.readFile(GAP_FILE, "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (r): r is TranspoMarketGapRecord =>
        !!r && typeof r === "object" && typeof (r as TranspoMarketGapRecord).id === "string",
    );
  } catch {
    return [];
  }
}

export async function writeMarketGapCache(
  records: TranspoMarketGapRecord[],
): Promise<string | null> {
  try {
    await fs.mkdir(GAP_DIR, { recursive: true });
    await fs.writeFile(GAP_FILE, JSON.stringify(records, null, 2), "utf8");
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}
