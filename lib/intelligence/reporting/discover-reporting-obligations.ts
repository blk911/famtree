// lib/intelligence/reporting/discover-reporting-obligations.ts
// Contract, audit, and regulation-backed reporting discovery for Colorado NEMT.

import { mkdir, readFile, writeFile } from "fs/promises";
import type { DataOwnershipRegistryArtifact } from "@/lib/transpo/data-ownership-types";
import type {
  AuditFinding,
  AuditFindingsArtifact,
  ClosestPathToFailureMetric,
  KpiDefinition,
  KpiRegistryArtifact,
  OperationalStressSignal,
  OperationalStressSignalsArtifact,
  ReportingRegistryBundle,
  RequiredReport,
  RequiredReportsArtifact,
} from "./reporting-types";
import {
  AUDIT_FINDINGS_ARTIFACT_PATH,
  KPI_REGISTRY_ARTIFACT_PATH,
  OPERATIONAL_STRESS_SIGNALS_ARTIFACT_PATH,
  REPORTING_DATA_DIR,
  REQUIRED_REPORTS_ARTIFACT_PATH,
  TRANSPO_DATA_OWNERSHIP_REGISTRY_PATH,
} from "./paths";

const GENERATED_AT = new Date().toISOString();

const HCPF_NEMT_CONTRACT_URL =
  "https://www.bidscolorado.com/co/portal.nsf/xsp/.ibmmodres/domino/OpenAttachment/co/CBdSols.nsf/FBC001108940F43C87257C400070C2A5/Body/HCPFRFPSM14NEMT.pdf";

const OSA_AUDIT_REPORT_URL =
  "https://leg.colorado.gov/sites/default/files/documents/audits/2152p_medicaid_non-emergent_medical_transport.pdf";

const OSA_PRESS_RELEASE_URL =
  "https://leg.colorado.gov/sites/default/files/non-emergent_medical_transportation_press_release_final_9-27-2021.pdf";

const HCPF_BILLING_MANUAL_URL = "https://hcpf.colorado.gov/nemt-billing-manual";

const HCPF_NEMT_URL = "https://hcpf.colorado.gov/NEMT";

const HCPF_NEMT_TRANSITION_URL = "https://hcpf.colorado.gov/non-emergent-medical-transportation";

const COLORADO_NEMT_REG_URL =
  "https://www.law.cornell.edu/regulations/colorado/10-CCR-2505-10-8.014";

const TRANSDEV_PROVIDER_URL =
  "https://transdevhealthsolutions.com/colorado/transportation-providers/";

const HCPF_RAC_URL = "https://hcpf.colorado.gov/recovery-audit-contractor-rac-program";

const NEMT_COMPLAINT_FORM_URL = "https://hcpfccc.my.salesforce-sites.com/NEMTWebform";

async function loadOwnershipRegistry(): Promise<DataOwnershipRegistryArtifact | null> {
  try {
    const raw = await readFile(TRANSPO_DATA_OWNERSHIP_REGISTRY_PATH, "utf8");
    return JSON.parse(raw) as DataOwnershipRegistryArtifact;
  } catch {
    return null;
  }
}

