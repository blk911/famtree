// lib/transpo/build-research-queue.ts

import { mkdir, readFile, writeFile } from "fs/promises";
import type { CountyEvidenceDossiersArtifact } from "./evidence-types";
import {
  COUNTY_EVIDENCE_DOSSIERS_ARTIFACT_PATH,
  COUNTY_RESEARCH_SUMMARY_ARTIFACT_PATH,
  EVIDENCE_COLLECTION_QUEUE_ARTIFACT_PATH,
  RESEARCH_TASK_STATE_PATH,
  TRANSPO_DATA_DIR,
} from "./paths";
import {
  descriptionForEvidence,
  makeResearchTaskId,
  priorityForEvidenceKey,
  sourceHintsForEvidenceKey,
  titleForEvidenceKey,
} from "./research-task-config";
import type {
  CountyResearchSummary,
  CountyResearchSummaryArtifact,
  EvidenceCollectionQueueArtifact,
  ResearchTask,
  ResearchTaskStateFile,
} from "./research-types";

async function loadJson<T>(path: string): Promise<T | null> {
  try {
    const raw = await readFile(path, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function buildTaskFromMissing(
  countyKey: string,
  county: string,
  state: string,
  evidenceKey: string,
  label: string,
  category: ResearchTask["category"],
  generatedAt: string,
): ResearchTask {
  const taskId = makeResearchTaskId(countyKey, evidenceKey);
  return {
    taskId,
    countyKey,
    county,
    state,
    evidenceKey,
    title: titleForEvidenceKey(evidenceKey, label),
    description: descriptionForEvidence(evidenceKey, label, county, state),
    category,
    priority: priorityForEvidenceKey(evidenceKey),
    status: "open",
    sourceHints: sourceHintsForEvidenceKey(evidenceKey),
    createdAt: generatedAt,
    updatedAt: generatedAt,
  };
}

function mergeTaskWithState(
  task: ResearchTask,
  stateEntry: ResearchTaskStateFile["tasks"][string] | undefined,
): ResearchTask {
  if (!stateEntry) return task;
  return {
    ...task,
    status: stateEntry.status ?? task.status,
    findings: stateEntry.findings ?? task.findings,
    notes: stateEntry.notes ?? task.notes,
    sourceLinks: stateEntry.sourceLinks ?? task.sourceLinks,
    assignedTo: stateEntry.assignedTo ?? task.assignedTo,
    updatedAt: stateEntry.updatedAt ?? task.updatedAt,
  };
}

export function mergeResearchTasksWithState(
  tasks: ResearchTask[],
  stateFile: ResearchTaskStateFile | null,
): ResearchTask[] {
  if (!stateFile?.tasks) return tasks;
  return tasks.map((task) => mergeTaskWithState(task, stateFile.tasks[task.taskId]));
}

export function buildCountyResearchSummaries(
  tasks: ResearchTask[],
  generatedAt: string,
): CountyResearchSummaryArtifact {
  const byCounty = new Map<string, ResearchTask[]>();
  for (const task of tasks) {
    const list = byCounty.get(task.countyKey) ?? [];
    list.push(task);
    byCounty.set(task.countyKey, list);
  }

  const counties: CountyResearchSummary[] = [];

  for (const [countyKey, countyTasks] of Array.from(byCounty.entries())) {
    const sample = countyTasks[0];
    const completed = countyTasks.filter(
      (t) => t.status === "completed" || t.status === "ignored",
    ).length;
    const open = countyTasks.filter(
      (t) => t.status === "open" || t.status === "in_progress" || t.status === "blocked",
    ).length;
    const critical = countyTasks.filter(
      (t) => t.priority === "critical" && t.status !== "completed" && t.status !== "ignored",
    ).length;
    const high = countyTasks.filter(
      (t) => t.priority === "high" && t.status !== "completed" && t.status !== "ignored",
    ).length;
    const progressPercent =
      countyTasks.length > 0 ? Math.round((completed / countyTasks.length) * 100) : 0;

    counties.push({
      countyKey,
      county: sample.county,
      state: sample.state,
      openTasks: open,
      completedTasks: completed,
      criticalTasks: critical,
      highTasks: high,
      progressPercent,
    });
  }

  counties.sort((a, b) => {
    if (a.state !== b.state) return a.state.localeCompare(b.state);
    return a.county.localeCompare(b.county);
  });

  return {
    generatedAt,
    totalCounties: counties.length,
    counties,
  };
}

export async function buildResearchQueue(): Promise<{
  queue: EvidenceCollectionQueueArtifact;
  summary: CountyResearchSummaryArtifact;
}> {
  const evidenceArtifact = await loadJson<CountyEvidenceDossiersArtifact>(
    COUNTY_EVIDENCE_DOSSIERS_ARTIFACT_PATH,
  );
  if (!evidenceArtifact) {
    throw new Error("County evidence dossiers missing — run build:transpo:evidence first");
  }

  let stateFile = await loadJson<ResearchTaskStateFile>(RESEARCH_TASK_STATE_PATH);
  if (!stateFile) {
    stateFile = { tasks: {} };
    await mkdir(TRANSPO_DATA_DIR, { recursive: true });
    await writeFile(RESEARCH_TASK_STATE_PATH, `${JSON.stringify(stateFile, null, 2)}\n`, "utf8");
  }

  const generatedAt = new Date().toISOString();
  const baseTasks: ResearchTask[] = [];

  for (const dossier of evidenceArtifact.dossiers) {
    for (const item of dossier.missing) {
      baseTasks.push(
        buildTaskFromMissing(
          dossier.countyKey,
          dossier.county,
          dossier.state,
          item.key,
          item.label,
          item.category,
          generatedAt,
        ),
      );
    }
  }

  baseTasks.sort((a, b) => {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    if (a.county !== b.county) return a.county.localeCompare(b.county);
    return a.title.localeCompare(b.title);
  });

  const queue: EvidenceCollectionQueueArtifact = {
    generatedAt,
    totalTasks: baseTasks.length,
    tasks: baseTasks,
  };

  await mkdir(TRANSPO_DATA_DIR, { recursive: true });
  await writeFile(
    EVIDENCE_COLLECTION_QUEUE_ARTIFACT_PATH,
    `${JSON.stringify(queue, null, 2)}\n`,
    "utf8",
  );

  const mergedTasks = mergeResearchTasksWithState(baseTasks, stateFile);
  const summary = buildCountyResearchSummaries(mergedTasks, generatedAt);
  await writeFile(
    COUNTY_RESEARCH_SUMMARY_ARTIFACT_PATH,
    `${JSON.stringify(summary, null, 2)}\n`,
    "utf8",
  );

  return { queue, summary };
}
