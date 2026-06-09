// lib/transpo/build-colorado-data-ownership.ts
// First-pass Colorado NEMT data ownership map — source-backed only.

import { mkdir, writeFile } from "fs/promises";
import type {
  ClosestPathTarget,
  ColoradoNemtWorkflowArtifact,
  DataAccessPath,
  DataAccessPathsArtifact,
  DataAccessLevel,
  DataOpportunityScore,
  DataOwnershipRecord,
  DataOwnershipRegistryArtifact,
  HighValueDataTargetsArtifact,
  WorkflowStepTrace,
} from "./data-ownership-types";
import {
  COLORADO_NEMT_WORKFLOW_ARTIFACT_PATH,
  DATA_ACCESS_PATHS_ARTIFACT_PATH,
  DATA_OWNERSHIP_REGISTRY_ARTIFACT_PATH,
  HIGH_VALUE_DATA_TARGETS_ARTIFACT_PATH,
  TRANSPO_DATA_DIR,
} from "./paths";

const GENERATED_AT = new Date().toISOString();

/** Curated ownership records — every row has a public sourceUrl. */
const COLORADO_OWNERSHIP_RECORDS: DataOwnershipRecord[] = [
  {
    ownershipKey: "co:hcpf",
    state: "CO",
    entityName: "Colorado Department of Health Care Policy and Financing (HCPF)",
    role: "authorization_owner",
    organizationType: "state_agency",
    dataOwned: [
      "member eligibility determinations",
      "prior authorization decisions",
      "NEMT program policy and oversight",
      "aggregate NEMT expenditure reporting",
    ],
    systemNames: ["Gainwell Provider Web Portal", "Provider Services Call Center IVR"],
    publicAccess: true,
    accessMethod: "open_records",
    contactKnown: true,
    website: "https://hcpf.colorado.gov",
    sourceUrl: "https://hcpf.colorado.gov/NEMT",
    confidence: 95,
    notes: [
      "HCPF administers Health First Colorado NEMT and publishes program requirements.",
      "CORA requests may be submitted via https://hcpf.colorado.gov/contact-hcpf",
    ],
  },
  {
    ownershipKey: "co:transdev-broker",
    state: "CO",
    entityName: "Health Solutions by Transdev (IntelliRide)",
    role: "broker",
    organizationType: "broker",
    dataOwned: [
      "trip requested",
      "trip assigned",
      "trip cancelled",
      "broker network dispatch",
      "complaint resolution (contracted function per state audit)",
      "provider payment within broker network",
    ],
    systemNames: ["IntelliRide / gointelliride.com", "Transdev call center"],
    publicAccess: false,
    accessMethod: "contract",
    contactKnown: true,
    website: "https://www.gointelliride.com/colorado",
    sourceUrl: "https://hcpf.colorado.gov/nemt-billing-manual",
    confidence: 92,
    notes: [
      "State Designated Entity (SDE) for Adams, Arapahoe, Boulder, Broomfield, Denver, Douglas, Jefferson, Larimer, and Weld counties.",
      "OSA audit states IntelliRide coordinates transportation, submits claims, pays providers, and manages complaints.",
    ],
  },
  {
    ownershipKey: "co:transdev-dispatch",
    state: "CO",
    entityName: "Health Solutions by Transdev — Dispatch Operations",
    role: "dispatcher",
    organizationType: "broker",
    dataOwned: [
      "trip assignment",
      "provider routing",
      "no-show and late pickup incidents (operational)",
    ],
    systemNames: ["IntelliRide scheduling platform"],
    publicAccess: false,
    accessMethod: "contract",
    contactKnown: true,
    website: "https://transdevhealthsolutions.com/colorado/",
    sourceUrl: "https://www.healthfirstcolorado.com/benefits-services/nemt/",
    confidence: 88,
    notes: [
      "Members in nine metro counties schedule through Transdev at 855-489-4999 or gointelliride.com.",
    ],
  },
  {
    ownershipKey: "co:medidrive-broker",
    state: "CO",
    entityName: "MediDrive (selected statewide NEMT broker)",
    role: "broker",
    organizationType: "broker",
    dataOwned: [
      "trip scheduling (planned statewide)",
      "provider credentialing roster",
      "network management",
      "billing and payment (planned statewide)",
    ],
    systemNames: ["MediDrive broker platform (provider manual pending)"],
    publicAccess: false,
    accessMethod: "contract",
    contactKnown: true,
    sourceUrl: "https://hcpf.colorado.gov/non-emergent-medical-transportation",
    confidence: 85,
    notes: [
      "HCPF selected MediDrive for phased statewide rollout beginning July 2026.",
      "Trip ledger ownership will consolidate under broker model when implemented.",
    ],
  },
  {
    ownershipKey: "co:gainwell",
    state: "CO",
    entityName: "Gainwell Technologies (Health First Colorado fiscal agent)",
    role: "payer",
    organizationType: "payer",
    dataOwned: [
      "trip paid",
      "claim denial and adjustment codes",
      "remittance and EOB data",
    ],
    systemNames: ["interChange claims system", "Gainwell Provider Portal"],
    publicAccess: false,
    accessMethod: "contract",
    contactKnown: true,
    sourceUrl: "https://hcpf.colorado.gov/recovery-audit-contractor-rac-program",
    confidence: 90,
    notes: [
      "Colorado OSA evaluation identifies Gainwell as HCPF fiscal agent processing Medicaid claims.",
    ],
  },
  {
    ownershipKey: "co:procredex",
    state: "CO",
    entityName: "ProCredEx (NEMT credentialing platform)",
    role: "reporting_owner",
    organizationType: "software_vendor",
    dataOwned: [
      "driver credential status",
      "vehicle roster approvals",
      "credentialing certificates",
    ],
    systemNames: ["ProCredEx"],
    publicAccess: false,
    accessMethod: "contract",
    contactKnown: true,
    sourceUrl: "https://hcpf.colorado.gov/nemt-billing-manual",
    confidence: 88,
    notes: [
      "Transdev manages statewide driver and vehicle credentialing through ProCredEx.",
      "Does not hold trip completion ledger — fleet eligibility only.",
    ],
  },
  {
    ownershipKey: "co:nemt-complaints",
    state: "CO",
    entityName: "HCPF NEMT Member Feedback / Complaint Program",
    role: "complaint_owner",
    organizationType: "state_agency",
    dataOwned: [
      "complaint",
      "no-show reports",
      "scheduling complaints",
      "driver safety incidents",
      "fraud referrals",
    ],
    systemNames: ["Salesforce NEMT Webform"],
    publicAccess: true,
    accessMethod: "public",
    contactKnown: true,
    website: "https://hcpfccc.my.salesforce-sites.com/NEMTWebform",
    sourceUrl: "https://hcpfccc.my.salesforce-sites.com/NEMTWebform",
    confidence: 93,
    notes: [
      "Public webform categories include Driver Issue (No Show/Late/Unsafe) and Customer service scheduling problems.",
    ],
  },
  {
    ownershipKey: "co:health-first-colorado-member",
    state: "CO",
    entityName: "Health First Colorado Members",
    role: "request_originator",
    organizationType: "other",
    dataOwned: ["trip requested (member-initiated)"],
    systemNames: ["Member phone scheduling", "gointelliride.com web chat"],
    publicAccess: false,
    accessMethod: "unknown",
    contactKnown: false,
    website: "https://www.healthfirstcolorado.com/benefits-services/nemt/",
    sourceUrl: "https://www.healthfirstcolorado.com/benefits-services/nemt/",
    confidence: 80,
    notes: [
      "Members initiate ride requests; broker or local provider receives the request.",
    ],
  },
  {
    ownershipKey: "co:rural-nemt-providers",
    state: "CO",
    entityName: "Rural Colorado NEMT Providers (non-broker counties)",
    role: "provider",
    organizationType: "provider",
    dataOwned: [
      "trip requested",
      "trip assigned (self-dispatch)",
      "trip completed",
      "trip cancelled",
      "standard trip logs",
      "claims submitted to HCPF",
    ],
    systemNames: ["Provider-maintained trip logs", "Gainwell Provider Web Portal"],
    publicAccess: false,
    accessMethod: "interview",
    contactKnown: true,
    website: "https://hcpf.colorado.gov/nemtlist",
    sourceUrl: "https://hcpf.colorado.gov/nemtlist",
    confidence: 86,
    notes: [
      "Outside nine metro broker counties, local providers administer and bill NEMT directly per billing manual.",
      "HCPF publishes county-level provider directory — 55 counties use local providers.",
    ],
  },
  {
    ownershipKey: "co:osa",
    state: "CO",
    entityName: "Colorado Office of the State Auditor",
    role: "auditor",
    organizationType: "state_agency",
    dataOwned: [
      "audit",
      "aggregate improper payment findings",
      "broker contract compliance reviews",
    ],
    systemNames: ["Performance audit reports"],
    publicAccess: true,
    accessMethod: "public",
    contactKnown: true,
    website: "https://leg.colorado.gov",
    sourceUrl:
      "https://leg.colorado.gov/sites/default/files/non-emergent_medical_transportation_press_release_final_9-27-2021.pdf",
    confidence: 94,
    notes: [
      "2021 NEMT performance audit found claims without ride proof and complaint handling gaps.",
    ],
  },
  {
    ownershipKey: "co:hms-rac",
    state: "CO",
    entityName: "Health Management Systems (Colorado Medicaid RAC)",
    role: "auditor",
    organizationType: "other",
    dataOwned: [
      "audit",
      "post-payment claim review findings",
      "overpayment and underpayment notices",
    ],
    systemNames: ["RAC audit workflows"],
    publicAccess: false,
    accessMethod: "open_records",
    contactKnown: true,
    sourceUrl: "https://hcpf.colorado.gov/recovery-audit-contractor-rac-program",
    confidence: 87,
    notes: [
      "HMS conducts post-payment reviews of fee-for-service Medicaid claims including documentation sufficiency.",
    ],
  },
  {
    ownershipKey: "co:cms",
    state: "CO",
    entityName: "Centers for Medicare & Medicaid Services (CMS)",
    role: "auditor",
    organizationType: "federal_agency",
    dataOwned: [
      "federal NEMT policy oversight",
      "provider enrollment moratorium authority",
    ],
    systemNames: ["CMS Medicaid program oversight"],
    publicAccess: true,
    accessMethod: "foia",
    contactKnown: true,
    website: "https://www.cms.gov",
    sourceUrl: "https://hcpf.colorado.gov/NEMT",
    confidence: 82,
    notes: [
      "HCPF documents CMS-approved NEMT provider enrollment moratorium through March 2026.",
    ],
  },
  {
    ownershipKey: "co:nemt-regulation",
    state: "CO",
    entityName: "10 CCR 2505-10 § 8.014 (NEMT regulations)",
    role: "reporting_owner",
    organizationType: "state_agency",
    dataOwned: [
      "trip completed (required trip report fields)",
      "trip documentation standards",
      "prior authorization requirements",
    ],
    systemNames: ["Standard Trip Log (HCPF provider forms)"],
    publicAccess: true,
    accessMethod: "public",
    contactKnown: true,
    sourceUrl: "https://www.law.cornell.edu/regulations/colorado/10-CCR-2505-10-8.014",
    confidence: 96,
    notes: [
      "Regulation requires trip reports with pickup/dropoff times, client ID, driver, and vehicle for each trip.",
      "Billing manual requires HCPF Standard Trip Log effective October 1, 2024.",
    ],
  },
  {
    ownershipKey: "co:hcpf-payer",
    state: "CO",
    entityName: "HCPF — Medicaid Claims Payment",
    role: "payer",
    organizationType: "state_agency",
    dataOwned: ["trip paid", "program expenditure totals"],
    systemNames: ["Gainwell interChange"],
    publicAccess: false,
    accessMethod: "open_records",
    contactKnown: true,
    website: "https://hcpf.colorado.gov",
    sourceUrl: "https://hcpf.colorado.gov/nemt-billing-manual",
    confidence: 91,
    notes: [
      "OSA audit cites $33.2M NEMT payments in audit period; claims processed through fiscal agent.",
    ],
  },
];