function discoveredReports(): RequiredReport[] {
  return [
    {
      reportKey: "co:transdev:monthly-performance-report",
      entityName: "Health Solutions by Transdev (IntelliRide)",
      ownershipKey: "co:transdev-broker",
      reportName: "Monthly Performance Report",
      frequency: "monthly",
      reportOwner: "Health Solutions by Transdev (IntelliRide)",
      sourceUrl: HCPF_NEMT_CONTRACT_URL,
      publicAccess: "contract_only",
      confidence: "high",
      status: "discovered",
      notes: [
        "Contract §5.10.2 — due within 10 business days after month end.",
        "Includes denials, dialysis performance, contact center metrics, complaint summary per 1,000 trips.",
      ],
    },
    {
      reportKey: "co:transdev:monthly-trip-data-report",
      entityName: "Health Solutions by Transdev (IntelliRide)",
      ownershipKey: "co:transdev-broker",
      reportName: "Monthly Trip Data Report",
      frequency: "monthly",
      reportOwner: "Health Solutions by Transdev (IntelliRide)",
      sourceUrl: HCPF_NEMT_CONTRACT_URL,
      publicAccess: "contract_only",
      confidence: "high",
      status: "discovered",
      notes: [
        "Contract §5.10.2.4 — per-trip data submitted to HCPF (member-level; contract-required, not public).",
        "Contains trip authorization, scheduling, pickup/dropoff, and mode of transport.",
      ],
    },
    {
      reportKey: "co:transdev:complaint-report",
      entityName: "Health Solutions by Transdev (IntelliRide)",
      ownershipKey: "co:transdev-broker",
      reportName: "Monthly Complaint Report (within Monthly Performance Report)",
      frequency: "monthly",
      reportOwner: "Health Solutions by Transdev (IntelliRide)",
      sourceUrl: HCPF_NEMT_CONTRACT_URL,
      publicAccess: "contract_only",
      confidence: "high",
      status: "discovered",
      notes: [
        "Contract §5.10.2.1.4 — provider no-shows, complaints per 1,000 trips, lateness detail, corrective actions.",
      ],
    },
    {
      reportKey: "co:transdev:dialysis-report",
      entityName: "Health Solutions by Transdev (IntelliRide)",
      ownershipKey: "co:transdev-broker",
      reportName: "Monthly Dialysis Report (within Monthly Performance Report)",
      frequency: "monthly",
      reportOwner: "Health Solutions by Transdev (IntelliRide)",
      sourceUrl: HCPF_NEMT_CONTRACT_URL,
      publicAccess: "contract_only",
      confidence: "high",
      status: "discovered",
      notes: [
        "Contract §5.10.2.1.5 — late delivery bands, missed treatments due to late transport, provider no-shows.",
      ],
    },
    {
      reportKey: "co:transdev:incident-report",
      entityName: "Health Solutions by Transdev (IntelliRide)",
      ownershipKey: "co:transdev-broker",
      reportName: "Incident Report",
      frequency: "ad_hoc",
      reportOwner: "Health Solutions by Transdev (IntelliRide)",
      sourceUrl: HCPF_NEMT_CONTRACT_URL,
      publicAccess: "contract_only",
      confidence: "high",
      status: "discovered",
      notes: [
        "Contract §5.10.4 — due within 1 business day for accidents and urgent corrective incidents.",
      ],
    },
    {
      reportKey: "co:transdev:annual-report",
      entityName: "Health Solutions by Transdev (IntelliRide)",
      ownershipKey: "co:transdev-broker",
      reportName: "Annual NEMT Report",
      frequency: "annual",
      reportOwner: "Health Solutions by Transdev (IntelliRide)",
      sourceUrl: HCPF_NEMT_CONTRACT_URL,
      publicAccess: "contract_only",
      confidence: "high",
      status: "discovered",
      notes: [
        "Contract §5.10.2.7 — utilization summary, major problems, improvement recommendations.",
      ],
    },
    {
      reportKey: "co:transdev:complaint-policies",
      entityName: "Health Solutions by Transdev (IntelliRide)",
      ownershipKey: "co:transdev-broker",
      reportName: "Written Client Complaint Policies and Procedures",
      frequency: "ad_hoc",
      reportOwner: "Health Solutions by Transdev (IntelliRide)",
      sourceUrl: HCPF_NEMT_CONTRACT_URL,
      publicAccess: "contract_only",
      confidence: "high",
      status: "discovered",
      notes: ["Contract §5.4.4.3.1 deliverable — complaint log requirements."],
    },
    {
      reportKey: "co:hcpf:standard-trip-log",
      entityName: "Colorado NEMT Providers (all enrolled)",
      ownershipKey: "co:rural-nemt-providers",
      reportName: "HCPF Standard Trip Log",
      frequency: "ad_hoc",
      reportOwner: "NEMT Transportation Provider",
      sourceUrl: HCPF_BILLING_MANUAL_URL,
      publicAccess: "unknown",
      confidence: "high",
      status: "discovered",
      notes: [
        "Required for all rides effective October 1, 2024; submitted with claims, retained on file.",
        "HCPF may request copies for any claim at any time.",
      ],
    },
    {
      reportKey: "co:regulation:trip-report",
      entityName: "NEMT Transportation Providers",
      ownershipKey: "co:nemt-regulation",
      reportName: "Trip Report (10 CCR 2505-10 § 8.014.3.C)",
      frequency: "ad_hoc",
      reportOwner: "NEMT Transportation Provider",
      sourceUrl: COLORADO_NEMT_REG_URL,
      publicAccess: "unknown",
      confidence: "high",
      status: "discovered",
      notes: [
        "Regulation requires trip report per ride: pickup/dropoff times, client ID, driver, vehicle, confirmation of trip occurrence.",
      ],
    },
    {
      reportKey: "co:osa:nemt-performance-audit",
      entityName: "Colorado Office of the State Auditor",
      ownershipKey: "co:osa",
      reportName: "Medicaid Non-Emergent Medical Transportation Performance Audit",
      frequency: "ad_hoc",
      reportOwner: "Colorado Office of the State Auditor",
      sourceUrl: OSA_AUDIT_REPORT_URL,
      publicAccess: "public",
      confidence: "high",
      status: "discovered",
      notes: ["Published September 2021 — public failure metrics on complaints, billing, and contract compliance."],
    },
    {
      reportKey: "co:hms:rac-audit-findings",
      entityName: "Health Management Systems (Colorado Medicaid RAC)",
      ownershipKey: "co:hms-rac",
      reportName: "Post-Payment Audit Finding Letters",
      frequency: "ad_hoc",
      reportOwner: "Health Management Systems (RAC vendor)",
      sourceUrl: HCPF_RAC_URL,
      publicAccess: "open_records",
      confidence: "medium",
      status: "discovered",
      notes: [
        "RAC conducts post-payment claim reviews; providers receive Notice of Adverse Action for overpayments.",
      ],
    },
    {
      reportKey: "co:hcpf:provider-bulletins",
      entityName: "Colorado Department of Health Care Policy and Financing (HCPF)",
      ownershipKey: "co:hcpf",
      reportName: "Monthly NEMT Provider Bulletins",
      frequency: "monthly",
      reportOwner: "HCPF",
      sourceUrl: HCPF_NEMT_TRANSITION_URL,
      publicAccess: "public",
      confidence: "medium",
      status: "discovered",
      notes: ["HCPF publishes monthly provider bulletins with NEMT program updates and timelines."],
    },
    {
      reportKey: "co:transdev:complaint-response-sla",
      entityName: "Health Solutions by Transdev (IntelliRide)",
      ownershipKey: "co:transdev-broker",
      reportName: "Complaint Acknowledgment and Investigation Response",
      frequency: "ad_hoc",
      reportOwner: "Health Solutions by Transdev (IntelliRide)",
      sourceUrl: TRANSDEV_PROVIDER_URL,
      publicAccess: "unknown",
      confidence: "medium",
      status: "discovered",
      notes: [
        "Transdev acknowledges complaints within 2 business days; written investigation response within 10 business days.",
      ],
    },
    {
      reportKey: "co:nemt-complaints:member-feedback-intake",
      entityName: "HCPF NEMT Member Feedback / Complaint Program",
      ownershipKey: "co:nemt-complaints",
      reportName: "NEMT Member Feedback/Complaint Intake Records",
      frequency: "ad_hoc",
      reportOwner: "HCPF NEMT Complaint Program",
      sourceUrl: NEMT_COMPLAINT_FORM_URL,
      publicAccess: "open_records",
      confidence: "medium",
      status: "discovered",
      notes: [
        "Public webform captures no-show, scheduling, driver safety, and fraud categories — aggregate not published.",
      ],
    },
  ];
}

