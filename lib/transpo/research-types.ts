// lib/transpo/research-types.ts
// Evidence collection queue — research tasks derived from missing evidence.

export type ResearchTaskStatus = "open" | "in_progress" | "blocked" | "completed" | "ignored";

export type ResearchTaskPriority = "low" | "medium" | "high" | "critical";

export type ResearchTaskCategory =
  | "demand"
  | "capacity"
  | "operations"
  | "quality"
  | "broker"
  | "compliance";

export interface ResearchTask {
  taskId: string;
  countyKey: string;
  county: string;
  state: string;
  evidenceKey: string;
  title: string;
  description: string;
  category: ResearchTaskCategory;
  priority: ResearchTaskPriority;
  status: ResearchTaskStatus;
  sourceHints: string[];
  findings?: string;
  sourceLinks?: string[];
  assignedTo?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EvidenceCollectionQueueArtifact {
  generatedAt: string;
  totalTasks: number;
  tasks: ResearchTask[];
}

export interface CountyResearchSummary {
  countyKey: string;
  county: string;
  state: string;
  openTasks: number;
  completedTasks: number;
  criticalTasks: number;
  highTasks: number;
  progressPercent: number;
}

export interface CountyResearchSummaryArtifact {
  generatedAt: string;
  totalCounties: number;
  counties: CountyResearchSummary[];
}

export interface ResearchTaskStateEntry {
  status?: ResearchTaskStatus;
  findings?: string;
  notes?: string;
  sourceLinks?: string[];
  assignedTo?: string;
  updatedAt?: string;
}

export interface ResearchTaskStateFile {
  tasks: Record<string, ResearchTaskStateEntry>;
}