function buildWorkflow(): ColoradoNemtWorkflowArtifact {
  const steps: WorkflowStepTrace[] = [
    {
      stepKey: "patient",
      stepLabel: "Patient / Member",
      owner: "Health First Colorado Member",
      ownerEntityKey: "co:health-first-colorado-member",
      knownDataHeld: ["medical appointment need", "transportation request initiation"],
      unknowns: ["member-level unfilled ride counts"],
      sourceUrl: "https://www.healthfirstcolorado.com/benefits-services/nemt/",
    },
    {
      stepKey: "ride_request",
      stepLabel: "Ride Request",
      owner: "Transdev (9 metro counties) or Rural NEMT Provider (55 counties)",
      ownerEntityKey: "co:transdev-broker",
      knownSystem: "IntelliRide / gointelliride.com",
      knownDataHeld: ["trip requested", "pickup and destination", "scheduled time"],
      unknowns: ["unfilled ride queue depth", "rejected ride reasons at scale"],
      sourceUrl: "https://hcpf.colorado.gov/nemt-billing-manual",
    },
    {
      stepKey: "authorization",
      stepLabel: "Authorization",
      owner: "HCPF / Colorado Medical Assistance Program",
      ownerEntityKey: "co:hcpf",
      knownSystem: "Provider Web Portal / Batch 270 eligibility",
      knownDataHeld: ["member eligibility", "prior authorization determinations"],
      unknowns: ["real-time authorization denial rates by county"],
      sourceUrl: "https://www.law.cornell.edu/regulations/colorado/10-CCR-2505-10-8.014",
    },
    {
      stepKey: "broker",
      stepLabel: "Broker",
      owner: "Transdev (current metro) → MediDrive (planned statewide)",
      ownerEntityKey: "co:transdev-broker",
      knownSystem: "IntelliRide broker platform",
      knownDataHeld: ["network provider list", "trip routing rules", "overflow routing"],
      unknowns: ["broker overflow counts", "unassigned trip backlog"],
      sourceUrl: "https://hcpf.colorado.gov/non-emergent-medical-transportation",
    },
    {
      stepKey: "provider_assignment",
      stepLabel: "Provider Assignment",
      owner: "Transdev Dispatch (metro) or Rural Provider self-dispatch",
      ownerEntityKey: "co:transdev-dispatch",
      knownDataHeld: ["trip assigned", "driver and vehicle assignment"],
      unknowns: ["assignment failure rate", "wheelchair-capable assignment gaps"],
      sourceUrl: "https://hcpf.colorado.gov/nemt-billing-manual",
    },
    {
      stepKey: "ride_completion",
      stepLabel: "Ride Completion",
      owner: "NEMT Transportation Provider",
      ownerEntityKey: "co:rural-nemt-providers",
      knownSystem: "HCPF Standard Trip Log",
      knownDataHeld: [
        "trip completed",
        "actual pickup and drop-off times",
        "driver and vehicle identification",
      ],
      unknowns: ["missed treatment transport linkage", "discharge delay correlation"],
      sourceUrl: "https://hcpf.colorado.gov/nemt-billing-manual",
    },
    {
      stepKey: "claim_submission",
      stepLabel: "Claim Submission",
      owner: "Transdev (metro broker claims) or Provider (rural direct claims)",
      ownerEntityKey: "co:gainwell",
      knownSystem: "Gainwell interChange / Provider Web Portal",
      knownDataHeld: ["claim line items", "HCPCS transport codes", "trip documentation attachments"],
      unknowns: ["claims for rides never completed", "denied trip volume"],
      sourceUrl: "https://hcpf.colorado.gov/nemt-billing-manual",
    },
    {
      stepKey: "payment",
      stepLabel: "Payment",
      owner: "Gainwell Technologies (fiscal agent) / HCPF",
      ownerEntityKey: "co:gainwell",
      knownDataHeld: ["trip paid", "payment amount", "EOB codes"],
      unknowns: ["withheld payments for incomplete documentation"],
      sourceUrl: "https://hcpf.colorado.gov/recovery-audit-contractor-rac-program",
    },
    {
      stepKey: "complaint_audit",
      stepLabel: "Complaint / Audit",
      owner: "HCPF NEMT Complaints, OSA, HMS RAC",
      ownerEntityKey: "co:nemt-complaints",
      knownSystem: "Salesforce NEMT Webform",
      knownDataHeld: ["complaint", "audit findings", "improper payment totals"],
      unknowns: ["complaint-to-unfilled-ride linkage", "hospital discharge delay evidence"],
      sourceUrl: "https://hcpfccc.my.salesforce-sites.com/NEMTWebform",
    },
  ];

  return {
    generatedAt: GENERATED_AT,
    state: "CO",
    program: "Health First Colorado NEMT",
    summary:
      "Colorado NEMT ride ledger is split: Transdev brokers nine metro counties; 55 counties use self-administered providers billing HCPF directly. MediDrive statewide broker transition begins July 2026.",
    steps,
  };
}