function discoveredKpis(): KpiDefinition[] {
  return [
    {
      kpiKey: "co:transdev:on-time-pickup-15min",
      entityName: "Health Solutions by Transdev (IntelliRide)",
      ownershipKey: "co:transdev-broker",
      category: "timeliness",
      kpiName: "Clients picked up within 15 minutes of scheduled pickup time",
      targetValue: "100%",
      sourceUrl: HCPF_NEMT_CONTRACT_URL,
      confidence: "high",
      notes: ["Contract §5.9.1.1.1.1.1 baseline performance standard."],
    },
    {
      kpiKey: "co:transdev:delivery-not-late-15min",
      entityName: "Health Solutions by Transdev (IntelliRide)",
      ownershipKey: "co:transdev-broker",
      category: "timeliness",
      kpiName: "No client delivered more than 15 minutes late to appointment",
      targetValue: "100%",
      sourceUrl: HCPF_NEMT_CONTRACT_URL,
      confidence: "high",
    },
    {
      kpiKey: "co:transdev:will-call-90min",
      entityName: "Health Solutions by Transdev (IntelliRide)",
      ownershipKey: "co:transdev-broker",
      category: "timeliness",
      kpiName: "Will-call pickups within 90 minutes of request",
      targetValue: "100%",
      sourceUrl: HCPF_NEMT_CONTRACT_URL,
      confidence: "high",
    },
    {
      kpiKey: "co:transdev:call-wait-under-3min",
      entityName: "Health Solutions by Transdev (IntelliRide)",
      ownershipKey: "co:transdev-broker",
      category: "scheduling",
      kpiName: "Average monthly call wait time less than 3 minutes",
      targetValue: "< 3 minutes",
      sourceUrl: HCPF_NEMT_CONTRACT_URL,
      confidence: "high",
    },
    {
      kpiKey: "co:transdev:call-abandonment-rate",
      entityName: "Health Solutions by Transdev (IntelliRide)",
      ownershipKey: "co:transdev-broker",
      category: "scheduling",
      kpiName: "Call abandonment rate",
      targetValue: "< 8%",
      sourceUrl: HCPF_NEMT_CONTRACT_URL,
      confidence: "high",
    },
    {
      kpiKey: "co:transdev:calls-queue-over-3min",
      entityName: "Health Solutions by Transdev (IntelliRide)",
      ownershipKey: "co:transdev-broker",
      category: "scheduling",
      kpiName: "Calls in queue longer than 3 minutes",
      targetValue: "< 5%",
      sourceUrl: HCPF_NEMT_CONTRACT_URL,
      confidence: "high",
    },
    {
      kpiKey: "co:transdev:complaints-per-1000-trips",
      entityName: "Health Solutions by Transdev (IntelliRide)",
      ownershipKey: "co:transdev-broker",
      category: "complaints",
      kpiName: "Client complaints per 1,000 trips",
      sourceUrl: HCPF_NEMT_CONTRACT_URL,
      confidence: "high",
      notes: ["Reported monthly in complaint summary — no public target threshold in contract."],
    },
    {
      kpiKey: "co:transdev:provider-no-shows",
      entityName: "Health Solutions by Transdev (IntelliRide)",
      ownershipKey: "co:transdev-broker",
      category: "dispatch",
      kpiName: "Provider no-shows (cancelled at door)",
      sourceUrl: HCPF_NEMT_CONTRACT_URL,
      confidence: "high",
      notes: ["Reported monthly by county in complaint report §5.10.2.1.4.2–4.3."],
    },
    {
      kpiKey: "co:transdev:trips-denied",
      entityName: "Health Solutions by Transdev (IntelliRide)",
      ownershipKey: "co:transdev-broker",
      category: "access",
      kpiName: "Trips denied by reason",
      sourceUrl: HCPF_NEMT_CONTRACT_URL,
      confidence: "high",
      notes: ["Monthly performance summary §5.10.2.1.1.4 and trip summary §5.10.2.1.2.3."],
    },
    {
      kpiKey: "co:transdev:missed-dialysis-appointments",
      entityName: "Health Solutions by Transdev (IntelliRide)",
      ownershipKey: "co:transdev-broker",
      category: "completion",
      kpiName: "Missed and late dialysis appointments due to transport",
      sourceUrl: HCPF_NEMT_CONTRACT_URL,
      confidence: "high",
      notes: ["Dialysis report §5.10.2.1.5 — late bands and missed treatments."],
    },
    {
      kpiKey: "co:transdev:a-leg-on-time-delivery",
      entityName: "Health Solutions by Transdev (IntelliRide)",
      ownershipKey: "co:transdev-broker",
      category: "timeliness",
      kpiName: "A-leg trips dropped off within 15 minutes of scheduled delivery",
      sourceUrl: HCPF_NEMT_CONTRACT_URL,
      confidence: "high",
      notes: ["Trip summary report §5.10.2.1.2.6 — percentage reported monthly."],
    },
    {
      kpiKey: "co:transdev:provider-record-accuracy",
      entityName: "Health Solutions by Transdev (IntelliRide)",
      ownershipKey: "co:transdev-broker",
      category: "provider_network",
      kpiName: "Transportation provider record accuracy (semi-annual audit)",
      targetValue: "≥ 90% of records 100% accurate",
      sourceUrl: HCPF_NEMT_CONTRACT_URL,
      confidence: "high",
      notes: ["Incentive performance standard §5.9.2.1.1.2.1."],
    },
    {
      kpiKey: "co:transdev:client-satisfaction",
      entityName: "Health Solutions by Transdev (IntelliRide)",
      ownershipKey: "co:transdev-broker",
      category: "quality",
      kpiName: "Client satisfaction survey (semi-annual)",
      targetValue: "≥ 60% satisfied or highly satisfied (baseline)",
      sourceUrl: HCPF_NEMT_CONTRACT_URL,
      confidence: "high",
      notes: ["Incentive tiers for improvement over baseline §5.9.2.1.2."],
    },
    {
      kpiKey: "co:transdev:provider-on-time-15min-window",
      entityName: "Health Solutions by Transdev (IntelliRide)",
      ownershipKey: "co:transdev-dispatch",
      category: "timeliness",
      kpiName: "Provider arrival within 15-minute window (operational policy)",
      targetValue: "15-minute window before no-show",
      sourceUrl: TRANSDEV_PROVIDER_URL,
      confidence: "medium",
      notes: [
        "Transdev provider page instructs drivers to report no-show if member not arrived within 15 minutes.",
      ],
    },
    {
      kpiKey: "co:provider:trip-log-completion",
      entityName: "NEMT Transportation Providers",
      ownershipKey: "co:rural-nemt-providers",
      category: "completion",
      kpiName: "Trip report completed per ride (regulatory)",
      sourceUrl: COLORADO_NEMT_REG_URL,
      confidence: "high",
      notes: ["10 CCR 8.014.3.C — required fields for each trip."],
    },
  ];
}

