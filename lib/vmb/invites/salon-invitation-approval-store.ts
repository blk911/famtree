import { parseInviteTemplateSnapshot } from "@/lib/vmb/invites/invite-template-snapshot";
import {
  approvalDedupeKey,
  buildApprovalDedupeKey,
  cloneInviteTemplateSnapshot,
} from "@/lib/vmb/invites/salon-invitation-approval-workflow";
import { getVmbSalonInvitationApprovalsFile } from "@/lib/vmb/paths";
import { readJsonArray, writeJsonArray } from "@/lib/vmb/runtime-json-store";
import { assertVmbWritableBackend } from "@/lib/vmb/storage-policy";
import type {
  CreateSalonInvitationApprovalInput,
  SalonInvitationApproval,
  SalonInvitationApprovalStatus,
} from "@/types/vmb/salon-invitation-approval";

type StoredSalonInvitationApproval = {
  salonId: string;
  approval: SalonInvitationApproval;
};

function isStoredSalonInvitationApproval(item: unknown): item is StoredSalonInvitationApproval {
  if (!item || typeof item !== "object") return false;
  const row = item as StoredSalonInvitationApproval;
  return typeof row.salonId === "string" && !!row.approval && typeof row.approval.id === "string";
}

function isSalonInvitationApproval(item: unknown): item is SalonInvitationApproval {
  if (!item || typeof item !== "object") return false;
  const row = item as SalonInvitationApproval;
  const snapshot = parseInviteTemplateSnapshot(row.snapshot);
  return (
    typeof row.id === "string" &&
    typeof row.salonId === "string" &&
    typeof row.clientName === "string" &&
    typeof row.opportunityType === "string" &&
    typeof row.sourceCopyId === "string" &&
    typeof row.sourceTemplateId === "string" &&
    typeof row.reasonText === "string" &&
    (row.status === "approved" || row.status === "sent" || row.status === "paused") &&
    !!snapshot
  );
}

function normalizeApproval(raw: SalonInvitationApproval): SalonInvitationApproval | null {
  const snapshot = parseInviteTemplateSnapshot(raw.snapshot);
  if (!snapshot) return null;
  return {
    ...raw,
    snapshot: cloneInviteTemplateSnapshot(snapshot),
  };
}

async function listStoredJson(): Promise<StoredSalonInvitationApproval[]> {
  return readJsonArray(getVmbSalonInvitationApprovalsFile(), isStoredSalonInvitationApproval);
}

function createApprovalId(salonId: string): string {
  return `${salonId}-approval-${Date.now()}`;
}

function findByDedupeKey(
  rows: StoredSalonInvitationApproval[],
  salonId: string,
  dedupeKey: string,
): SalonInvitationApproval | null {
  for (const row of rows) {
    if (row.salonId !== salonId) continue;
    const normalized = normalizeApproval(row.approval);
    if (!normalized) continue;
    if (approvalDedupeKey(normalized) === dedupeKey) return normalized;
  }
  return null;
}

