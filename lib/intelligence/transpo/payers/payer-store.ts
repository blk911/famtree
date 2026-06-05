// lib/intelligence/transpo/payers/payer-store.ts

import { promises as fs } from "fs";
import path from "path";
import type { TranspoPayerRecord } from "./payer-types";

const PAYER_DIR = process.env.VERCEL
  ? path.join("/tmp", "transpo-payers")
  : path.join(process.cwd(), "runtime-data", "intelligence", "transpo", "payers");

const PAYER_FILE = path.join(PAYER_DIR, "payers.v1.json");

export async function readPayerCache(): Promise<TranspoPayerRecord[]> {
  try {
    const raw = await fs.readFile(PAYER_FILE, "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (r): r is TranspoPayerRecord =>
        !!r && typeof r === "object" && typeof (r as TranspoPayerRecord).payerId === "string",
    );
  } catch {
    return [];
  }
}

export async function writePayerCache(records: TranspoPayerRecord[]): Promise<string | null> {
  try {
    await fs.mkdir(PAYER_DIR, { recursive: true });
    await fs.writeFile(PAYER_FILE, JSON.stringify(records, null, 2), "utf8");
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}
