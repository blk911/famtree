import { promises as fs } from "fs";
import path from "path";
import { taikosJsonFallbackAllowed } from "@/lib/taikos/storage/taikos-storage-policy";

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
  if (!taikosJsonFallbackAllowed()) {
    return "JSON filesystem storage is disabled in production — Postgres required";
  }
  try {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    const tmp = `${filePath}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(items, null, 2), "utf8");
    await fs.rename(tmp, filePath);
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}
