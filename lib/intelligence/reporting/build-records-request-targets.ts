// lib/intelligence/reporting/build-records-request-targets.ts

import type { RecordsRequestTarget, RecordsRequestTargetsArtifact, ReportSource } from "./acquisition-types";

const CORA_URL = "https://hcpf.colorado.gov/contact-hcpf";

export function buildRecordsRequestTargets(
  sources: ReportSource[],
  generatedAt: string,
): RecordsRequestTargetsArtifact {
  const targets: RecordsRequestTarget[] = sources
    .filter((s) => s.acquisitionStatus !== "acquired" && s.acquisitionStatus !== "failed")
    .filter((s) => s.insightValue >= 50)
    .map((source) => {
      let requestPath = CORA_URL;
      let accessMethod = source.acquisitionMethod;

      if (source.acquisitionMethod === "contract_request") {
        requestPath = "HCPF program oversight + broker contract data request";
        accessMethod = "contract_request";
      } else if (source.acquisitionMethod === "state_records_request") {
        requestPath = CORA_URL;
        accessMethod = "state_records_request";
      }

      return {
        targetKey: `rrt:${source.sourceKey}`,
        holder: source.entityName,
        reportName: source.reportName,
        sourceKey: source.sourceKey,
        requestPath,
        accessMethod,
        priority: source.insightValue,
        insightValue: source.insightValue,
        expectedReport: source.reportName,
        notes: source.notes,
      };
    })
    .sort((a, b) => b.priority - a.priority);

  return {
    generatedAt,
    total: targets.length,
    targets,
  };
}