function discoveredAuditFindings(): AuditFinding[] {
  return [
    {
      findingKey: "co:osa:2021-complaints-unresolved",
      entityName: "Health Solutions by Transdev (IntelliRide)",
      ownershipKey: "co:transdev-broker",
      auditName: "Medicaid Non-Emergent Medical Transportation Performance Audit",
      auditDate: "2021-09",
      severity: "critical",
      finding:
        "68 percent of complaints filed with the contractor went unresolved during the audit period.",
      correctiveAction:
        "OSA recommended HCPF ensure contractor tracks, resolves, and reports complaints and incidents.",
      sourceUrl: OSA_PRESS_RELEASE_URL,
      confidence: "high",
    },
    {
      findingKey: "co:osa:2021-safety-incidents-unreported",
      entityName: "Health Solutions by Transdev (IntelliRide)",
      ownershipKey: "co:transdev-broker",
      auditName: "Medicaid Non-Emergent Medical Transportation Performance Audit",
      auditDate: "2021-09",
      severity: "critical",
      finding:
        "75 incidents that risked recipients' health or safety were not investigated or reported to HCPF.",
      correctiveAction:
        "Contract requires incident reports within 1 business day — audit found systemic under-reporting.",
      sourceUrl: OSA_PRESS_RELEASE_URL,
      confidence: "high",
    },
    {
      findingKey: "co:osa:2021-noncompliant-claims-paid",
      entityName: "Health Solutions by Transdev (IntelliRide)",
      ownershipKey: "co:transdev-broker",
      auditName: "Medicaid Non-Emergent Medical Transportation Performance Audit",
      auditDate: "2021-09",
      severity: "high",
      finding:
        "HCPF paid $291,600 for claims that did not comply with federal and state requirements, including claims without proof rides occurred.",
      sourceUrl: OSA_AUDIT_REPORT_URL,
      confidence: "high",
    },
    {
      findingKey: "co:osa:2021-potentially-noncompliant-claims",
      entityName: "Colorado Department of Health Care Policy and Financing (HCPF)",
      ownershipKey: "co:hcpf",
      auditName: "Medicaid Non-Emergent Medical Transportation Performance Audit",
      auditDate: "2021-09",
      severity: "medium",
      finding:
        "Approximately $5.2 million in claims were potentially noncompliant, including taxi claims at incorrect rates.",
      sourceUrl: OSA_AUDIT_REPORT_URL,
      confidence: "high",
    },
    {
      findingKey: "co:osa:2021-mistreatment-unreported",
      entityName: "Colorado Department of Health Care Policy and Financing (HCPF)",
      ownershipKey: "co:hcpf",
      auditName: "Medicaid Non-Emergent Medical Transportation Performance Audit",
      auditDate: "2021-09",
      severity: "critical",
      finding:
        "32 acts of potential mistreatment of at-risk adults during NEMT rides were not reported to law enforcement as required.",
      sourceUrl: OSA_PRESS_RELEASE_URL,
      confidence: "high",
    },
    {
      findingKey: "co:osa:2021-contract-compliance-gaps",
      entityName: "Health Solutions by Transdev (IntelliRide)",
      ownershipKey: "co:transdev-broker",
      auditName: "Medicaid Non-Emergent Medical Transportation Performance Audit",
      auditDate: "2021-09",
      severity: "high",
      finding:
        "Department did not ensure contractor complied with requirements for on-time pickups, timely call answering, and complaint resolution.",
      correctiveAction:
        "Ensure NEMT contractor meets reliable transportation and customer service requirements; assess member satisfaction.",
      sourceUrl: OSA_PRESS_RELEASE_URL,
      confidence: "high",
    },
    {
      findingKey: "co:osa:2021-intelliride-corrective-action-stated",
      entityName: "Health Solutions by Transdev (IntelliRide)",
      ownershipKey: "co:transdev-broker",
      auditName: "Medicaid Non-Emergent Medical Transportation Performance Audit",
      auditDate: "2021-09",
      severity: "medium",
      finding: "IntelliRide publicly acknowledged audit findings and stated corrective actions were underway.",
      correctiveAction:
        "Transdev/IntelliRide committed to corrective action in all areas of concern per public statement.",
      sourceUrl: "https://coloradonewsline.com/2021/09/29/medicaid-audit-non-emergency-medical-transportation/",
      confidence: "medium",
    },
  ];
}

