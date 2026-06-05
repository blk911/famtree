// lib/intelligence/transpo/service-deficits/deficit-store.ts

import { promises as fs } from "fs";
import path from "path";
import type { TranspoServiceDeficitCacheMeta, TranspoServiceDeficitRecord } from "./deficit-types";

const DEFICIT_DIR = process.env.VERCEL
  ? path.join("/tmp", "transpo-service-deficits")
  : path.join(process.cwd(), "runtime-data", "intelligence", "transpo", "service-deficits");

const DEFICIT_FILE = path.join(DEFICIT_DIR, "service_deficits.v1.json");
const DEFICIT_META_FILE = path.join(DEFICIT_DIR, "service_deficits_meta.v1.json");

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

export async function readServiceDeficitCacheMeta(): Promise<TranspoServiceDeficitCacheMeta | null> {
  try {
    const raw = await fs.readFile(DEFICIT_META_FILE, "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as TranspoServiceDeficitCacheMeta;
  } catch {
    return null;
  }
}

export async function writeServiceDeficitCache(
  records: TranspoServiceDeficitRecord[],
  meta?: TranspoServiceDeficitCacheMeta,
): Promise<string | null> {
  try {
    await fs.mkdir(DEFICIT_DIR, { recursive: true });
    await fs.writeFile(DEFICIT_FILE, JSON.stringify(records, null, 2), "utf8");
    if (meta) {
      await fs.writeFile(DEFICIT_META_FILE, JSON.stringify(meta, null, 2), "utf8");
    }
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}