export async function listSalonInvitationApprovals(
  salonId: string,
): Promise<SalonInvitationApproval[]> {
  const all = await listStoredJson();
  return all
    .filter((row) => row.salonId === salonId)
    .map((row) => normalizeApproval(row.approval))
    .filter((row): row is SalonInvitationApproval => !!row)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getSalonInvitationApproval(
  salonId: string,
  approvalId: string,
): Promise<SalonInvitationApproval | null> {
  const rows = await listSalonInvitationApprovals(salonId);
  return rows.find((row) => row.id === approvalId) ?? null;
}

export async function createSalonInvitationApproval(
  salonId: string,
  input: CreateSalonInvitationApprovalInput,
): Promise<{ approval: SalonInvitationApproval; created: boolean } | { error: string }> {
  const writable = await assertVmbWritableBackend();
  if (!writable.ok) return { error: writable.error };

  const snapshot = parseInviteTemplateSnapshot(input.snapshot);
  if (!snapshot) return { error: "Invalid invitation snapshot." };

  const dedupeKey = buildApprovalDedupeKey({
    salonId,
    opportunityId: input.opportunityId,
    clientName: input.clientName,
    opportunityType: input.opportunityType,
    sourceCopyId: input.sourceCopyId,
  });

  const all = await listStoredJson();
  const existing = findByDedupeKey(all, salonId, dedupeKey);
  if (existing) {
    return { approval: existing, created: false };
  }

  const now = new Date().toISOString();
  const approval: SalonInvitationApproval = {
    id: createApprovalId(salonId),
    salonId,
    clientName: input.clientName.trim(),
    clientEmail: input.clientEmail?.trim() || undefined,
    opportunityId: input.opportunityId?.trim() || undefined,
    opportunityType: input.opportunityType,
    sourceCopyId: input.sourceCopyId,
    sourceTemplateId: input.sourceTemplateId,
    snapshot: cloneInviteTemplateSnapshot(snapshot),
    reasonText: input.reasonText,
    estimatedValue: input.estimatedValue,
    status: input.status,
    approvedAt: input.status === "approved" ? now : undefined,
    createdAt: now,
    updatedAt: now,
  };

  if (!isSalonInvitationApproval(approval)) {
    return { error: "Could not create approval record." };
  }

  const err = await writeJsonArray(getVmbSalonInvitationApprovalsFile(), [
    ...all.filter((row) => row.approval.id !== approval.id),
    { salonId, approval },
  ]);
  if (err) return { error: err };

  return { approval, created: true };
}

export async function approveSalonInvitation(
  salonId: string,
  input: Omit<CreateSalonInvitationApprovalInput, "status">,
): Promise<{ approval: SalonInvitationApproval; created: boolean } | { error: string }> {
  const dedupeKey = buildApprovalDedupeKey({
    salonId,
    opportunityId: input.opportunityId,
    clientName: input.clientName,
    opportunityType: input.opportunityType,
    sourceCopyId: input.sourceCopyId,
  });

  const all = await listStoredJson();
  const existing = findByDedupeKey(all, salonId, dedupeKey);
  if (existing) {
    if (existing.status === "approved" || existing.status === "sent") {
      return { approval: existing, created: false };
    }
    return updateSalonInvitationApprovalStatus(salonId, existing.id, "approved");
  }

  return createSalonInvitationApproval(salonId, { ...input, status: "approved" });
}

export async function pauseSalonInvitationApproval(
  salonId: string,
  input: CreateSalonInvitationApprovalInput,
): Promise<{ approval: SalonInvitationApproval; created: boolean } | { error: string }> {
  const dedupeKey = buildApprovalDedupeKey({
    salonId,
    opportunityId: input.opportunityId,
    clientName: input.clientName,
    opportunityType: input.opportunityType,
    sourceCopyId: input.sourceCopyId,
  });

  const all = await listStoredJson();
  const existing = findByDedupeKey(all, salonId, dedupeKey);
  if (existing) {
    return updateSalonInvitationApprovalStatus(salonId, existing.id, "paused");
  }

  return createSalonInvitationApproval(salonId, { ...input, status: "paused" });
}

export async function updateSalonInvitationApprovalStatus(
  salonId: string,
  approvalId: string,
  status: SalonInvitationApprovalStatus,
): Promise<{ approval: SalonInvitationApproval; created: boolean } | { error: string }> {
  const writable = await assertVmbWritableBackend();
  if (!writable.ok) return { error: writable.error };

  const all = await listStoredJson();
  const index = all.findIndex((row) => row.salonId === salonId && row.approval.id === approvalId);
  if (index < 0) return { error: "Approval record not found." };

  const current = normalizeApproval(all[index]!.approval);
  if (!current) return { error: "Approval record is invalid." };

  const now = new Date().toISOString();
  const updated: SalonInvitationApproval = {
    ...current,
    status,
    approvedAt: status === "approved" ? current.approvedAt ?? now : current.approvedAt,
    updatedAt: now,
  };

  const next = [...all];
  next[index] = { salonId, approval: updated };
  const err = await writeJsonArray(getVmbSalonInvitationApprovalsFile(), next);
  if (err) return { error: err };

  return { approval: updated, created: false };
}

export async function patchSalonInvitationApprovalSnapshot(
  salonId: string,
  approvalId: string,
  nextSnapshot: SalonInvitationApproval["snapshot"],
): Promise<{ approval: SalonInvitationApproval } | { error: string }> {
  const writable = await assertVmbWritableBackend();
  if (!writable.ok) return { error: writable.error };

  const parsed = parseInviteTemplateSnapshot(nextSnapshot);
  if (!parsed) return { error: "Invalid invitation snapshot." };

  const all = await listStoredJson();
  const index = all.findIndex((row) => row.salonId === salonId && row.approval.id === approvalId);
  if (index < 0) return { error: "Approval record not found." };

  const current = normalizeApproval(all[index]!.approval);
  if (!current) return { error: "Approval record is invalid." };

  const updated: SalonInvitationApproval = {
    ...current,
    snapshot: cloneInviteTemplateSnapshot(parsed),
    updatedAt: new Date().toISOString(),
  };

  const next = [...all];
  next[index] = { salonId, approval: updated };
  const err = await writeJsonArray(getVmbSalonInvitationApprovalsFile(), next);
  if (err) return { error: err };

  return { approval: updated };
}