function buildStressSignals(findings: AuditFinding[]): OperationalStressSignal[] {
  const signals: OperationalStressSignal[] = findings.map((f) => ({
    signalKey: `stress:${f.findingKey}`,
    entityName: f.entityName,
    ownershipKey: f.ownershipKey,
    signalType:
      f.finding.includes("complaint") || f.finding.includes("Complaint")
        ? "complaint_pattern"
        : f.finding.includes("incident") || f.finding.includes("unreported")
          ? "reporting_gap"
          : "audit_failure",
    severity: f.severity,
    summary: f.finding,
    sourceUrl: f.sourceUrl,
    confidence: f.confidence,
  }));

  signals.push({
    signalKey: "stress:co:transdev:contract-denials-reported",
    entityName: "Health Solutions by Transdev (IntelliRide)",
    ownershipKey: "co:transdev-broker",
    signalType: "missed_kpi",
    severity: "medium",
    summary:
      "Contract requires monthly reporting of trip denials and no-shows — key unmet-demand proxy without PHI if obtained via CORA/contract.",
    sourceUrl: HCPF_NEMT_CONTRACT_URL,
    confidence: "high",
  });

  signals.push({
    signalKey: "stress:co:transdev:dialysis-missed-treatments",
    entityName: "Health Solutions by Transdev (IntelliRide)",
    ownershipKey: "co:transdev-broker",
    signalType: "missed_kpi",
    severity: "high",
    summary:
      "Monthly dialysis report must include missed treatments due to late delivery and provider no-shows — direct missed-care transport signal.",
    sourceUrl: HCPF_NEMT_CONTRACT_URL,
    confidence: "high",
  });

  signals.push({
    signalKey: "stress:co:nemt-complaints:no-show-category",
    entityName: "HCPF NEMT Member Feedback / Complaint Program",
    ownershipKey: "co:nemt-complaints",
    signalType: "complaint_pattern",
    severity: "medium",
    summary:
      "Public complaint form includes Driver Issue (No Show/Late/Unsafe) — aggregate complaint data not published but intake exists.",
    sourceUrl: NEMT_COMPLAINT_FORM_URL,
    confidence: "medium",
  });

  return signals;
}

