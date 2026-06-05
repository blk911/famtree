// lib/intelligence/transpo/action-queue/action-store.ts

import { promises as fs } from "fs";
import path from "path";
import type { TranspoActionQueueRecord } from "./action-types";

const QUEUE_DIR = process.env.VERCEL
  ? path.join("/tmp", "transpo-action-queue")
  : path.join(process.cwd(), "runtime-data", "intelligence", "transpo", "action-queue");

const QUEUE_FILE = path.join(QUEUE_DIR, "action_queue.v1.json");

export function getActionQueueStorePath(): string {
  return QUEUE_FILE;
}

export async function readActionQueue(): Promise<TranspoActionQueueRecord[]> {
  try {
    const raw = await fs.readFile(QUEUE_FILE, "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (r): r is TranspoActionQueueRecord =>
        !!r && typeof r === "object" && typeof (r as TranspoActionQueueRecord).id === "string",
    );
  } catch {
    return [];
  }
}

export async function writeActionQueue(
  records: TranspoActionQueueRecord[],
): Promise<string | null> {
  try {
    await fs.mkdir(QUEUE_DIR, { recursive: true });
    await fs.writeFile(QUEUE_FILE, JSON.stringify(records, null, 2), "utf8");
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}