function accessLevelForRecord(record: DataOwnershipRecord): DataAccessPath {
  const brokerOrDispatch =
    record.ownershipKey === "co:transdev-broker" ||
    record.ownershipKey === "co:transdev-dispatch" ||
    record.ownershipKey === "co:medidrive-broker";
  const provider = record.ownershipKey === "co:rural-nemt-providers";
  const complaint = record.ownershipKey === "co:nemt-complaints";
  const payer = record.ownershipKey === "co:gainwell" || record.ownershipKey === "co:hcpf-payer";
  const auditor = record.ownershipKey === "co:osa" || record.ownershipKey === "co:hms-rac";
  const publicReg = record.ownershipKey === "co:nemt-regulation";

  const contractOnly: DataAccessLevel = "contract-only";
  const requestable: DataAccessLevel = "requestable";
  const pub: DataAccessLevel = "public";
  const unknown: DataAccessLevel = "unknown";

  const canObtain = {
    requestedRides: brokerOrDispatch ? contractOnly : provider ? requestable : unknown,
    assignedRides: brokerOrDispatch ? contractOnly : provider ? requestable : unknown,
    completedRides: provider ? requestable : payer ? requestable : brokerOrDispatch ? contractOnly : unknown,
    cancelledRides: brokerOrDispatch ? contractOnly : provider ? requestable : complaint ? requestable : unknown,
    rejectedRides: brokerOrDispatch ? contractOnly : payer ? requestable : unknown,
    complaints: complaint ? pub : auditor ? requestable : brokerOrDispatch ? contractOnly : unknown,
    audits: auditor ? pub : payer ? requestable : publicReg ? pub : unknown,
  };

  let accessLevel: DataAccessLevel = unknown;
  if (record.publicAccess) accessLevel = pub;
  else if (record.accessMethod === "open_records") accessLevel = requestable;
  else if (record.accessMethod === "contract") accessLevel = contractOnly;
  else if (record.accessMethod === "interview") accessLevel = requestable;

  const accessNotes: string[] = [];
  if (record.accessMethod === "open_records") {
    accessNotes.push("CORA request via https://hcpf.colorado.gov/contact-hcpf — trip-level PHI may be redacted.");
  }
  if (contractOnly === canObtain.assignedRides) {
    accessNotes.push("Broker trip ledger requires contract, data use agreement, or broker cooperation.");
  }
  if (complaint && canObtain.complaints === pub) {
    accessNotes.push("Members may file complaints publicly; aggregate complaint data not published.");
  }

  return {
    ownershipKey: record.ownershipKey,
    entityName: record.entityName,
    role: record.role,
    canObtain,
    accessLevel,
    accessNotes,
    sourceUrl: record.sourceUrl,
  };
}

