// lib/transpo/read-research-queue.ts

import { readFile, writeFile } from "fs/promises";
import { mergeResearchTasksWithState, buildCountyResearchSummaries } from "./build-research-queue";
import {
  COUNTY_RESEARCH_SUMMARY_ARTIFACT_PATH,
  EVIDENCE_COLLECTION_QUEUE_ARTIFACT_PATH,
  RESEARCH_TASK_STATE_PATH,
} from "./paths";
import type {
  CountyResearchSummaryArtifact,
  EvidenceCollectionQueueArtifact,
  ResearchTask,
  ResearchTaskStateEntry,
  ResearchTaskStateFile,
} from "./research-types";

export async function readEvidenceCollectionQueueArtifact(): Promise<EvidenceCollectionQueueArtifact | null> {
  try {
    const raw = await readFile(EVIDENCE_COLLECTION_QUEUE_ARTIFACT_PATH, "utf8");
    return JSON.parse(raw) as EvidenceCollectionQueueArtifact;
  } catch {
    return null;
  }
}

export async function readCountyResearchSummaryArtifact(): Promise<CountyResearchSummaryArtifact | null> {
  try {
    const raw = await readFile(COUNTY_RESEARCH_SUMMARY_ARTIFACT_PATH, "utf8");
    return JSON.parse(raw) as CountyResearchSummaryArtifact;
  } catch {
    return null;
  }
}

export async function readResearchTaskState(): Promise<ResearchTaskStateFile> {
  try {
    const raw = await readFile(RESEARCH_TASK_STATE_PATH, "utf8");
    return JSON.parse(raw) as ResearchTaskStateFile;
  } catch {
    return { tasks: {} };
  }
}

export async function readMergedResearchTasks(): Promise<ResearchTask[]> {
  const queue = await readEvidenceCollectionQueueArtifact();
  if (!queue) return [];
  const state = await readResearchTaskState();
  return mergeResearchTasksWithState(queue.tasks, state);
}

export async function updateResearchTaskState(
  taskId: string,
  patch: ResearchTaskStateEntry,
): Promise<ResearchTaskStateFile> {
  const state = await readResearchTaskState();
  const existing = state.tasks[taskId] ?? {};
  state.tasks[taskId] = {
    ...existing,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  await writeFile(RESEARCH_TASK_STATE_PATH, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  return state;
}

export async function refreshCountyResearchSummaryFromState(): Promise<CountyResearchSummaryArtifact | null> {
  const tasks = await readMergedResearchTasks();
  if (tasks.length === 0) return null;
  const summary = buildCountyResearchSummaries(tasks, new Date().toISOString());
  await writeFile(
    COUNTY_RESEARCH_SUMMARY_ARTIFACT_PATH,
    `${JSON.stringify(summary, null, 2)}\n`,
    "utf8",
  );
  return summary;
}
