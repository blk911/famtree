// lib/intelligence/transpo/service-deficits/deficit-store.ts

import { promises as fs } from "fs";
import path from "path";
import type { TranspoServiceDeficitRecord } from "./deficit-types";

const DEFICIT_DIR = process.env.VERCEL
  ? path.join("/tmp", "transpo-service-deficits")
  : path.join(process.cwd(), "runtime-data", "intelligence", "transpo", "service-deficits");

const DEFICIT_FILE = path.join(DEFICIT_DIR, "service_deficits.v1.json");

export async function readServiceDeficitCache(): Promise<TranspoServiceDeficitRecord[]> {
  try {
    const raw = await fs.readFile(DEFICIT_FILE, "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (r): r is TranspoServiceDeficitRecord =>
        !!r && typeof r === "object" && typeof (r as TranspoServiceDeficitRecord).id === "string",
    );
  } catch {
    return [];
  }
}

export async function writeServiceDeficitCache(
  records: TranspoServiceDeficitRecord[],
): Promise<string | null> {
  try {
    await fs.mkdir(DEFICIT_DIR, { recursive: true });
    await fs.writeFile(DEFICIT_FILE, JSON.stringify(records, null, 2), "utf8");
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}
