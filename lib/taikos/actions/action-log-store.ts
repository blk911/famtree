import { promises as fs } from "fs";
import path from "path";
import { getTaikosActionLogFile } from "@/lib/taikos/paths";
import type { TaikosActionLogEntry } from "./types";

type LogFile = TaikosActionLogEntry[];

async function ensureDir(): Promise<void> {
  await fs.mkdir(path.dirname(getTaikosActionLogFile()), { recursive: true });
}

async function readAll(): Promise<LogFile> {
  try {
    const raw = await fs.readFile(getTaikosActionLogFile(), "utf8");
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as LogFile) : [];
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

async function writeAll(entries: LogFile): Promise<void> {
  await ensureDir();
  const file = getTaikosActionLogFile();
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(entries, null, 2), "utf8");
  await fs.rename(tmp, file);
}

export async function appendActionLogEntry(entry: TaikosActionLogEntry): Promise<TaikosActionLogEntry> {
  const all = await readAll();
  all.push(entry);
  await writeAll(all);
  return entry;
}

export async function listActionLogForSalon(
  salonId: string,
  limit = 50,
): Promise<TaikosActionLogEntry[]> {
  const all = await readAll();
  return all
    .filter((e) => e.salonId === salonId)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, limit);
}
