import type { ActiveBookPointer, SetActiveBookPointerInput } from "@/lib/vmb/active-book-pointer-types";
import {
  getActiveBookPointerPostgres,
  listActiveBookPointersPostgres,
  saveActiveBookPointerPostgres,
} from "@/lib/vmb/active-book-pointer-postgres";
import { resolveVmbStorageBackend } from "@/lib/vmb/db";
import { assertVmbWritableBackend, vmbJsonFallbackAllowed } from "@/lib/vmb/storage-policy";
import { getVmbActiveBookFile } from "./paths";
import { readJsonArray, writeJsonArray } from "./runtime-json-store";

export type { ActiveBookPointer, SetActiveBookPointerInput } from "@/lib/vmb/active-book-pointer-types";

function isPointer(item: unknown): item is ActiveBookPointer {
  return (
    !!item &&
    typeof item === "object" &&
    typeof (item as ActiveBookPointer).salonId === "string" &&
    typeof (item as ActiveBookPointer).analysisId === "string"
  );
}

async function listActiveBookPointersJson(): Promise<ActiveBookPointer[]> {
  return readJsonArray(getVmbActiveBookFile(), isPointer);
}

export async function listActiveBookPointers(): Promise<ActiveBookPointer[]> {
  const backend = await resolveVmbStorageBackend();
  if (backend === "postgres") {
    return listActiveBookPointersPostgres();
  }
  return listActiveBookPointersJson();
}

export async function getActiveBookPointer(
  salonId: string,
): Promise<ActiveBookPointer | undefined> {
  const id = salonId.trim();
  if (!id) return undefined;

  const backend = await resolveVmbStorageBackend();
  if (backend === "postgres") {
    return getActiveBookPointerPostgres(id);
  }
  const all = await listActiveBookPointersJson();
  return all.find((p) => p.salonId === id);
}

export async function setActiveBookPointer(
  input: SetActiveBookPointerInput,
): Promise<{ pointer: ActiveBookPointer } | { error: string }> {
  const salonId = input.salonId.trim();
  const analysisId = input.analysisId.trim();
  if (!salonId || !analysisId) return { error: "salonId and analysisId are required" };

  const writable = await assertVmbWritableBackend();
  if (!writable.ok) return { error: writable.error };

  const now = new Date().toISOString();
  const pointer: ActiveBookPointer = {
    salonId,
    analysisId,
    clientCount: Math.max(0, input.clientCount),
    recordCount: Math.max(0, input.recordCount),
    sourceFileName: input.sourceFileName?.trim() || undefined,
    updatedAt: now,
  };

  if (writable.backend === "postgres") {
    const err = await saveActiveBookPointerPostgres(pointer);
    if (err) return { error: err };
    if (vmbJsonFallbackAllowed()) {
      const all = await listActiveBookPointersJson();
      const index = all.findIndex((p) => p.salonId === salonId);
      if (index >= 0) all[index] = pointer;
      else all.unshift(pointer);
      await writeJsonArray(getVmbActiveBookFile(), all);
    }
    return { pointer };
  }

  const all = await listActiveBookPointersJson();
  const index = all.findIndex((p) => p.salonId === salonId);
  if (index >= 0) all[index] = pointer;
  else all.unshift(pointer);

  const err = await writeJsonArray(getVmbActiveBookFile(), all);
  if (err) return { error: err };
  return { pointer };
}

export async function clearActiveBookPointer(
  salonId: string,
): Promise<{ ok: true } | { error: string }> {
  const trimmedSalon = salonId.trim();
  if (!trimmedSalon) return { error: "salonId is required" };

  const writable = await assertVmbWritableBackend();
  if (!writable.ok) return { error: writable.error };

  if (writable.backend === "postgres") {
    const { clearActiveBookPointerPostgres } = await import(
      "@/lib/vmb/active-book-pointer-postgres"
    );
    const err = await clearActiveBookPointerPostgres(trimmedSalon);
    if (err) return { error: err };
    if (vmbJsonFallbackAllowed()) {
      const all = await listActiveBookPointersJson();
      const next = all.filter((p) => p.salonId !== trimmedSalon);
      await writeJsonArray(getVmbActiveBookFile(), next);
    }
    return { ok: true };
  }

  const all = await listActiveBookPointersJson();
  const next = all.filter((p) => p.salonId !== trimmedSalon);
  const err = await writeJsonArray(getVmbActiveBookFile(), next);
  if (err) return { error: err };
  return { ok: true };
}
