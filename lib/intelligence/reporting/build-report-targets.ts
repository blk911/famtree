// lib/intelligence/reporting/build-report-targets.ts

import type { AcquiredReport, ExtractedFailureSignalsArtifact } from "./acquisition-types";
import { mergeTargetStatusWithState, readReportTargetState } from "./report-target-state";
import type {
  AcquisitionWorkflowStage,
  ReportTarget,
  ReportTargetStatus,
  ReportTargetsArtifact,
  RequestPackage,
  RequestPackagesArtifact,
  RequestTemplate,
  RequestTemplatesArtifact,
} from "./target-types";

const CORA_URL = "https://hcpf.colorado.gov/contact-hcpf";
const HCPF_NEMT_CONTRACT_URL =
  "https://www.bidscolorado.com/co/portal.nsf/xsp/.ibmmodres/domino/OpenAttachment/co/CBdSols.nsf/FBC001108940F43C87257C400070C2A5/Body/HCPFRFPSM14NEMT.pdf";
const OSA_AUDIT_URL =
  "https://leg.colorado.gov/sites/default/files/documents/audits/2152p_medicaid_non-emergent_medical_transport.pdf";

interface TargetSeed {
  targetKey: string;
  sourceKey: string;
  reportName: string;
  holder: string;
  reportCategory: ReportTarget["reportCategory"];
  priority: number;
  expectedInsightValue: number;
  expectedInsights: string[];
  acquisitionMethod: ReportTarget["acquisitionMethod"];
  defaultStatus: ReportTargetStatus;
  sourceUrl?: string;
  notes?: string[];
}