function buildClosestPathToFailureMetrics(): ClosestPathToFailureMetric[] {
  return [
    {
      rank: 1,
      entityName: "Health Solutions by Transdev (IntelliRide)",
      ownershipKey: "co:transdev-broker",
      metricSource: "Monthly Performance Report — denials, no-shows, dialysis summary",
      rationale:
        "Colorado NEMT broker contract §5.10.2 requires monthly reporting of trips denied, provider no-shows, missed/late dialysis appointments, and complaints per 1,000 trips — the closest contractually mandated failure metrics without ride-level PHI.",
      failureSignals: [
        "unmet demand (denials)",
        "provider no-shows",
        "missed dialysis transportation",
        "complaint rate",
      ],
      sourceUrl: HCPF_NEMT_CONTRACT_URL,
      confidence: "high",
    },
    {
      rank: 2,
      entityName: "Colorado Office of the State Auditor",
      ownershipKey: "co:osa",
      metricSource: "2021 NEMT Performance Audit (public)",
      rationale:
        "OSA audit documents measured failure rates: 68% unresolved complaints, 75 unreported safety incidents, and noncompliant claim payments — evidence-backed baseline of broker stress without PHI.",
      failureSignals: [
        "complaint resolution failure",
        "incident reporting gap",
        "billing without ride proof",
      ],
      sourceUrl: OSA_AUDIT_REPORT_URL,
      confidence: "high",
    },
    {
      rank: 3,
      entityName: "Health Solutions by Transdev (IntelliRide)",
      ownershipKey: "co:transdev-broker",
      metricSource: "Monthly Dialysis Report (contract §5.10.2.1.5)",
      rationale:
        "Contract mandates late-delivery time bands and count of missed dialysis treatments due to transport — direct bottleneck signal for recurring medical transport.",
      failureSignals: ["transport delays", "missed dialysis appointments", "provider no-shows"],
      sourceUrl: HCPF_NEMT_CONTRACT_URL,
      confidence: "high",
    },
    {
      rank: 4,
      entityName: "HCPF NEMT Member Feedback / Complaint Program",
      ownershipKey: "co:nemt-complaints",
      metricSource: "NEMT complaint webform categories",
      rationale:
        "Public intake captures no-show, scheduling, and driver safety complaints — obtainable in aggregate via CORA without individual trip records.",
      failureSignals: ["no-show complaints", "scheduling failures", "service failures"],
      sourceUrl: NEMT_COMPLAINT_FORM_URL,
      confidence: "medium",
    },
    {
      rank: 5,
      entityName: "Colorado Department of Health Care Policy and Financing (HCPF)",
      ownershipKey: "co:hcpf",
      metricSource: "CORA request for broker Monthly Performance Reports",
      rationale:
        "HCPF receives contractor monthly reports under contract — CORA may yield aggregate denial/no-show/dialysis metrics even when trip-level PHI is redacted.",
      failureSignals: ["broker stress", "network inadequacy", "corrective actions"],
      sourceUrl: "https://hcpf.colorado.gov/contact-hcpf",
      confidence: "medium",
    },
  ];
}

