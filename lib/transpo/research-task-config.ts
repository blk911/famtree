// lib/transpo/research-task-config.ts
// Source hints, titles, and priority rules for evidence collection tasks.

import type { ResearchTaskPriority } from "./research-types";

export const EVIDENCE_TASK_PRIORITY: Record<string, ResearchTaskPriority> = {
  vehicle_count: "critical",
  driver_count: "critical",
  wheelchair_vehicle_count: "critical",
  monthly_trip_volume: "critical",
  missed_trip_count: "high",
  denied_trip_count: "high",
  hospital_discharge_delays: "high",
  broker_overflow_counts: "high",
  complaint_volume: "medium",
  ride_satisfaction: "medium",
  average_wait_time: "medium",
};

export const EVIDENCE_SOURCE_HINTS: Record<string, string[]> = {
  vehicle_count: [
    "provider websites",
    "FMCSA SAFER",
    "DOT records",
    "provider interviews",
  ],
  driver_count: ["provider websites", "job postings", "LinkedIn"],
  wheelchair_vehicle_count: [
    "provider fleet pages",
    "Medicaid provider documentation",
  ],
  stretcher_vehicle_count: [
    "provider fleet pages",
    "Medicaid provider documentation",
  ],
  monthly_trip_volume: [
    "broker reports",
    "provider interviews",
    "state utilization data",
  ],
  completed_trip_count: ["broker reports", "provider interviews"],
  denied_trip_count: ["broker reports", "provider interviews", "complaint logs"],
  cancelled_trip_count: ["broker reports", "provider interviews"],
  missed_trip_count: [
    "broker reports",
    "county meeting minutes",
    "provider interviews",
  ],
  hospital_discharge_delays: [
    "hospital case management",
    "board minutes",
    "county health reports",
  ],
  broker_overflow_counts: [
    "provider recruiting notices",
    "broker procurement notices",
    "state provider recruitment",
  ],
  provider_recruiting_activity: [
    "job postings",
    "provider recruiting notices",
    "LinkedIn",
  ],
  open_driver_positions: ["job postings", "Indeed", "provider websites"],
  complaint_volume: ["state complaints", "audits", "public records"],
  ride_satisfaction: ["surveys", "provider interviews", "broker quality reports"],
  average_wait_time: ["broker reports", "provider interviews", "ride logs"],
};

const TASK_TITLES: Record<string, string> = {
  vehicle_count: "Determine total vehicle count",
  driver_count: "Determine driver count",
  wheelchair_vehicle_count: "Determine wheelchair fleet size",
  stretcher_vehicle_count: "Determine stretcher vehicle count",
  monthly_trip_volume: "Determine monthly trip volume",
  completed_trip_count: "Determine completed trip count",
  denied_trip_count: "Determine denied trip count",
  cancelled_trip_count: "Determine cancelled trip count",
  missed_trip_count: "Determine missed trip count",
  hospital_discharge_delays: "Document hospital discharge delays",
  broker_overflow_counts: "Document broker overflow counts",
  provider_recruiting_activity: "Track provider recruiting activity",
  open_driver_positions: "Identify open driver positions",
  complaint_volume: "Determine complaint volume",
  ride_satisfaction: "Measure ride satisfaction",
  average_wait_time: "Determine average wait time",
};

export function priorityForEvidenceKey(evidenceKey: string): ResearchTaskPriority {
  return EVIDENCE_TASK_PRIORITY[evidenceKey] ?? "low";
}

export function sourceHintsForEvidenceKey(evidenceKey: string): string[] {
  return (
    EVIDENCE_SOURCE_HINTS[evidenceKey] ?? [
      "provider websites",
      "public records",
      "county meeting minutes",
    ]
  );
}

export function titleForEvidenceKey(evidenceKey: string, label: string): string {
  return TASK_TITLES[evidenceKey] ?? `Research: ${label}`;
}

export function descriptionForEvidence(
  evidenceKey: string,
  label: string,
  county: string,
  state: string,
): string {
  const countyLabel = `${county} County, ${state}`;
  const descriptions: Record<string, string> = {
    vehicle_count: `Identify total vehicles serving ${countyLabel} NEMT market.`,
    driver_count: `Identify active drivers serving ${countyLabel}.`,
    wheelchair_vehicle_count: `Identify wheelchair-capable vehicles serving ${countyLabel}.`,
    stretcher_vehicle_count: `Identify stretcher-capable vehicles serving ${countyLabel}.`,
    monthly_trip_volume: `Estimate monthly NEMT trip volume for ${countyLabel}.`,
    missed_trip_count: `Document missed trip counts for ${countyLabel}.`,
    denied_trip_count: `Document ride denial counts for ${countyLabel}.`,
    hospital_discharge_delays: `Document hospital discharge transport delays affecting ${countyLabel}.`,
    broker_overflow_counts: `Document broker overflow and capacity shortfalls in ${countyLabel}.`,
    complaint_volume: `Determine NEMT complaint volume for ${countyLabel}.`,
  };
  return (
    descriptions[evidenceKey] ??
    `Collect missing evidence for ${label.toLowerCase()} in ${countyLabel}.`
  );
}

export function makeResearchTaskId(
  countyKey: string,
  evidenceKey: string,
): string {
  return `transpo:${countyKey}:${evidenceKey}`;
}
