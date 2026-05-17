// AIH Safe — typed fetch helpers for every live API endpoint.
// Returns a discriminated union so callers never need to inspect HTTP status codes directly.
// All shapes match the normalized envelope from lib/aihsafe/api/envelopes.ts.

import type {
  FamilyUnitDTO,
  TrustUnitDTO,
  InviteDTO,
  ApprovalRequestDTO,
  GuardianLinkDTO,
  ActivityPostDTO,
  ActivityCommentDTO,
  CreateActivityPostRequest,
  FounderSettingsDTO,
  PatchFounderSettingsRequest,
} from "@/types/aihsafe/dto";

// ─── Result union ─────────────────────────────────────────────────────────────

export type AihSuccess<T>  = { kind: "ok";      data: T };
export type AihEscalated   = {
  kind:              "pending";
  approvalRequestId: string;
  expiresAt:         string;
  actionKind:        string;
  reason:            string;
  reasonCode:        string;
};
export type AihDenied = { kind: "denied"; code: string; message: string };
export type AihError  = { kind: "error";  message: string };

export type AihResult<T> = AihSuccess<T> | AihEscalated | AihDenied | AihError;

export interface Paginated<T> {
  items:      T[];
  pagination: { cursor: string | null; hasMore: boolean; total: number | null };
}

// ─── Envelope parser ──────────────────────────────────────────────────────────

async function parseEnvelope<T>(res: Response): Promise<AihResult<T>> {
  let body: Record<string, unknown>;
  try {
    body = await res.json();
  } catch {
    return { kind: "error", message: "Unexpected server response." };
  }

  // 202 Accepted — escalated to guardian approval
  if (res.status === 202 && body.ok) {
    const pending = body.pending as Record<string, string> | undefined;
    const gov     = body.governance as Record<string, unknown> | undefined;
    return {
      kind:              "pending",
      approvalRequestId: pending?.approvalRequestId ?? "",
      expiresAt:         pending?.expiresAt ?? "",
      actionKind:        pending?.actionKind ?? "",
      reason:            String(gov?.reason ?? "Guardian approval required."),
      reasonCode:        String(gov?.reasonCode ?? "REQUIRES_GUARDIAN_APPROVAL"),
    };
  }

  if (!body.ok) {
    const err = body.error as Record<string, unknown> | undefined;
    const gov  = body.governance as Record<string, unknown> | undefined;
    // Governance denial — carry reasonCode so UI can branch on stable codes
    if (gov?.reasonCode) {
      return {
        kind:    "denied",
        code:    String(gov.reasonCode),
        message: String(err?.message ?? gov.reason ?? "Action not allowed."),
      };
    }
    return { kind: "error", message: String(err?.message ?? "Something went wrong.") };
  }

  return { kind: "ok", data: body.data as T };
}

function jsonPost(body: unknown): RequestInit {
  return {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  };
}

// ─── Family units ─────────────────────────────────────────────────────────────

export async function listFamilyUnits(): Promise<AihResult<Paginated<FamilyUnitDTO>>> {
  return parseEnvelope(await fetch("/api/aihsafe/family"));
}

export async function createFamilyUnit(name: string): Promise<AihResult<FamilyUnitDTO>> {
  return parseEnvelope(await fetch("/api/aihsafe/family", jsonPost({ name })));
}

// ─── Trust units ──────────────────────────────────────────────────────────────

export async function listTrustUnits(): Promise<AihResult<Paginated<TrustUnitDTO>>> {
  return parseEnvelope(await fetch("/api/aihsafe/trust-units"));
}

export async function createTrustUnit(payload: {
  vaultSpaceType: string;
  name: string;
  description?: string;
  memberIds?: string[];
}): Promise<AihResult<TrustUnitDTO>> {
  return parseEnvelope(await fetch("/api/aihsafe/trust-units", jsonPost(payload)));
}

// ─── Invites ──────────────────────────────────────────────────────────────────