function entityHasDiscovery(
  ownershipKey: string,
  entityName: string,
  reports: RequiredReport[],
  kpis: KpiDefinition[],
  findings: AuditFinding[],
): boolean {
  return (
    reports.some((r) => r.ownershipKey === ownershipKey) ||
    kpis.some((k) => k.ownershipKey === ownershipKey) ||
    findings.some((f) => f.ownershipKey === ownershipKey)
  );
}

function buildPlaceholders(
  registry: DataOwnershipRegistryArtifact | null,
  reports: RequiredReport[],
  kpis: KpiDefinition[],
  findings: AuditFinding[],
): RequiredReport[] {
  if (!registry) return [];

  const placeholders: RequiredReport[] = [];

  for (const owner of registry.records) {
    if (entityHasDiscovery(owner.ownershipKey, owner.entityName, reports, kpis, findings)) {
      continue;
    }

    placeholders.push({
      reportKey: `placeholder:${owner.ownershipKey}`,
      entityName: owner.entityName,
      ownershipKey: owner.ownershipKey,
      reportName: "Reporting obligations not yet discovered",
      frequency: "unknown",
      reportOwner: owner.entityName,
      sourceUrl: owner.sourceUrl ?? HCPF_NEMT_URL,
      publicAccess: "unknown",
      confidence: "low",
      status: "reporting_unknown",
      notes: [
        "No contract, regulation, or audit document has been linked to a specific required report for this entity yet.",
        `Data ownership role: ${owner.role}. Continue contract/procurement discovery.`,
      ],
    });
  }

  return placeholders;
}

