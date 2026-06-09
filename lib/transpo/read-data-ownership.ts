// lib/transpo/read-data-ownership.ts

import { readFile } from "fs/promises";
import type {
  ColoradoNemtWorkflowArtifact,
  DataAccessPathsArtifact,
  DataOwnershipRegistryArtifact,
  HighValueDataTargetsArtifact,
} from "./data-ownership-types";
import {
  COLORADO_NEMT_WORKFLOW_ARTIFACT_PATH,
  DATA_ACCESS_PATHS_ARTIFACT_PATH,
  DATA_OWNERSHIP_REGISTRY_ARTIFACT_PATH,
  HIGH_VALUE_DATA_TARGETS_ARTIFACT_PATH,
} from "./paths";

async function readJson<T>(path: string): Promise<T | null> {
  try {
    const raw = await readFile(path, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function readDataOwnershipRegistry(): Promise<DataOwnershipRegistryArtifact | null> {
  return readJson<DataOwnershipRegistryArtifact>(DATA_OWNERSHIP_REGISTRY_ARTIFACT_PATH);
}

export async function readColoradoNemtWorkflow(): Promise<ColoradoNemtWorkflowArtifact | null> {
  return readJson<ColoradoNemtWorkflowArtifact>(COLORADO_NEMT_WORKFLOW_ARTIFACT_PATH);
}

export async function readDataAccessPaths(): Promise<DataAccessPathsArtifact | null> {
  return readJson<DataAccessPathsArtifact>(DATA_ACCESS_PATHS_ARTIFACT_PATH);
}

export async function readHighValueDataTargets(): Promise<HighValueDataTargetsArtifact | null> {
  return readJson<HighValueDataTargetsArtifact>(HIGH_VALUE_DATA_TARGETS_ARTIFACT_PATH);
}
