// Derive display notices from governance sources (Agent 53).

import { prisma } from "@/lib/db/prisma";
import { buildContextSummary } from "@/lib/aihsafe/approvals/context-summary";
import { AuditEventKind } from "@/types/aihsafe/audit-events";
import { MsgNoticeKind, MsgNoticeStatus } from "@/types/msg-vault";
import type { AihApprovalRequest, AihAuditEvent, AihMsgNotice, Invite } from "@prisma/client";
import { derivedNoticeId, vaultRef } from "./refs";
import type { VaultNoticeDTO } from "./types";

const DERIVED_WINDOW_MS = 90 * 24 * 60 * 60 * 1000;

const NOTICE_AUDIT_KINDS = new Set<string>([
  AuditEventKind.MEMBERSHIP_GRANTED,
  AuditEventKind.MEMBERSHIP_REVOKED,
  AuditEventKind.FOUNDER_SETTINGS_UPDATED,
  AuditEventKind.VISIBILITY_CHANGED,
  AuditEventKind.INVITE_GUARDIAN_APPROVED,
  AuditEventKind.INVITE_GUARDIAN_DECLINED,
  AuditEventKind.TRUST_UNIT_MEMBER_ADDED,
]);

type NameMap = Map<string, { firstName: string; lastName: string }>;

function sinceDate(): Date {
  return new Date(Date.now() - DERIVED_WINDOW_MS);
}

function displayName(map: NameMap, userId: string): string {
  const u = map.get(userId);
  if (!u) return "Someone";
  return `${u.firstName} ${u.lastName}`.trim() || "Someone";
}

function unreadFromRef(readRefs: Set<string>, refKey: string): typeof MsgNoticeStatus.UNREAD | typeof MsgNoticeStatus.READ {
  return readRefs.has(refKey) ? MsgNoticeStatus.READ : MsgNoticeStatus.UNREAD;
}

function noticeKindForApproval(
  actionKind: string,
  state: string,
  role: "approver" | "requestor",
): (typeof MsgNoticeKind)[keyof typeof MsgNoticeKind] {
  if (role === "approver" && state === "pending") {
    return MsgNoticeKind.APPROVAL_REQUIRED;
  }
  if (actionKind === "activity.post_pending") {
    return state === "approved" ? MsgNoticeKind.POST_APPROVED : MsgNoticeKind.POST_DENIED;
  }
  if (actionKind === "invite.sent_child") {
    return state === "approved" ? MsgNoticeKind.INVITE_ACCEPTED : MsgNoticeKind.MEMBER_LEFT;
  }
  if (state === "approved") return MsgNoticeKind.POST_APPROVED;
  if (state === "denied" || state === "revoked") return MsgNoticeKind.POST_DENIED;
  return MsgNoticeKind.APPROVAL_REQUIRED;
}

export function buildApprovalNotices(
  userId: string,
  asApprover: AihApprovalRequest[],
  asRequestor: AihApprovalRequest[],
  names: NameMap,
  readRefs: Set<string>,
  skipApprovalIds: Set<string>,
): VaultNoticeDTO[] {
  const out: VaultNoticeDTO[] = [];
  const seen = new Set<string>();

  for (const row of asApprover) {
    if (row.state !== "pending") continue;
    if (skipApprovalIds.has(row.id)) continue;
    const refKey = `approval:${row.id}`;
    if (seen.has(refKey)) continue;
    seen.add(refKey);

    const summary = buildContextSummary(row.actionKind, row.contextJson);
    const requestorName = displayName(names, row.requestorId);

    out.push({
      id:                derivedNoticeId("approval", row.id),
      userId,
      conversationId:    null,
      trustUnitId:       null,
      approvalRequestId: row.id,
      kind:              MsgNoticeKind.APPROVAL_REQUIRED,
      title:             "Approval needed",
      body:              `${requestorName} needs your OK: ${summary}`,
      status:            unreadFromRef(readRefs, refKey),
      createdAt:         row.createdAt.toISOString(),
      readAt:            readRefs.has(refKey) ? new Date().toISOString() : null,
      source:            "approval",
      sourceId:          row.id,
      href:              "/aihsafe",
      contextLines:      [
        `Requestor: ${requestorName}`,
        `Action: ${row.actionKind}`,
        `State: ${row.state}`,
        summary,
      ],
    });
  }

  for (const row of asRequestor) {
    if (row.state === "pending") continue;
    if (skipApprovalIds.has(row.id)) continue;
    const refKey = `approval:requestor:${row.id}`;
    if (seen.has(refKey)) continue;
    seen.add(refKey);

    const summary = buildContextSummary(row.actionKind, row.contextJson);
    const approverName = displayName(names, row.approverId);

    out.push({
      id:                derivedNoticeId("approval", `requestor-${row.id}`),
      userId,
      conversationId:    null,
      trustUnitId:       null,
      approvalRequestId: row.id,
      kind:              noticeKindForApproval(row.actionKind, row.state, "requestor"),
      title:             row.state === "approved" ? "Request approved" : "Request denied",
      body:              `${approverName} ${row.state} your request: ${summary}`,
      status:            unreadFromRef(readRefs, refKey),
      createdAt:         (row.resolvedAt ?? row.updatedAt).toISOString(),
      readAt:            readRefs.has(refKey) ? new Date().toISOString() : null,
      source:            "approval",
      sourceId:          row.id,
      href:              "/aihsafe",
      contextLines:      [
        `Approver: ${approverName}`,
        `Action: ${row.actionKind}`,
        `State: ${row.state}`,
        summary,
      ],
    });
  }

  return out;
}

