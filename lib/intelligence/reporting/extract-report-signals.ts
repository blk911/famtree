// lib/intelligence/reporting/extract-report-signals.ts
// Extract operational metrics and failure signals from acquired reports.

import type {
  AcquiredReport,
  ExtractedMetric,
  ExtractedMetricsArtifact,
  ExtractedFailureSignalsArtifact,
  FailureSignal,
} from "./acquisition-types";

const OSA_AUDIT_URL =
  "https://leg.colorado.gov/sites/default/files/documents/audits/2152p_medicaid_non-emergent_medical_transport.pdf";

const OSA_PRESS_URL =
  "https://leg.colorado.gov/sites/default/files/non-emergent_medical_transportation_press_release_final_9-27-2021.pdf";

const HCPF_NEMT_CONTRACT_URL =
  "https://www.bidscolorado.com/co/portal.nsf/xsp/.ibmmodres/domino/OpenAttachment/co/CBdSols.nsf/FBC001108940F43C87257C400070C2A5/Body/HCPFRFPSM14NEMT.pdf";

/** Nine metro broker counties — Transdev SDE per billing manual. */
export const METRO_BROKER_COUNTIES = [
  "Adams",
  "Arapahoe",
  "Boulder",
  "Broomfield",
  "Denver",
  "Douglas",
  "Jefferson",
  "Larimer",
  "Weld",
];

interface ExtractionResult {
  metrics: ExtractedMetric[];
  signals: FailureSignal[];
}

function extractOsaNemtAudit2021(report: AcquiredReport): ExtractionResult {
  const metrics: ExtractedMetric[] = [
    {
      metricKey: "osa:complaints-unresolved-pct",
      reportId: report.reportId,
      entityName: "Health Solutions by Transdev (IntelliRide)",
      metricName: "Complaints unresolved (audit period)",
      metricValue: "68%",
      category: "complaints",
      sourcePage: "OSA press release / audit summary",
      sourceUrl: OSA_PRESS_URL,
    },
    {
      metricKey: "osa:safety-incidents-unreported",
      reportId: report.reportId,
      entityName: "Health Solutions by Transdev (IntelliRide)",
      metricName: "Health/safety incidents not investigated or reported",
      metricValue: "75",
      category: "complaints",
      sourcePage: "OSA press release",
      sourceUrl: OSA_PRESS_URL,
    },
    {
      metricKey: "osa:noncompliant-claims-paid",
      reportId: report.reportId,
      entityName: "Health Solutions by Transdev (IntelliRide)",
      metricName: "Noncompliant NEMT claims paid",
      metricValue: "$291,600",
      category: "completion",
      sourcePage: "OSA audit report",
      sourceUrl: OSA_AUDIT_URL,
    },
    {
      metricKey: "osa:potentially-noncompliant-claims",
      reportId: report.reportId,
      entityName: "Colorado HCPF",
      metricName: "Potentially noncompliant NEMT claims",
      metricValue: "$5.2 million",
      category: "completion",
      sourcePage: "OSA audit report",
      sourceUrl: OSA_AUDIT_URL,
    },
    {
      metricKey: "osa:mistreatment-unreported",
      reportId: report.reportId,
      entityName: "Colorado HCPF",
      metricName: "Potential mistreatment acts not reported to law enforcement",
      metricValue: "32",
      category: "complaints",
      sourcePage: "OSA press release",
      sourceUrl: OSA_PRESS_URL,
    },
  ];

  const signals: FailureSignal[] = [
    {
      signalKey: "osa:complaint-resolution-failure",
      reportId: report.reportId,
      entityName: "Health Solutions by Transdev (IntelliRide)",
      severity: "critical",
      signalType: "complaint_spike",
      summary: "Audit documented 68% of broker complaints unresolved — complaint volume elevated with systemic resolution failure.",
      sourceUrl: OSA_PRESS_URL,
      appliesToCounties: METRO_BROKER_COUNTIES,
    },
    {
      signalKey: "osa:incident-reporting-gap",
      reportId: report.reportId,
      entityName: "Health Solutions by Transdev (IntelliRide)",
      severity: "critical",
      signalType: "missed_kpi",
      summary: "75 health/safety incidents not investigated or reported to HCPF despite contract incident reporting requirements.",
      sourceUrl: OSA_PRESS_URL,
      appliesToCounties: METRO_BROKER_COUNTIES,
    },
    {
      signalKey: "osa:claims-without-ride-proof",
      reportId: report.reportId,
      entityName: "Health Solutions by Transdev (IntelliRide)",
      severity: "high",
      signalType: "denial_spike",
      summary: "Monthly report / claims audit shows denial activity — $291,600 paid for claims without proof rides occurred.",
      sourceUrl: OSA_AUDIT_URL,
      appliesToCounties: METRO_BROKER_COUNTIES,
    },
    {
      signalKey: "osa:contract-compliance-corrective-action",
      reportId: report.reportId,
      entityName: "Health Solutions by Transdev (IntelliRide)",
      severity: "high",
      signalType: "corrective_action",
      summary: "Corrective action issued — OSA required HCPF ensure contractor meets on-time pickup, call answer, and complaint tracking requirements.",
      sourceUrl: OSA_PRESS_URL,
      appliesToCounties: METRO_BROKER_COUNTIES,
    },
    {
      signalKey: "osa:on-time-pickup-contract-miss",
      reportId: report.reportId,
      entityName: "Health Solutions by Transdev (IntelliRide)",
      severity: "medium",
      signalType: "missed_kpi",
      summary: "Audit found contractor did not ensure on-time pickups per contract — timeliness KPI failure signal.",
      sourceUrl: OSA_PRESS_URL,
      appliesToCounties: METRO_BROKER_COUNTIES,
    },
  ];

  return { metrics, signals };
}