export async function listInvites(): Promise<AihResult<Paginated<InviteDTO>>> {
  return parseEnvelope(await fetch("/api/aihsafe/invites"));
}

export async function sendInvite(payload: {
  recipientEmail: string;
  relationship:   string;
  trustUnitId?:   string;
  familyUnitId?:  string;
  targetAgeTier?: string;
}): Promise<AihResult<InviteDTO>> {
  return parseEnvelope(await fetch("/api/aihsafe/invites", jsonPost(payload)));
}

// ─── Approvals ────────────────────────────────────────────────────────────────

export async function listApprovals(
  state: "pending" | "approved" | "denied" | "revoked" | "expired" = "pending"
): Promise<AihResult<Paginated<ApprovalRequestDTO>>> {
  return parseEnvelope(
    await fetch(`/api/aihsafe/approvals?state=${encodeURIComponent(state)}`)
  );
}

export async function resolveApproval(
  requestId: string,
  action:    "approve" | "deny",
  note?:     string
): Promise<AihResult<ApprovalRequestDTO>> {
  return parseEnvelope(
    await fetch("/api/aihsafe/approvals", jsonPost({ requestId, action, ...(note ? { note } : {}) }))
  );
}

export async function listMyEscalations(
  state: "pending" | "approved" | "denied" | "revoked" | "expired" = "pending"
): Promise<AihResult<Paginated<ApprovalRequestDTO>>> {
  return parseEnvelope(
    await fetch(`/api/aihsafe/escalations/mine?state=${encodeURIComponent(state)}`)
  );
}

// ─── Guardian links ───────────────────────────────────────────────────────────

export async function listGuardianLinks(): Promise<AihResult<Paginated<GuardianLinkDTO>>> {
  return parseEnvelope(await fetch("/api/aihsafe/guardian-links"));
}

// ─── Activity feed ────────────────────────────────────────────────────────────

export async function listActivityFeed(
  cursor?: string,
  opts?: { limit?: number; trustUnitId?: string | null }
): Promise<AihResult<Paginated<ActivityPostDTO>>> {
  const params = new URLSearchParams();
  if (cursor) params.set("cursor", cursor);
  if (opts?.limit != null) params.set("limit", String(opts.limit));
  if (opts?.trustUnitId) params.set("trustUnitId", opts.trustUnitId);
  const q = params.toString();
  return parseEnvelope(await fetch(`/api/aihsafe/activity${q ? `?${q}` : ""}`));
}

export async function createActivityPost(
  data: CreateActivityPostRequest
): Promise<AihResult<ActivityPostDTO>> {
  return parseEnvelope(await fetch("/api/aihsafe/activity", jsonPost(data)));
}

export async function listComments(
  postId: string
): Promise<AihResult<Paginated<ActivityCommentDTO>>> {
  return parseEnvelope(
    await fetch(`/api/aihsafe/activity/${encodeURIComponent(postId)}/comments`)
  );
}

export async function createComment(
  postId: string,
  body: string
): Promise<AihResult<ActivityCommentDTO>> {
  return parseEnvelope(
    await fetch(
      `/api/aihsafe/activity/${encodeURIComponent(postId)}/comments`,
      jsonPost({ body })
    )
  );
}

// ─── Founder settings ─────────────────────────────────────────────────────────

export async function getFounderSettings(): Promise<AihResult<FounderSettingsDTO>> {
  return parseEnvelope(await fetch("/api/aihsafe/founder-settings"));
}

export async function patchFounderSettings(
  patch: PatchFounderSettingsRequest
): Promise<AihResult<FounderSettingsDTO>> {
  return parseEnvelope(
    await fetch("/api/aihsafe/founder-settings", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(patch),
    })
  );
}

// ─── Memberships ──────────────────────────────────────────────────────────────

export async function exitMembership(
  membershipId: string
): Promise<AihResult<{ membershipId: string }>> {
  return parseEnvelope(
    await fetch(`/api/aihsafe/memberships/${encodeURIComponent(membershipId)}`, { method: "DELETE" })
  );
}
