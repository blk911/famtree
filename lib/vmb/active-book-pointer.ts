import { getVmbActiveBookFile } from "./paths";
import { readJsonArray, writeJsonArray } from "./runtime-json-store";

export type ActiveBookPointer = {
  salonId: string;
  analysisId: string;
  clientCount: number;
  recordCount: number;
  sourceFileName?: string;
  updatedAt: string;
};

function isPointer(item: unknown): item is ActiveBookPointer {
  return (
    !!item &&
    typeof item === "object" &&
    typeof (item as ActiveBookPointer).salonId === "string" &&
    typeof (item as ActiveBookPointer).analysisId === "string"
  );
}

export async function listActiveBookPointers(): Promise<ActiveBookPointer[]> {
  return readJsonArray(getVmbActiveBookFile(), isPointer);
}

export async function getActiveBookPointer(
  salonId: string,
): Promise<ActiveBookPointer | undefined> {
  const id = salonId.trim();
  if (!id) return undefined;
  const all = await listActiveBookPointers();
  return all.find((p) => p.salonId === id);
}

export type SetActiveBookPointerInput = {
  salonId: string;
  analysisId: string;
  clientCount: number;
  recordCount: number;
  sourceFileName?: string;
};

export async function setActiveBookPointer(
  input: SetActiveBookPointerInput,
): Promise<{ pointer: ActiveBookPointer } | { error: string }> {
  const salonId = input.salonId.trim();
  const analysisId = input.analysisId.trim();
  if (!salonId || !analysisId) return { error: "salonId and analysisId are required" };

  const now = new Date().toISOString();
  const pointer: ActiveBookPointer = {
    salonId,
    analysisId,
    clientCount: Math.max(0, input.clientCount),
    recordCount: Math.max(0, input.recordCount),
    sourceFileName: input.sourceFileName?.trim() || undefined,
    updatedAt: now,
  };

  const all = await listActiveBookPointers();
  const index = all.findIndex((p) => p.salonId === salonId);
  if (index >= 0) {
    all[index] = pointer;
  } else {
    all.unshift(pointer);
  }

  const err = await writeJsonArray(getVmbActiveBookFile(), all);
  if (err) return { error: err };
  return { pointer };
}
