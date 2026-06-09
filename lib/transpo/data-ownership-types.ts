// lib/transpo/data-ownership-types.ts
// Data ownership map — who controls the ride ledger at each workflow step.

export type OwnershipRole =
  | "request_originator"
  | "authorization_owner"
  | "broker"
  | "dispatcher"
  | "provider"
  | "payer"
  | "auditor"
  | "complaint_owner"
  | "reporting_owner";

export type OrganizationType =
  | "hospital"
  | "dialysis"
  | "broker"
  | "state_agency"
  | "federal_agency"
  | "provider"
  | "aging_services"
  | "meals_program"
  | "software_vendor"
  | "payer"
  | "other";

export type AccessMethod =
  | "public"
  | "contract"
  | "open_records"
  | "foia"
  | "interview"
  | "unknown";

export type DataAccessLevel = "public" | "requestable" | "contract-only" | "unknown";

export interface DataOwnershipRecord {
  ownershipKey: string;
  county?: string;
  state: string;
  entityName: string;
  role: OwnershipRole;
  organizationType: OrganizationType;
  dataOwned: string[];
  systemNames: string[];
  publicAccess: boolean;
  accessMethod: AccessMethod;
  contactKnown: boolean;
  website?: string;
  sourceUrl?: string;
  confidence: number;
  notes?: string[];
}

export interface WorkflowStepTrace {
  stepKey: string;
  stepLabel: string;
  owner: string;
  ownerEntityKey: string;
  knownSystem?: string;
  knownDataHeld: string[];
  unknowns: string[];
  sourceUrl?: string;
}

export interface ColoradoNemtWorkflowArtifact {
  generatedAt: string;
  state: string;
  program: string;
  summary: string;
  steps: WorkflowStepTrace[];
}

export interface DataAccessPath {
  ownershipKey: string;
  entityName: string;
  role: OwnershipRole;
  canObtain: {
    requestedRides: DataAccessLevel;
    assignedRides: DataAccessLevel;
    completedRides: DataAccessLevel;
    cancelledRides: DataAccessLevel;
    rejectedRides: DataAccessLevel;
    complaints: DataAccessLevel;
    audits: DataAccessLevel;
  };
  accessLevel: DataAccessLevel;
  accessNotes: string[];
  sourceUrl?: string;
}

export interface DataAccessPathsArtifact {
  generatedAt: string;
  total: number;
  paths: DataAccessPath[];
}

export interface DataOpportunityScore {
  entity: string;
  ownershipKey: string;
  role: OwnershipRole;
  dataValueScore: number;
  accessDifficulty: number;
  estimatedInsightValue: number;
  insightTargets: string[];
  sourceUrl?: string;
}

export interface ClosestPathTarget {
  rank: number;
  entityName: string;
  ownershipKey: string;
  rationale: string;
  dataTypes: string[];
  accessMethod: AccessMethod;
  sourceUrl?: string;
}

export interface HighValueDataTargetsArtifact {
  generatedAt: string;
  total: number;
  targets: DataOpportunityScore[];
  closestPathToUnfilledRideData: ClosestPathTarget[];
  summary: {
    topInsightValue: number;
    publicSources: number;
    knownSystems: number;
  };
}

export interface DataOwnershipRegistryArtifact {
  generatedAt: string;
  state: string;
  total: number;
  records: DataOwnershipRecord[];
  summary: {
    byRole: Partial<Record<OwnershipRole, number>>;
    publicSources: number;
    knownSystems: string[];
  };
}