export function buildInviteNotices(
  userId: string,
  invites: Invite[],
  readRefs: Set<string>,
): VaultNoticeDTO[] {
  const out: VaultNoticeDTO[] = [];

  for (const inv of invites) {
    const refKey = `invite:${inv.id}`;
    let kind: (typeof MsgNoticeKind)[keyof typeof MsgNoticeKind];
    let title: string;
    let body: string;
    let href: string | null = "/invite";

    switch (inv.status) {
      case "ACCEPTED":
        kind = MsgNoticeKind.INVITE_ACCEPTED;
        title = "Invite accepted";
        body = `${inv.recipientEmail} passed the identity check for your invite.`;
        break;
      case "REGISTERED":
        kind = MsgNoticeKind.MEMBER_JOINED;
        title = "Member joined";
        body = `${inv.recipientEmail} registered and joined your tree.`;
        href = "/tree";
        break;
      case "CANCELLED":
        kind = MsgNoticeKind.MEMBER_LEFT;
        title = "Invite cancelled";
        body = `You cancelled the invite to ${inv.recipientEmail}.`;
        break;
      case "EXPIRED":
        kind = MsgNoticeKind.MEMBER_LEFT;
        title = "Invite expired";
        body = `The invite to ${inv.recipientEmail} expired without completing registration.`;
        break;
      default:
        continue;
    }

    out.push({
      id:                derivedNoticeId("invite", inv.id),
      userId,
      conversationId:    null,
      trustUnitId:       null,
      approvalRequestId: null,
      kind,
      title,
      body,
      status:            unreadFromRef(readRefs, refKey),
      createdAt:         (inv.acceptedAt ?? inv.createdAt).toISOString(),
      readAt:            readRefs.has(refKey) ? new Date().toISOString() : null,
      source:            "invite",
      sourceId:          inv.id,
      href,
      contextLines:      [
        `Recipient: ${inv.recipientEmail}`,
        inv.relationship ? `Relationship: ${inv.relationship}` : "",
        `Status: ${inv.status}`,
      ].filter(Boolean),
    });
  }

  return out;
}

function auditToNotice(
  userId: string,
  row: AihAuditEvent,
  names: NameMap,
  readRefs: Set<string>,
): VaultNoticeDTO | null {
  if (!NOTICE_AUDIT_KINDS.has(row.kind)) return null;

  const refKey = `audit:${row.id}`;
  const actor = displayName(names, row.actorId);
  const meta =
    typeof row.meta === "object" && row.meta !== null
      ? (row.meta as Record<string, unknown>)
      : {};

  let kind: (typeof MsgNoticeKind)[keyof typeof MsgNoticeKind];
  let title: string;
  let body: string;
  let href: string | null = "/aihsafe";
  const contextLines: string[] = [`Event: ${row.kind}`, `Actor: ${actor}`];

  switch (row.kind) {
    case AuditEventKind.MEMBERSHIP_GRANTED:
      kind = MsgNoticeKind.MEMBER_JOINED;
      title = row.actorId === userId ? "You joined a space" : "Member joined";
      body =
        typeof meta.spaceName === "string"
          ? `${actor} joined "${meta.spaceName}".`
          : `${actor} was granted membership in a trust space.`;
      break;
    case AuditEventKind.MEMBERSHIP_REVOKED:
    case AuditEventKind.TRUST_UNIT_MEMBER_ADDED:
      if (row.kind === AuditEventKind.TRUST_UNIT_MEMBER_ADDED) {
        kind = MsgNoticeKind.MEMBER_JOINED;
        title = "Trust space updated";
        body =
          typeof meta.spaceName === "string"
            ? `A member was added to "${meta.spaceName}".`
            : "A member was added to a trust space.";
      } else {
        kind = MsgNoticeKind.MEMBER_LEFT;
        title = "Member left";
        body = `${actor} left or was removed from a trust space.`;
      }
      break;
    case AuditEventKind.FOUNDER_SETTINGS_UPDATED:
      kind = MsgNoticeKind.POLICY_CHANGED;
      title = "Policy updated";
      body = "Family Safe founder settings were updated.";
      contextLines.push("Review Family Safe for current limits and visibility.");
      break;
    case AuditEventKind.VISIBILITY_CHANGED:
      kind = MsgNoticeKind.POLICY_CHANGED;
      title = "Visibility changed";
      body =
        typeof meta.scope === "string"
          ? `Visibility scope changed to ${meta.scope}.`
          : "A visibility policy was changed in your network.";
      break;
    case AuditEventKind.INVITE_GUARDIAN_APPROVED:
      kind = MsgNoticeKind.INVITE_ACCEPTED;
      title = "Child invite approved";
      body = `${actor} approved a guardian-gated invite.`;
      break;
    case AuditEventKind.INVITE_GUARDIAN_DECLINED:
      kind = MsgNoticeKind.MEMBER_LEFT;
      title = "Child invite declined";
      body = `${actor} declined a guardian-gated invite.`;
      break;
    default:
      return null;
  }

  if (row.targetId) contextLines.push(`Target: ${row.targetId}`);

  return {
    id:                derivedNoticeId("audit", row.id),
    userId,
    conversationId:    null,
    trustUnitId:       typeof meta.trustUnitId === "string" ? meta.trustUnitId : null,
    approvalRequestId: null,
    kind,
    title,
    body,
    status:            unreadFromRef(readRefs, refKey),
    createdAt:         row.createdAt.toISOString(),
    readAt:            readRefs.has(refKey) ? new Date().toISOString() : null,
    source:            "audit",
    sourceId:          row.id,
    href,
    contextLines,
  };
}

