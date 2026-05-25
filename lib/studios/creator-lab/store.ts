// lib/studios/creator-lab/store.ts
// Local JSON file storage for assembled creator studios.
// Files live at: runtime-data/studios/creator-lab/{creatorId}.json
// This is intentionally simple — no DB, no ORM, no migrations.

import { promises as fs } from "fs";
import path from "path";
import type { AssembledCreatorStudio, CreatorLabEntry } from "./types";

// Vercel serverless: /var/task is read-only; /tmp is the only writable dir.
// Locally: use runtime-data/ so files persist across dev server restarts.
const DATA_DIR = process.env.VERCEL
  ? "/tmp/creator-lab"
  : path.resolve(process.cwd(), "runtime-data", "studios", "creator-lab");

async function ensureDir(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

function filePath(creatorId: string): string {
  // Sanitize to prevent path traversal
  const safe = creatorId.replace(/[^a-z0-9_\-]/gi, "-").slice(0, 80);
  return path.join(DATA_DIR, `${safe}.json`);
}

// ─── Write ────────────────────────────────────────────────────────────────────

export async function saveCreatorStudio(studio: AssembledCreatorStudio): Promise<void> {
  await ensureDir();
  const fp = filePath(studio.creatorId);
  await fs.writeFile(fp, JSON.stringify(studio, null, 2), "utf-8");
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function loadCreatorStudio(creatorId: string): Promise<AssembledCreatorStudio | null> {
  const fp = filePath(creatorId);
  try {
    const raw = await fs.readFile(fp, "utf-8");
    return JSON.parse(raw) as AssembledCreatorStudio;
  } catch {
    return null;
  }
}

// ─── List ─────────────────────────────────────────────────────────────────────

export async function listCreatorStudios(): Promise<CreatorLabEntry[]> {
  await ensureDir();
  let files: string[];
  try {
    files = await fs.readdir(DATA_DIR);
  } catch {
    return [];
  }

  const entries: CreatorLabEntry[] = [];

  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    const fp = path.join(DATA_DIR, file);
    try {
      const raw = await fs.readFile(fp, "utf-8");
      const studio = JSON.parse(raw) as AssembledCreatorStudio;
      entries.push({
        creatorId:          studio.creatorId,
        createdAt:          studio.createdAt,
        status:             studio.status,
        name:               studio.identity.name,
        handle:             studio.identity.handle,
        platform:           studio.source.platform,
        sourceUrl:          studio.source.sourceUrl,
        confidence:         studio.confidence,
        suggestedStudioName: studio.suggestedStudioName,
      });
    } catch {
      // Skip malformed files silently
    }
  }

  // Newest first
  return entries.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteCreatorStudio(creatorId: string): Promise<boolean> {
  const fp = filePath(creatorId);
  try {
    await fs.unlink(fp);
    return true;
  } catch {
    return false;
  }
}

// ─── Patch (partial update for admin edits) ───────────────────────────────────

export async function patchCreatorStudio(
  creatorId: string,
  patch: Partial<Pick<AssembledCreatorStudio, "status" | "adminNotes" | "reviewNotes">>
): Promise<AssembledCreatorStudio | null> {
  const existing = await loadCreatorStudio(creatorId);
  if (!existing) return null;
  const updated: AssembledCreatorStudio = {
    ...existing,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  await saveCreatorStudio(updated);
  return updated;
}