function topReportingEntities(
  reports: RequiredReport[],
  kpis: KpiDefinition[],
  findings: AuditFinding[],
): { entityName: string; ownershipKey?: string; score: number }[] {
  const scores = new Map<string, { entityName: string; ownershipKey?: string; score: number }>();

  const bump = (key: string, entityName: string, ownershipKey: string | undefined, pts: number) => {
    const existing = scores.get(key) ?? { entityName, ownershipKey, score: 0 };
    existing.score += pts;
    scores.set(key, existing);
  };

  for (const r of reports.filter((x) => x.status === "discovered")) {
    bump(r.ownershipKey ?? r.entityName, r.entityName, r.ownershipKey, 10);
  }
  for (const k of kpis) {
    bump(k.ownershipKey ?? k.entityName, k.entityName, k.ownershipKey, 8);
  }
  for (const f of findings) {
    bump(f.ownershipKey ?? f.entityName, f.entityName, f.ownershipKey, f.severity === "critical" ? 15 : 8);
  }

  return Array.from(scores.values()).sort((a, b) => b.score - a.score).slice(0, 10);
}

export async function discoverReportingObligations(): Promise<ReportingRegistryBundle> {
  const registry = await loadOwnershipRegistry();
  const discovered = discoveredReports();
  const kpis = discoveredKpis();
  const findings = discoveredAuditFindings();
  const placeholders = buildPlaceholders(registry, discovered, kpis, findings);
  const allReports = [...discovered, ...placeholders];
  const signals = buildStressSignals(findings);
  const closestPath = buildClosestPathToFailureMetrics();

  const kpiByCategory: KpiRegistryArtifact["byCategory"] = {};
  for (const k of kpis) {
    kpiByCategory[k.category] = (kpiByCategory[k.category] ?? 0) + 1;
  }

  const requiredReports: RequiredReportsArtifact = {
    generatedAt: GENERATED_AT,
    total: allReports.length,
    discovered: discovered.length,
    reportingUnknown: placeholders.length,
    reports: allReports,
  };

  const kpiRegistry: KpiRegistryArtifact = {
    generatedAt: GENERATED_AT,
    total: kpis.length,
    byCategory: kpiByCategory,
    kpis,
  };

  const auditFindings: AuditFindingsArtifact = {
    generatedAt: GENERATED_AT,
    total: findings.length,
    findings,
  };

  const stressSignals: OperationalStressSignalsArtifact = {
    generatedAt: GENERATED_AT,
    total: signals.length,
    signals,
    closestPathToFailureMetrics: closestPath,
    summary: {
      topReportingEntities: topReportingEntities(allReports, kpis, findings),
    },
  };

  await mkdir(REPORTING_DATA_DIR, { recursive: true });
  await Promise.all([
    writeFile(REQUIRED_REPORTS_ARTIFACT_PATH, JSON.stringify(requiredReports, null, 2), "utf8"),
    writeFile(KPI_REGISTRY_ARTIFACT_PATH, JSON.stringify(kpiRegistry, null, 2), "utf8"),
    writeFile(AUDIT_FINDINGS_ARTIFACT_PATH, JSON.stringify(auditFindings, null, 2), "utf8"),
    writeFile(
      OPERATIONAL_STRESS_SIGNALS_ARTIFACT_PATH,
      JSON.stringify(stressSignals, null, 2),
      "utf8",
    ),
  ]);

  return { requiredReports, kpiRegistry, auditFindings, stressSignals };
}
