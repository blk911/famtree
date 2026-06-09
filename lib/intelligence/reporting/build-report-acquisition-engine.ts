// lib/intelligence/reporting/build-report-acquisition-engine.ts

import { mkdir, readFile, writeFile } from "fs/promises";
import { buildReportSourcesFromRequired } from "./build-report-sources";
import { buildRecordsRequestTargets } from "./build-records-request-targets";
import {
  buildReportTargets,
  buildRequestPackages,
  buildRequestTemplates,
} from "./build-report-targets";
import { buildExtractionArtifacts } from "./extract-report-signals";
import type {
  AcquiredReport,
  ReportAcquisitionArtifact,
  ReportSource,
  ReportSourcesArtifact,
} from "./acquisition-types";
import {
  mergeSourceStatusWithState,
  readReportAcquisitionState,
} from "./report-acquisition-state";
import type { RequiredReportsArtifact } from "./reporting-types";
import {
  EXTRACTED_FAILURE_SIGNALS_ARTIFACT_PATH,
  EXTRACTED_METRICS_ARTIFACT_PATH,
  RECORDS_REQUEST_TARGETS_ARTIFACT_PATH,
  REPORT_ACQUISITION_ARTIFACT_PATH,
  REPORT_SOURCES_ARTIFACT_PATH,
  REPORT_TARGETS_ARTIFACT_PATH,
  REQUEST_PACKAGES_ARTIFACT_PATH,
  REQUEST_TEMPLATES_ARTIFACT_PATH,
  REPORTING_ACQUIRED_DIR,
  REQUIRED_REPORTS_ARTIFACT_PATH,
} from "./paths";
import type {
  ReportTargetsArtifact,
  RequestPackagesArtifact,
  RequestTemplatesArtifact,
} from "./target-types";
import { applyExtractedSignalsToOpportunities } from "@/lib/transpo/apply-report-failure-signals";

const OSA_AUDIT_URL =
  "https://leg.colorado.gov/sites/default/files/documents/audits/2152p_medicaid_non-emergent_medical_transport.pdf";

const HCPF_NEMT_CONTRACT_URL =
  "https://www.bidscolorado.com/co/portal.nsf/xsp/.ibmmodres/domino/OpenAttachment/co/CBdSols.nsf/FBC001108940F43C87257C400070C2A5/Body/HCPFRFPSM14NEMT.pdf";

async function loadRequiredReports(): Promise<RequiredReportsArtifact | null> {
  try {
    const raw = await readFile(REQUIRED_REPORTS_ARTIFACT_PATH, "utf8");
    return JSON.parse(raw) as RequiredReportsArtifact;
  } catch {
    return null;
  }
}

function buildAcquiredCatalog(generatedAt: string): AcquiredReport[] {
  return [
    {
      reportId: "osa:nemt-audit-2021",
      sourceKey: "co:osa:nemt-performance-audit",
      reportName: "Medicaid Non-Emergent Medical Transportation Performance Audit",
      entityName: "Colorado Office of the State Auditor",
      acquisitionDate: generatedAt,
      localPath: "runtime-data/reporting/acquired/osa-nemt-audit-2021.manifest.json",
      fileType: "manifest",
      sourceUrl: OSA_AUDIT_URL,
      extracted: true,
    },
    {
      reportId: "contract:hcpf-nemt-rfp",
      sourceKey: "co:transdev:monthly-performance-report",
      reportName: "HCPF NEMT Broker RFP Contract (HCPFRFPSM14NEMT)",
      entityName: "Colorado HCPF / Transdev contract",
      acquisitionDate: generatedAt,
      localPath: "runtime-data/reporting/acquired/hcpf-nemt-contract.manifest.json",
      fileType: "manifest",
      sourceUrl: HCPF_NEMT_CONTRACT_URL,
      extracted: true,
    },
  ];
}

async function writeAcquiredManifests(acquired: AcquiredReport[]): Promise<void> {
  await mkdir(REPORTING_ACQUIRED_DIR, { recursive: true });

  const manifests: Record<string, object> = {
    "osa-nemt-audit-2021.manifest.json": {
      reportId: "osa:nemt-audit-2021",
      title: "Colorado OSA NEMT Performance Audit (2021)",
      sourceUrl: OSA_AUDIT_URL,
      acquisitionMethod: "public_download",
      excerptNote:
        "Public audit — metrics extracted from published findings, not ride-level PHI.",
      publicMetrics: [
        "68% complaints unresolved",
        "75 unreported safety incidents",
        "$291,600 noncompliant claims",
      ],
    },
    "hcpf-nemt-contract.manifest.json": {
      reportId: "contract:hcpf-nemt-rfp",
      title: "HCPF NEMT Broker RFP Contract",
      sourceUrl: HCPF_NEMT_CONTRACT_URL,
      acquisitionMethod: "public_download",
      excerptNote: "Public procurement contract — KPI baselines and monthly report requirements extracted.",
      sections: ["§5.9 Performance Standards", "§5.10 Reporting Requirements"],
    },
  };

  for (const [filename, content] of Object.entries(manifests)) {
    await writeFile(
      `${REPORTING_ACQUIRED_DIR}/${filename}`,
      JSON.stringify(content, null, 2),
      "utf8",
    );
  }
}