function scoreTarget(
  record: DataOwnershipRecord,
  dataValueScore: number,
  accessDifficulty: number,
  insightTargets: string[],
): DataOpportunityScore {
  const estimatedInsightValue = Math.round(
    Math.max(0, Math.min(100, dataValueScore * 0.7 + (100 - accessDifficulty) * 0.3)),
  );
  return {
    entity: record.entityName,
    ownershipKey: record.ownershipKey,
    role: record.role,
    dataValueScore,
    accessDifficulty,
    estimatedInsightValue,
    insightTargets,
    sourceUrl: record.sourceUrl,
  };
}

function buildHighValueTargets(records: DataOwnershipRecord[]): HighValueDataTargetsArtifact {
  const byKey = new Map(records.map((r) => [r.ownershipKey, r]));

  const targets: DataOpportunityScore[] = [
    scoreTarget(
      byKey.get("co:transdev-broker")!,
      95,
      85,
      ["unfilled rides", "trip failures", "trip denials", "broker overflow", "transport delays"],
    ),
    scoreTarget(
      byKey.get("co:medidrive-broker")!,
      92,
      80,
      ["unfilled rides", "trip failures", "trip denials", "broker overflow"],
    ),
    scoreTarget(
      byKey.get("co:rural-nemt-providers")!,
      78,
      55,
      ["trip denials", "transport delays", "missed dialysis transportation"],
    ),
    scoreTarget(
      byKey.get("co:nemt-complaints")!,
      72,
      25,
      ["complaint rates", "no-show incidents", "transport delays"],
    ),
    scoreTarget(
      byKey.get("co:gainwell")!,
      68,
      70,
      ["trip denials", "trip failures"],
    ),
    scoreTarget(
      byKey.get("co:transdev-dispatch")!,
      88,
      82,
      ["unfilled rides", "transport delays", "broker overflow"],
    ),
    scoreTarget(
      byKey.get("co:osa")!,
      45,
      15,
      ["audit gaps", "improper payments"],
    ),
    scoreTarget(
      byKey.get("co:hcpf")!,
      60,
      65,
      ["aggregate program data", "authorization denials"],
    ),
  ].sort((a, b) => b.estimatedInsightValue - a.estimatedInsightValue);

  const closestPathToUnfilledRideData: ClosestPathTarget[] = [
    {
      rank: 1,
      entityName: "Health Solutions by Transdev (IntelliRide)",
      ownershipKey: "co:transdev-broker",
      rationale:
        "Billing manual designates Transdev as State Designated Entity for nine metro counties with trip scheduling, assignment, and broker claims. This is the only documented entity that centrally holds requested and assigned ride records in broker counties.",
      dataTypes: ["trip requested", "trip assigned", "trip cancelled", "unfilled queue"],
      accessMethod: "contract",
      sourceUrl: "https://hcpf.colorado.gov/nemt-billing-manual",
    },
    {
      rank: 2,
      entityName: "MediDrive (incoming statewide broker)",
      ownershipKey: "co:medidrive-broker",
      rationale:
        "HCPF selected MediDrive to manage trip scheduling, network management, and billing statewide beginning July 2026. Will become the single broker ledger for all Colorado counties.",
      dataTypes: ["trip requested", "trip assigned", "provider network capacity"],
      accessMethod: "contract",
      sourceUrl: "https://hcpf.colorado.gov/non-emergent-medical-transportation",
    },
    {
      rank: 3,
      entityName: "Rural Colorado NEMT Providers",
      ownershipKey: "co:rural-nemt-providers",
      rationale:
        "In 55 non-broker counties, local providers self-administer trips and maintain Standard Trip Logs per 10 CCR 8.014.3 — closest path for rural unfilled or missed rides outside Transdev network.",
      dataTypes: ["trip requested", "trip completed", "trip cancelled", "trip logs"],
      accessMethod: "interview",
      sourceUrl: "https://hcpf.colorado.gov/nemtlist",
    },
    {
      rank: 4,
      entityName: "HCPF NEMT Member Feedback / Complaint Program",
      ownershipKey: "co:nemt-complaints",
      rationale:
        "Public complaint webform captures no-show, scheduling failures, and driver issues — indirect signal of unfilled or failed rides without full ledger access.",
      dataTypes: ["complaint", "no-show reports", "scheduling failures"],
      accessMethod: "public",
      sourceUrl: "https://hcpfccc.my.salesforce-sites.com/NEMTWebform",
    },
    {
      rank: 5,
      entityName: "HCPF (CORA / program oversight)",
      ownershipKey: "co:hcpf",
      rationale:
        "HCPF can request broker reports under contract and may produce aggregate NEMT data via CORA, though trip-level PHI is likely redacted.",
      dataTypes: ["aggregate trip volumes", "authorization denials", "program compliance"],
      accessMethod: "open_records",
      sourceUrl: "https://hcpf.colorado.gov/contact-hcpf",
    },
  ];

  const knownSystems = Array.from(
    new Set(records.flatMap((r) => r.systemNames)),
  ).sort();

  return {
    generatedAt: GENERATED_AT,
    total: targets.length,
    targets,
    closestPathToUnfilledRideData,
    summary: {
      topInsightValue: targets[0]?.estimatedInsightValue ?? 0,
      publicSources: records.filter((r) => r.publicAccess).length,
      knownSystems: knownSystems.length,
    },
  };
}