const OPERATIONAL_TARGETS: TargetSeed[] = [
  {
    targetKey: "target:monthly-performance-report",
    sourceKey: "co:transdev:monthly-performance-report",
    reportName: "Monthly Performance Report",
    holder: "Colorado HCPF (NEMT program oversight)",
    reportCategory: "performance_report",
    priority: 95,
    expectedInsightValue: 100,
    expectedInsights: [
      "Trip denials by reason",
      "Provider no-shows",
      "Trip completion rates",
      "Complaint counts per 1,000 trips",
      "On-time pickup %",
      "Call abandonment %",
    ],
    acquisitionMethod: "cora",
    defaultStatus: "request_ready",
    sourceUrl: HCPF_NEMT_CONTRACT_URL,
    notes: [
      "Contract §5.10.2 — broker submits within 10 business days after month end.",
      "Primary path to live denial counts and operational failure metrics.",
    ],
  },
  {
    targetKey: "target:monthly-dialysis-report",
    sourceKey: "co:transdev:dialysis-report",
    reportName: "Monthly Dialysis Report",
    holder: "Colorado HCPF (NEMT program oversight)",
    reportCategory: "dialysis_report",
    priority: 90,
    expectedInsightValue: 95,
    expectedInsights: [
      "Missed dialysis treatments due to late transport",
      "Late delivery bands",
      "Dialysis provider no-shows",
      "County-level dialysis transport failures",
    ],
    acquisitionMethod: "cora",
    defaultStatus: "request_ready",
    sourceUrl: HCPF_NEMT_CONTRACT_URL,
    notes: ["Contract §5.10.2.1.5 — embedded in Monthly Performance Report."],
  },
  {
    targetKey: "target:complaint-investigation-summaries",
    sourceKey: "co:transdev:complaint-report",
    reportName: "Complaint Investigation Summaries",
    holder: "Health Solutions by Transdev (IntelliRide) via HCPF",
    reportCategory: "complaint_summary",
    priority: 85,
    expectedInsightValue: 90,
    expectedInsights: [
      "Complaint volume by category",
      "Investigation outcomes",
      "Unresolved complaint backlog",
      "Repeat complaint patterns",
    ],
    acquisitionMethod: "cora",
    defaultStatus: "request_ready",
    sourceUrl: HCPF_NEMT_CONTRACT_URL,
    notes: ["Contract §5.10.2.1.4 — monthly complaint summary within performance report."],
  },
  {
    targetKey: "target:nemt-complaint-intake-records",
    sourceKey: "co:nemt-complaints:member-feedback-intake",
    reportName: "NEMT Member Feedback/Complaint Intake Records",
    holder: "HCPF NEMT Member Feedback / Complaint Program",
    reportCategory: "complaint_summary",
    priority: 85,
    expectedInsightValue: 90,
    expectedInsights: [
      "No-show complaints",
      "Scheduling failures",
      "Driver safety complaints",
      "Aggregate complaint volume by county",
    ],
    acquisitionMethod: "cora",
    defaultStatus: "request_ready",
    sourceUrl: "https://hcpfccc.my.salesforce-sites.com/NEMTWebform",
    notes: ["Public webform — aggregate counts not published; CORA for summary statistics."],
  },
  {
    targetKey: "target:corrective-action-plans",
    sourceKey: "co:transdev:incident-report",
    reportName: "Corrective Action Plans",
    holder: "Colorado HCPF (contract oversight)",
    reportCategory: "corrective_action",
    priority: 85,
    expectedInsightValue: 85,
    expectedInsights: [
      "Issued corrective actions",
      "Remediation timelines",
      "Repeat KPI failures",
      "Provider adequacy remediation",
    ],
    acquisitionMethod: "cora",
    defaultStatus: "identified",
    sourceUrl: HCPF_NEMT_CONTRACT_URL,
    notes: ["OSA 2021 audit required corrective action — follow-up reports not public."],
  },
  {
    targetKey: "target:provider-adequacy-reviews",
    sourceKey: "co:transdev:monthly-performance-report",
    reportName: "Provider Adequacy Reviews",
    holder: "Colorado HCPF (NEMT program oversight)",
    reportCategory: "provider_adequacy",
    priority: 80,
    expectedInsightValue: 80,
    expectedInsights: [
      "Provider network gaps by county",
      "No provider available denials",
      "Provider cancellation rates",
      "Wheelchair/ambulance capacity shortfalls",
    ],
    acquisitionMethod: "cora",
    defaultStatus: "identified",
    sourceUrl: HCPF_NEMT_CONTRACT_URL,
    notes: ["Contract §5.10.2.1.2 — provider adequacy section of monthly performance report."],
  },
  {
    targetKey: "target:audit-follow-up-reports",
    sourceKey: "co:osa:nemt-performance-audit",
    reportName: "Audit Follow-Up Reports",
    holder: "Colorado Office of the State Auditor / HCPF",
    reportCategory: "audit",
    priority: 75,
    expectedInsightValue: 75,
    expectedInsights: [
      "Corrective action completion status",
      "Repeat audit findings",
      "Updated complaint resolution metrics",
    ],
    acquisitionMethod: "state_records_request",
    defaultStatus: "identified",
    sourceUrl: OSA_AUDIT_URL,
    notes: ["2021 audit published; follow-up corrective action status not public."],
  },
  {
    targetKey: "target:rac-audit-findings",
    sourceKey: "co:hms:rac-audit-findings",
    reportName: "Post-Payment Audit Finding Letters (NEMT)",
    holder: "Health Management Systems (Colorado Medicaid RAC)",
    reportCategory: "audit",
    priority: 70,
    expectedInsightValue: 70,
    expectedInsights: [
      "Noncompliant claim patterns",
      "Rides without proof of service",
      "Provider billing failures",
    ],
    acquisitionMethod: "cora",
    defaultStatus: "identified",
    sourceUrl: "https://hcpf.colorado.gov/recovery-audit-contractor-rac-program",
    notes: ["RAC post-payment reviews — aggregate NEMT findings via CORA."],
  },
  {
    targetKey: "target:osa-nemt-audit-2021",
    sourceKey: "co:osa:nemt-performance-audit",
    reportName: "Medicaid NEMT Performance Audit (2021)",
    holder: "Colorado Office of the State Auditor",
    reportCategory: "audit",
    priority: 80,
    expectedInsightValue: 80,
    expectedInsights: [
      "68% complaints unresolved",
      "75 unreported safety incidents",
      "$291,600 noncompliant claims",
      "On-time pickup failures",
    ],
    acquisitionMethod: "public_download",
    defaultStatus: "acquired",
    sourceUrl: OSA_AUDIT_URL,
    notes: ["Public audit — already acquired and extracted."],
  },
  {
    targetKey: "target:hcpf-nemt-contract",
    sourceKey: "co:transdev:monthly-performance-report",
    reportName: "HCPF NEMT Broker Contract (reporting requirements)",
    holder: "Colorado HCPF",
    reportCategory: "contract_attachment",
    priority: 70,
    expectedInsightValue: 70,
    expectedInsights: [
      "KPI baselines (on-time pickup, call abandonment)",
      "Monthly report schema",
      "Dialysis reporting requirements",
    ],
    acquisitionMethod: "public_download",
    defaultStatus: "acquired",
    sourceUrl: HCPF_NEMT_CONTRACT_URL,
    notes: ["Public contract PDF — KPI baselines extracted; not live operational data."],
  },
];

