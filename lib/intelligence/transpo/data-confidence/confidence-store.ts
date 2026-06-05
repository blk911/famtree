// lib/intelligence/transpo/data-confidence/confidence-store.ts

import { promises as fs } from "fs";
import path from "path";
import type { TranspoDataConfidenceRecord } from "./data-confidence-types";

const CONFIDENCE_DIR = process.env.VERCEL
  ? path.join("/tmp", "transpo-data-confidence")
  : path.join(process.cwd(), "runtime-data", "intelligence", "transpo", "data-confidence");

const CONFIDENCE_FILE = path.join(CONFIDENCE_DIR, "data_confidence.v1.json");

export async function readDataConfidenceCache(): Promise<TranspoDataConfidenceRecord[]> {
  try {
    const raw = await fs.readFile(CONFIDENCE_FILE, "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (r): r is TranspoDataConfidenceRecord =>
        !!r && typeof r === "object" && typeof (r as TranspoDataConfidenceRecord).id === "string",
    );
  } catch {
    return [];
  }
}

export async function writeDataConfidenceCache(
  records: TranspoDataConfidenceRecord[],
): Promise<string | null> {
  try {
    await fs.mkdir(CONFIDENCE_DIR, { recursive: true });
    await fs.writeFile(CONFIDENCE_FILE, JSON.stringify(records, null, 2), "utf8");
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}
