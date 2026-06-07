// lib/operators/sources/sola/sola-review-state-store.ts

import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import type { SolaReviewState, SolaReviewStateMap, SolaReviewStatus } from "./types";

export const SOLA_REVIEW_STATES_PATH = path.join(
  process.cwd(),
  "runtime-data",
  "sola",
  "sola-review-states.json",
);

const REVIEWED_STATUSES = new Set<SolaReviewStatus>([
  "valid",
  "bad_data",
  "duplicate",
  "do_not_contact",
  "priority",
]);

function isReviewedStatus(
  status: SolaReviewStatus,
): status is SolaReviewState["reviewStatus"] {
  return REVIEWED_STATUSES.has(status);
}

function isReviewState(value: unknown): value is SolaReviewState {
  if (!value || typeof value !== "object") return false;
  const row = value as SolaReviewState;
  return (
    typeof row.candidateKey === "string" &&
    typeof row.reviewStatus === "string" &&
    isReviewedStatus(row.reviewStatus as SolaReviewStatus) &&
    typeof row.notes === "string" &&
    typeof row.reviewedAt === "string" &&
    typeof row.reviewedBy === "string"
  );
}

export async function readSolaReviewStates(
  filePath: string = SOLA_REVIEW_STATES_PATH,
): Promise<SolaReviewStateMap> {
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    const out: SolaReviewStateMap = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (!isReviewState(value)) continue;
      out[key] = value;
    }
    return out;
  } catch {
    return {};
  }
}

export async function writeSolaReviewStates(
  states: SolaReviewStateMap,
  filePath: string = SOLA_REVIEW_STATES_PATH,
): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(states, null, 2)}\n`, "utf8");
}

export async function upsertSolaReviewState(input: {
  candidateKey: string;
  reviewStatus: SolaReviewStatus;
  notes?: string;
  reviewedBy: string;
  filePath?: string;
}): Promise<{ states: SolaReviewStateMap; state: SolaReviewState | null }> {
  const filePath = input.filePath ?? SOLA_REVIEW_STATES_PATH;
  const states = await readSolaReviewStates(filePath);
  const notes = (input.notes ?? states[input.candidateKey]?.notes ?? "").trim();

  if (input.reviewStatus === "unreviewed") {
    delete states[input.candidateKey];
    await writeSolaReviewStates(states, filePath);
    return { states, state: null };
  }

  if (!isReviewedStatus(input.reviewStatus)) {
    throw new Error(`Invalid review status: ${input.reviewStatus}`);
  }

  const state: SolaReviewState = {
    candidateKey: input.candidateKey,
    reviewStatus: input.reviewStatus,
    notes,
    reviewedAt: new Date().toISOString(),
    reviewedBy: input.reviewedBy,
  };

  states[input.candidateKey] = state;
  await writeSolaReviewStates(states, filePath);
  return { states, state };
}
