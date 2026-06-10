import { promises as fs } from "fs";
import path from "path";
import type { SalonBackOfficeImportRun } from "@/lib/intelligence/salon/backoffice/types";
import { getVmbTrialImportsDir } from "./paths";

const PREVIEW_CAP = 50;

function importFilePath(trialId: string): string {
  return path.join(getVmbTrialImportsDir(), `${trialId}.json`);
}

export async function readTrialImportRuns(trialId: string): Promise<SalonBackOfficeImportRun[]> {
  const filePath = importFilePath(trialId);
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (r): r is SalonBackOfficeImportRun =>
        !!r && typeof r === "object" && typeof (r as SalonBackOfficeImportRun).id === "string",
    );
  } catch {
    return [];
  }
}

export async function appendTrialImportRun(
  trialId: string,
  run: SalonBackOfficeImportRun,
): Promise<string | null> {
  const toStore: SalonBackOfficeImportRun = {
    ...run,
    normalizedPreview: run.normalizedPreview.slice(0, PREVIEW_CAP),
  };

  const dir = getVmbTrialImportsDir();
  const filePath = importFilePath(trialId);
  try {
    await fs.mkdir(dir, { recursive: true });
    const existing = await readTrialImportRuns(trialId);
    existing.unshift(toStore);
    await fs.writeFile(filePath, JSON.stringify(existing, null, 2), "utf8");
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}