function buildRegistrySummary(records: DataOwnershipRecord[]) {
  const byRole: Partial<Record<DataOwnershipRecord["role"], number>> = {};
  for (const r of records) {
    byRole[r.role] = (byRole[r.role] ?? 0) + 1;
  }
  const knownSystems = Array.from(new Set(records.flatMap((r) => r.systemNames))).sort();
  return {
    byRole,
    publicSources: records.filter((r) => r.publicAccess).length,
    knownSystems,
  };
}

export interface BuildColoradoDataOwnershipResult {
  registry: DataOwnershipRegistryArtifact;
  workflow: ColoradoNemtWorkflowArtifact;
  accessPaths: DataAccessPathsArtifact;
  highValueTargets: HighValueDataTargetsArtifact;
}

export async function buildColoradoDataOwnership(): Promise<BuildColoradoDataOwnershipResult> {
  const records = [...COLORADO_OWNERSHIP_RECORDS];
  const workflow = buildWorkflow();
  const paths = records.map(accessLevelForRecord);
  const highValueTargets = buildHighValueTargets(records);

  const registry: DataOwnershipRegistryArtifact = {
    generatedAt: GENERATED_AT,
    state: "CO",
    total: records.length,
    records,
    summary: buildRegistrySummary(records),
  };

  const accessPaths: DataAccessPathsArtifact = {
    generatedAt: GENERATED_AT,
    total: paths.length,
    paths,
  };

  await mkdir(TRANSPO_DATA_DIR, { recursive: true });
  await Promise.all([
    writeFile(DATA_OWNERSHIP_REGISTRY_ARTIFACT_PATH, JSON.stringify(registry, null, 2), "utf8"),
    writeFile(COLORADO_NEMT_WORKFLOW_ARTIFACT_PATH, JSON.stringify(workflow, null, 2), "utf8"),
    writeFile(DATA_ACCESS_PATHS_ARTIFACT_PATH, JSON.stringify(accessPaths, null, 2), "utf8"),
    writeFile(HIGH_VALUE_DATA_TARGETS_ARTIFACT_PATH, JSON.stringify(highValueTargets, null, 2), "utf8"),
  ]);

  return { registry, workflow, accessPaths, highValueTargets };
}