function extractNemtContract(report: AcquiredReport): ExtractionResult {
  const metrics: ExtractedMetric[] = [
    {
      metricKey: "contract:on-time-pickup-target",
      reportId: report.reportId,
      entityName: "Health Solutions by Transdev (IntelliRide)",
      metricName: "On-time pickup within 15 minutes of scheduled time",
      metricValue: "100% (contract baseline)",
      category: "timeliness",
      sourcePage: "HCPF NEMT RFP §5.9.1.1.1.1.1",
      sourceUrl: HCPF_NEMT_CONTRACT_URL,
    },
    {
      metricKey: "contract:call-abandonment-target",
      reportId: report.reportId,
      entityName: "Health Solutions by Transdev (IntelliRide)",
      metricName: "Call abandonment rate",
      metricValue: "< 8% (contract baseline)",
      category: "call_center",
      sourcePage: "HCPF NEMT RFP §5.9.1.1.2.4.1",
      sourceUrl: HCPF_NEMT_CONTRACT_URL,
    },
    {
      metricKey: "contract:complaints-per-1000-trips",
      reportId: report.reportId,
      entityName: "Health Solutions by Transdev (IntelliRide)",
      metricName: "Complaints per 1,000 trips",
      metricValue: "reported monthly (no public threshold)",
      category: "complaints",
      sourcePage: "HCPF NEMT RFP §5.10.2.1.4.1",
      sourceUrl: HCPF_NEMT_CONTRACT_URL,
    },
    {
      metricKey: "contract:trips-denied-by-reason",
      reportId: report.reportId,
      entityName: "Health Solutions by Transdev (IntelliRide)",
      metricName: "Trips denied by reason",
      metricValue: "reported monthly in performance report",
      category: "denials",
      sourcePage: "HCPF NEMT RFP §5.10.2.1.2.3",
      sourceUrl: HCPF_NEMT_CONTRACT_URL,
    },
    {
      metricKey: "contract:missed-dialysis-treatments",
      reportId: report.reportId,
      entityName: "Health Solutions by Transdev (IntelliRide)",
      metricName: "Missed dialysis treatments due to late transport",
      metricValue: "reported monthly in dialysis report",
      category: "dialysis",
      sourcePage: "HCPF NEMT RFP §5.10.2.1.5.3",
      sourceUrl: HCPF_NEMT_CONTRACT_URL,
    },
    {
      metricKey: "contract:provider-no-shows",
      reportId: report.reportId,
      entityName: "Health Solutions by Transdev (IntelliRide)",
      metricName: "Provider no-shows (cancelled at door)",
      metricValue: "reported monthly by county",
      category: "provider_network",
      sourcePage: "HCPF NEMT RFP §5.10.2.1.4.2",
      sourceUrl: HCPF_NEMT_CONTRACT_URL,
    },
  ];

  const signals: FailureSignal[] = [
    {
      signalKey: "contract:monthly-denial-reporting-required",
      reportId: report.reportId,
      entityName: "Health Solutions by Transdev (IntelliRide)",
      severity: "medium",
      signalType: "denial_spike",
      summary:
        "Contract requires monthly reporting of trips denied by reason — acquisition of performance report would expose denial activity.",
      sourceUrl: HCPF_NEMT_CONTRACT_URL,
      appliesToCounties: METRO_BROKER_COUNTIES,
    },
    {
      signalKey: "contract:dialysis-failure-reporting-required",
      reportId: report.reportId,
      entityName: "Health Solutions by Transdev (IntelliRide)",
      severity: "high",
      signalType: "missed_dialysis",
      summary:
        "Dialysis transport failures reported in contract-required monthly dialysis report — missed treatments due to late delivery.",
      sourceUrl: HCPF_NEMT_CONTRACT_URL,
      appliesToCounties: METRO_BROKER_COUNTIES,
    },
  ];

  return { metrics, signals };
}

export function extractSignalsFromAcquiredReport(report: AcquiredReport): ExtractionResult {
  if (report.reportId === "osa:nemt-audit-2021") {
    return extractOsaNemtAudit2021(report);
  }
  if (report.reportId === "contract:hcpf-nemt-rfp") {
    return extractNemtContract(report);
  }
  return { metrics: [], signals: [] };
}

export function buildExtractionArtifacts(
  acquiredReports: AcquiredReport[],
  generatedAt: string,
): { metrics: ExtractedMetricsArtifact; failureSignals: ExtractedFailureSignalsArtifact } {
  const allMetrics: ExtractedMetric[] = [];
  const allSignals: FailureSignal[] = [];

  for (const report of acquiredReports.filter((r) => r.extracted)) {
    const { metrics, signals } = extractSignalsFromAcquiredReport(report);
    allMetrics.push(...metrics);
    allSignals.push(...signals);
  }

  const bySeverity: ExtractedFailureSignalsArtifact["bySeverity"] = {};
  for (const s of allSignals) {
    bySeverity[s.severity] = (bySeverity[s.severity] ?? 0) + 1;
  }

  return {
    metrics: {
      generatedAt,
      total: allMetrics.length,
      metrics: allMetrics,
    },
    failureSignals: {
      generatedAt,
      total: allSignals.length,
      bySeverity,
      signals: allSignals,
    },
  };
}