export function buildAuditNotices(
  userId: string,
  events: AihAuditEvent[],
  names: NameMap,
  readRefs: Set<string>,
): VaultNoticeDTO[] {
  return events
    .map((e) => auditToNotice(userId, e, names, readRefs))
    .filter((n): n is VaultNoticeDTO => n !== null);
}

export async function loadDerivedSourceData(userId: string) {
  const since = sinceDate();
  const memberships = await prisma.trustUnitMember.findMany({
    where: { userId },
    select: { trustUnitId: true },
  });
  const trustUnitIds = memberships.map((m) => m.trustUnitId);

  const familyMemberships = await prisma.aihFamilyUnitMember.findMany({
    where: { userId, exitedAt: null },
    select: { familyUnitId: true },
  });
  const familyUnitIds = familyMemberships.map((m) => m.familyUnitId);

  const [asApprover, asRequestor, sentInvites, auditEvents] = await Promise.all([
    prisma.aihApprovalRequest.findMany({
      where: {
        approverId: userId,
        state: "pending",
      },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
    prisma.aihApprovalRequest.findMany({
      where: {
        requestorId: userId,
        state: { not: "pending" },
        resolvedAt: { gte: since },
      },
      orderBy: { resolvedAt: "desc" },
      take: 40,
    }),
    prisma.invite.findMany({
      where: {
        senderId: userId,
        status: { in: ["ACCEPTED", "REGISTERED", "CANCELLED", "EXPIRED"] },
        OR: [
          { createdAt: { gte: since } },
          { acceptedAt: { gte: since } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.aihAuditEvent.findMany({
      where: {
        kind: { in: Array.from(NOTICE_AUDIT_KINDS) },
        createdAt: { gte: since },
        OR: [
          { actorId: userId },
          { targetId: userId },
          ...(trustUnitIds.length > 0 ? [{ targetId: { in: trustUnitIds } }] : []),
          ...(familyUnitIds.length > 0 ? [{ targetId: { in: familyUnitIds } }] : []),
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  return { asApprover, asRequestor, sentInvites, auditEvents };
}

export function collectUserIdsForNames(
  approvals: AihApprovalRequest[],
  audits: AihAuditEvent[],
): string[] {
  const ids = new Set<string>();
  for (const a of approvals) {
    ids.add(a.requestorId);
    ids.add(a.approverId);
  }
  for (const e of audits) {
    ids.add(e.actorId);
    if (e.targetId) ids.add(e.targetId);
  }
  return Array.from(ids);
}

export async function loadNameMap(userIds: string[]): Promise<NameMap> {
  if (userIds.length === 0) return new Map();
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, firstName: true, lastName: true },
  });
  return new Map(users.map((u) => [u.id, { firstName: u.firstName, lastName: u.lastName }]));
}

export function extractReadRefs(rows: AihMsgNotice[]): Set<string> {
  const refs = new Set<string>();
  for (const row of rows) {
    const m = row.body.match(/<!--vault-ref:([^>]+)-->/);
    if (m?.[1]) refs.add(m[1]);
    if (row.status === "READ" && row.approvalRequestId) {
      refs.add(`approval:${row.approvalRequestId}`);
    }
  }
  return refs;
}

export function persistedToVault(row: AihMsgNotice): VaultNoticeDTO {
  return {
    id:                row.id,
    userId:            row.userId,
    conversationId:    row.conversationId,
    trustUnitId:       row.trustUnitId,
    approvalRequestId: row.approvalRequestId,
    kind:              row.kind,
    title:             row.title,
    body:              row.body.replace(/<!--vault-ref:[^>]+-->/, "").trim(),
    status:            row.status,
    createdAt:         row.createdAt.toISOString(),
    readAt:            row.readAt?.toISOString() ?? null,
    source:            "persisted",
    sourceId:          row.id,
    href:              row.conversationId
      ? `/msg-vault`
      : row.approvalRequestId
        ? "/aihsafe"
        : null,
    contextLines:      [
      row.approvalRequestId ? `Linked approval: ${row.approvalRequestId}` : "",
      row.conversationId ? `Conversation: ${row.conversationId}` : "",
    ].filter(Boolean),
  };
}