function workflowStageFor(
  status: ReportTargetStatus,
  targetKey: string,
  acquired: AcquiredReport[],
  failureSignals: ExtractedFailureSignalsArtifact | null,
): AcquisitionWorkflowStage {
  if (status === "failed") return "failed";
  if (status === "identified") return "identified";
  if (status === "request_ready") return "request_ready";
  if (status === "requested") return "requested";

  const acquiredMatch = acquired.find((a) => {
    if (targetKey === "target:osa-nemt-audit-2021") return a.reportId === "osa:nemt-audit-2021";
    if (targetKey === "target:hcpf-nemt-contract") return a.reportId === "contract:hcpf-nemt-rfp";
    return false;
  });

  if (status === "acquired") {
    if (acquiredMatch?.extracted && failureSignals && failureSignals.total > 0) {
      return "signals_generated";
    }
    if (acquiredMatch?.extracted) return "extracted";
    return "acquired";
  }

  return "identified";
}

export async function buildReportTargets(
  acquired: AcquiredReport[],
  failureSignals: ExtractedFailureSignalsArtifact | null,
  generatedAt: string,
): Promise<ReportTargetsArtifact> {
  const state = await readReportTargetState();

  const targets: ReportTarget[] = OPERATIONAL_TARGETS.map((seed) => {
    const status = mergeTargetStatusWithState(seed.targetKey, seed.defaultStatus, state);
    return {
      targetKey: seed.targetKey,
      sourceKey: seed.sourceKey,
      reportName: seed.reportName,
      holder: seed.holder,
      reportCategory: seed.reportCategory,
      priority: seed.priority,
      expectedInsightValue: seed.expectedInsightValue,
      expectedInsights: seed.expectedInsights,
      acquisitionMethod: seed.acquisitionMethod,
      status,
      workflowStage: workflowStageFor(status, seed.targetKey, acquired, failureSignals),
      sourceUrl: seed.sourceUrl,
      notes: seed.notes,
    };
  }).sort((a, b) => b.priority - a.priority);

  const summary = {
    identified: targets.filter((t) => t.status === "identified").length,
    requestReady: targets.filter((t) => t.status === "request_ready").length,
    requested: targets.filter((t) => t.status === "requested").length,
    acquired: targets.filter((t) => t.status === "acquired").length,
    failed: targets.filter((t) => t.status === "failed").length,
  };

  return { generatedAt, total: targets.length, summary, targets };
}

export function buildRequestPackages(targets: ReportTarget[], generatedAt: string): RequestPackagesArtifact {
  const packages: RequestPackage[] = targets
    .filter((t) => t.status !== "acquired" && t.status !== "failed")
    .filter((t) => t.reportCategory !== "contract_attachment")
    .map((target) => {
      let requestPath = CORA_URL;
      let suggestedRequestType = target.acquisitionMethod;

      if (target.acquisitionMethod === "contract_request") {
        requestPath = "HCPF NEMT program oversight — broker contract data request";
      } else if (target.acquisitionMethod === "cora") {
        requestPath = CORA_URL;
        suggestedRequestType = "cora";
      } else if (target.acquisitionMethod === "state_records_request") {
        requestPath = "https://leg.colorado.gov/agencies/state-auditor/contact-us";
        suggestedRequestType = "state_records_request";
      }

      return {
        packageKey: `pkg:${target.targetKey}`,
        targetKey: target.targetKey,
        reportName: target.reportName,
        holder: target.holder,
        requestPath,
        suggestedRequestType,
        expectedOutput: target.expectedInsights,
        priority: target.priority,
        notes: target.notes,
      };
    })
    .sort((a, b) => b.priority - a.priority);

  return { generatedAt, total: packages.length, packages };
}

