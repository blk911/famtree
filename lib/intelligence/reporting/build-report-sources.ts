// lib/intelligence/reporting/build-report-sources.ts

import type { RequiredReport } from "./reporting-types";
import type {
  AcquisitionMethod,
  ReportSource,
  ReportSourcesArtifact,
  ReportType,
} from "./acquisition-types";

const HCPF_NEMT_CONTRACT_URL =
  "https://www.bidscolorado.com/co/portal.nsf/xsp/.ibmmodres/domino/OpenAttachment/co/CBdSols.nsf/FBC001108940F43C87257C400070C2A5/Body/HCPFRFPSM14NEMT.pdf";

const OSA_AUDIT_URL =
  "https://leg.colorado.gov/sites/default/files/documents/audits/2152p_medicaid_non-emergent_medical_transport.pdf";

function reportTypeForKey(reportKey: string, reportName: string): ReportType {
  if (reportKey.includes("audit") || reportName.toLowerCase().includes("audit")) return "audit";
  if (reportKey.includes("dialysis")) return "dialysis_report";
  if (reportKey.includes("complaint")) return "complaint_report";
  if (reportKey.includes("incident")) return "corrective_action";
  if (reportKey.includes("contract") || reportKey.includes("policies")) return "contract_attachment";
  if (reportName.toLowerCase().includes("performance")) return "performance_report";
  if (reportName.toLowerCase().includes("trip log") || reportName.toLowerCase().includes("trip report")) {
    return "other";
  }
  return "other";
}

function acquisitionMethodFor(report: RequiredReport): AcquisitionMethod {
  if (report.status === "reporting_unknown") return "unknown";
  if (report.publicAccess === "public") return "public_download";
  if (report.publicAccess === "open_records") return "state_records_request";
  if (report.publicAccess === "contract_only") return "contract_request";
  if (report.sourceUrl?.includes("bidscolorado.com")) return "public_download";
  return "unknown";
}

function insightValueFor(report: RequiredReport, reportType: ReportType): number {
  if (report.status === "reporting_unknown") return 5;
  let score = 40;
  if (reportType === "performance_report") score = 95;
  if (reportType === "dialysis_report") score = 90;
  if (reportType === "complaint_report") score = 85;
  if (reportType === "audit") score = 80;
  if (reportType === "contract_attachment" && report.sourceUrl === HCPF_NEMT_CONTRACT_URL) score = 70;
  if (report.publicAccess === "public") score += 10;
  if (report.publicAccess === "contract_only") score -= 15;
  return Math.max(0, Math.min(100, score));
}

function defaultAcquisitionStatus(report: RequiredReport, method: AcquisitionMethod): ReportSource["acquisitionStatus"] {
  if (report.status === "reporting_unknown") return "not_started";
  if (method === "public_download" && report.publicAccess === "public") return "acquired";
  if (report.sourceUrl === HCPF_NEMT_CONTRACT_URL) return "acquired";
  if (report.sourceUrl === OSA_AUDIT_URL) return "acquired";
  return "discovered";
}

export function buildReportSourcesFromRequired(
  reports: RequiredReport[],
  generatedAt: string,
): ReportSourcesArtifact {
  const sources: ReportSource[] = reports
    .filter((r) => r.status === "discovered")
    .map((report) => {
      const reportType = reportTypeForKey(report.reportKey, report.reportName);
      const acquisitionMethod = acquisitionMethodFor(report);
      return {
        sourceKey: report.reportKey,
        entityName: report.entityName,
        reportName: report.reportName,
        reportType,
        acquisitionMethod,
        publicAvailable: report.publicAccess === "public" || acquisitionMethod === "public_download",
        acquisitionStatus: defaultAcquisitionStatus(report, acquisitionMethod),
        sourceUrl: report.sourceUrl,
        reportKey: report.reportKey,
        ownershipKey: report.ownershipKey,
        insightValue: insightValueFor(report, reportType),
        notes: report.notes,
      };
    });

  return {
    generatedAt,
    total: sources.length,
    sources: sources.sort((a, b) => b.insightValue - a.insightValue),
  };
}