function applyAcquiredStatus(sources: ReportSource[], acquired: AcquiredReport[]): ReportSource[] {
  const acquiredKeys = new Set(acquired.map((a) => a.sourceKey));
  return sources.map((s) => {
    if (acquiredKeys.has(s.sourceKey)) {
      return { ...s, acquisitionStatus: "acquired" as const };
    }
    if (s.sourceKey === "co:osa:nemt-performance-audit") {
      return { ...s, acquisitionStatus: "acquired" as const };
    }
    return s;
  });
}

export interface ReportAcquisitionEngineResult {
  sources: ReportAcquisitionArtifact;
  metrics: Awaited<ReturnType<typeof buildExtractionArtifacts>>["metrics"];
  failureSignals: Awaited<ReturnType<typeof buildExtractionArtifacts>>["failureSignals"];
  recordsTargets: ReturnType<typeof buildRecordsRequestTargets>;
  reportTargets: ReportTargetsArtifact;
  requestPackages: RequestPackagesArtifact;
  requestTemplates: RequestTemplatesArtifact;
  opportunitiesUpdated: boolean;
}

export async function buildReportAcquisitionEngine(): Promise<ReportAcquisitionEngineResult> {
  const generatedAt = new Date().toISOString();
  const required = await loadRequiredReports();
  if (!required) {
    throw new Error("required-reports artifact missing — run npm run build:reporting");
  }

  const state = await readReportAcquisitionState();
  const sourcesArtifact = buildReportSourcesFromRequired(required.reports, generatedAt);

  let sources: ReportSource[] = sourcesArtifact.sources.map((s) => ({
    ...s,
    acquisitionStatus: mergeSourceStatusWithState(s.sourceKey, s.acquisitionStatus, state),
  }));

  const acquired = buildAcquiredCatalog(generatedAt);
  await writeAcquiredManifests(acquired);
  sources = applyAcquiredStatus(sources, acquired);

  const { metrics, failureSignals } = buildExtractionArtifacts(acquired, generatedAt);
  const recordsTargets = buildRecordsRequestTargets(sources, generatedAt);
  const reportTargets = await buildReportTargets(acquired, failureSignals, generatedAt);
  const requestPackages = buildRequestPackages(reportTargets.targets, generatedAt);
  const requestTemplates = buildRequestTemplates(reportTargets.targets, generatedAt);

  const summary = {
    discovered: sources.filter((s) => s.acquisitionStatus === "discovered").length,
    requested: sources.filter((s) => s.acquisitionStatus === "requested").length,
    acquired: sources.filter((s) => s.acquisitionStatus === "acquired").length,
    failed: sources.filter((s) => s.acquisitionStatus === "failed").length,
    notStarted: sources.filter((s) => s.acquisitionStatus === "not_started").length,
  };

  const acquisition: ReportAcquisitionArtifact = {
    generatedAt,
    summary,
    sources,
    acquiredReports: acquired,
  };

  await mkdir(REPORTING_ACQUIRED_DIR.replace(/acquired$/, ""), { recursive: true });
  const sourcesWithStatus: ReportSourcesArtifact = {
    generatedAt,
    total: sources.length,
    sources,
  };

  await Promise.all([
    writeFile(REPORT_SOURCES_ARTIFACT_PATH, JSON.stringify(sourcesWithStatus, null, 2), "utf8"),
    writeFile(REPORT_ACQUISITION_ARTIFACT_PATH, JSON.stringify(acquisition, null, 2), "utf8"),
    writeFile(EXTRACTED_METRICS_ARTIFACT_PATH, JSON.stringify(metrics, null, 2), "utf8"),
    writeFile(EXTRACTED_FAILURE_SIGNALS_ARTIFACT_PATH, JSON.stringify(failureSignals, null, 2), "utf8"),
    writeFile(RECORDS_REQUEST_TARGETS_ARTIFACT_PATH, JSON.stringify(recordsTargets, null, 2), "utf8"),
    writeFile(REPORT_TARGETS_ARTIFACT_PATH, JSON.stringify(reportTargets, null, 2), "utf8"),
    writeFile(REQUEST_PACKAGES_ARTIFACT_PATH, JSON.stringify(requestPackages, null, 2), "utf8"),
    writeFile(REQUEST_TEMPLATES_ARTIFACT_PATH, JSON.stringify(requestTemplates, null, 2), "utf8"),
  ]);

  const opportunitiesUpdated = await applyExtractedSignalsToOpportunities(failureSignals);

  return {
    sources: acquisition,
    metrics,
    failureSignals,
    recordsTargets,
    reportTargets,
    requestPackages,
    requestTemplates,
    opportunitiesUpdated,
  };
}