export function buildRequestTemplates(targets: ReportTarget[], generatedAt: string): RequestTemplatesArtifact {
  const coraTargets = targets.filter(
    (t) =>
      t.acquisitionMethod === "cora" &&
      t.status !== "acquired" &&
      t.reportCategory !== "contract_attachment",
  );

  const performanceTargets = coraTargets.filter((t) =>
    ["target:monthly-performance-report", "target:monthly-dialysis-report", "target:provider-adequacy-reviews"].includes(
      t.targetKey,
    ),
  );

  const complaintTargets = coraTargets.filter((t) =>
    ["target:complaint-investigation-summaries", "target:nemt-complaint-intake-records"].includes(t.targetKey),
  );

  const templates: RequestTemplate[] = [
    {
      templateKey: "tpl:cora-nemt-monthly-performance",
      targetKeys: performanceTargets.map((t) => t.targetKey),
      subject: "Colorado Open Records Act Request — NEMT Broker Monthly Performance Reports",
      agency: "Colorado Department of Health Care Policy and Financing (HCPF)",
      requestedDocuments: [
        "Monthly Performance Reports submitted by Health Solutions by Transdev (IntelliRide) under HCPF NEMT broker contract §5.10.2",
        "Monthly Dialysis Reports (§5.10.2.1.5)",
        "Provider adequacy sections including trips denied for no provider available",
      ],
      dateRange: "January 2024 through most recent month available",
      expectedReportNames: [
        "Monthly Performance Report",
        "Monthly Dialysis Report",
        "Provider Adequacy Review",
      ],
      body: `Pursuant to the Colorado Open Records Act (C.R.S. § 24-72-201 et seq.), I request copies of the following records held by HCPF:

1. All Monthly Performance Reports submitted by Health Solutions by Transdev (IntelliRide) pursuant to the NEMT broker contract §5.10.2, including:
   - Trips denied by reason
   - Provider no-shows and cancellations
   - Trip completion rates
   - Complaint summary per 1,000 trips
   - On-time pickup percentages
   - Call center abandonment rates

2. Monthly Dialysis Reports (§5.10.2.1.5) including missed treatments due to late transport and late delivery bands.

3. Provider adequacy data by county, including denials for no provider available.

Date range: January 2024 through the most recent month available.

Please provide records in electronic format (PDF or spreadsheet) if available. I am willing to pay reasonable copying fees.`,
    },
    {
      templateKey: "tpl:cora-nemt-complaints",
      targetKeys: complaintTargets.map((t) => t.targetKey),
      subject: "Colorado Open Records Act Request — NEMT Complaint Records",
      agency: "Colorado Department of Health Care Policy and Financing (HCPF)",
      requestedDocuments: [
        "Aggregate NEMT member feedback/complaint intake statistics",
        "Complaint investigation summaries from broker monthly reports",
        "Corrective action plans issued in response to complaint or KPI failures",
      ],
      dateRange: "January 2024 through most recent month available",
      expectedReportNames: [
        "NEMT Member Feedback/Complaint Intake Records (aggregate)",
        "Complaint Investigation Summaries",
        "Corrective Action Plans",
      ],
      body: `Pursuant to the Colorado Open Records Act (C.R.S. § 24-72-201 et seq.), I request copies of the following records:

1. Aggregate statistics from the HCPF NEMT Member Feedback/Complaint Program, including complaint counts by category (no-show, scheduling, driver safety, fraud) — no member-identifying information required.

2. Complaint investigation summaries submitted by Health Solutions by Transdev (IntelliRide) in monthly performance reports (§5.10.2.1.4).

3. Any corrective action plans issued to the NEMT broker in response to audit findings or KPI failures.

Date range: January 2024 through the most recent month available.

Please provide aggregate/summary data only — no member-level PHI.`,
    },
    {
      templateKey: "tpl:cora-nemt-rac-audits",
      targetKeys: ["target:rac-audit-findings"],
      subject: "Colorado Open Records Act Request — NEMT RAC Audit Findings",
      agency: "Colorado Department of Health Care Policy and Financing (HCPF)",
      requestedDocuments: [
        "Aggregate post-payment audit finding letters related to NEMT transportation claims",
        "Summary of noncompliant NEMT claims identified by Health Management Systems (RAC)",
      ],
      dateRange: "January 2023 through present",
      expectedReportNames: ["Post-Payment Audit Finding Letters (NEMT aggregate)"],
      body: `Pursuant to the Colorado Open Records Act, I request aggregate summary data of post-payment audit findings related to Colorado Medicaid Non-Emergent Medical Transportation (NEMT) claims reviewed by the Recovery Audit Contractor (Health Management Systems), including counts of claims without proof of ride occurrence.

Date range: January 2023 through present. Aggregate data only — no member-level PHI.`,
    },
  ];

  return { generatedAt, total: templates.length, templates };
}
