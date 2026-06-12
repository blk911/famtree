import { promises as fs } from "fs";
import path from "path";
import { vmbJsonFallbackAllowed } from "@/lib/vmb/storage-policy";

export async function readJsonArray<T>(
  filePath: string,
  isValid: (item: unknown) => item is T,
): Promise<T[]> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValid);
  } catch {
    return [];
  }
}

export async function writeJsonArray<T>(filePath: string, items: T[]): Promise<string | null> {
  if (!vmbJsonFallbackAllowed()) {
    return "JSON filesystem storage is disabled in production — Postgres required";
  }
  try {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(items, null, 2), "utf8");
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}

export async function ensureVmbDataDir(): Promise<void> {
  if (!vmbJsonFallbackAllowed()) return;
  const { getVmbDataDir } = await import("./paths");
  await fs.mkdir(getVmbDataDir(), { recursive: true });
}
