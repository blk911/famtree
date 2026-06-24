import crypto from "crypto";
import { prisma, resolveVmbStorageBackend } from "@/lib/vmb/db";
import { assertVmbMoneyWritableBackend } from "@/lib/vmb/storage-policy";
import type { InviteClaim, SalonClaimTimelineItem, SentInvite, SentInvitePublicSnapshot } from "./sent-invite-types";
import { generateRecipientToken, hashRecipientToken } from "./sent-invite-token";

type PayloadRow = { payload: unknown };
let jsonMutation = Promise.resolve();
let memoryInvites: SentInvite[] = [];
let memoryClaims: InviteClaim[] = [];

function isSentInvite(value: unknown): value is SentInvite {
  if (!value || typeof value !== "object") return false;
  const row = value as SentInvite;
  return typeof row.id === "string" && typeof row.salonId === "string" && typeof row.tokenHash === "string";
}

function isInviteClaim(value: unknown): value is InviteClaim {
  if (!value || typeof value !== "object") return false;
  const row = value as InviteClaim;
  return typeof row.id === "string" && typeof row.sentInviteId === "string" && typeof row.salonId === "string";
}

function serializeJson<T>(operation: () => Promise<T>): Promise<T> {
  const run = jsonMutation.then(operation, operation);
  jsonMutation = run.then(() => undefined, () => undefined);
  return run;
}

export function resetSentInviteMemoryStoreForTests(): void {
  if (process.env.VMB_MONEY_TEST_MEMORY !== "1") throw new Error("Test memory backend is not enabled");
  memoryInvites = [];
  memoryClaims = [];
  jsonMutation = Promise.resolve();
}

function parseSent(row: PayloadRow | undefined): SentInvite | undefined {
  return row && isSentInvite(row.payload) ? row.payload : undefined;
}

function parseClaim(row: PayloadRow | undefined): InviteClaim | undefined {
  return row && isInviteClaim(row.payload) ? row.payload : undefined;
}

function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

export async function createSentInvite(input: {
  salonId: string;
  sourceApprovalId: string;
  sourceCopyId: string;
  snapshot: SentInvitePublicSnapshot;
  expiresAt: string;
}): Promise<{ sentInvite: SentInvite; recipientToken: string } | { error: string; status: number }> {
  const writable = await assertVmbMoneyWritableBackend();
  if (!writable.ok) return { error: writable.error, status: 503 };
  const recipientToken = generateRecipientToken();
  const now = new Date().toISOString();
  const sentInvite: SentInvite = {
    id: newId("sent"),
    salonId: input.salonId,
    sourceApprovalId: input.sourceApprovalId,
    sourceCopyId: input.sourceCopyId,
    status: "sent",
    tokenHash: hashRecipientToken(recipientToken),
    snapshot: structuredClone(input.snapshot),
    sentAt: now,
    expiresAt: input.expiresAt,
    createdAt: now,
    updatedAt: now,
  };

  if (writable.backend === "postgres") {
    try {
      const inserted = await prisma.$queryRaw<Array<{ sent_invite_id: string }>>`
        INSERT INTO vmb_sent_invite (
          sent_invite_id, salon_id, source_approval_id, token_hash, status, expires_at, payload, updated_at
        ) VALUES (
          ${sentInvite.id}, ${sentInvite.salonId}, ${sentInvite.sourceApprovalId}, ${sentInvite.tokenHash},
          ${sentInvite.status}, ${new Date(sentInvite.expiresAt)}, ${JSON.stringify(sentInvite)}::jsonb, now()
        )
        ON CONFLICT (salon_id, source_approval_id) DO NOTHING
        RETURNING sent_invite_id
      `;
      if (inserted.length === 0) return { error: "Invitation has already been sent", status: 409 };
      return { sentInvite, recipientToken };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Could not create sent invite", status: 503 };
    }
  }

  return serializeJson(async () => {
    const all = memoryInvites;
    if (all.some((row) => row.salonId === input.salonId && row.sourceApprovalId === input.sourceApprovalId)) {
      return { error: "Invitation has already been sent", status: 409 } as const;
    }
    memoryInvites = [...all, sentInvite];
    return { sentInvite, recipientToken } as const;
  });
}

export async function getSentInviteByToken(token: string): Promise<SentInvite | undefined> {
  const tokenHash = hashRecipientToken(token);
  if ((await resolveVmbStorageBackend()) === "postgres") {
    const rows = await prisma.$queryRaw<PayloadRow[]>`
      SELECT payload FROM vmb_sent_invite WHERE token_hash = ${tokenHash} LIMIT 1
    `;
    return parseSent(rows[0]);
  }
  return process.env.VMB_MONEY_TEST_MEMORY === "1"
    ? memoryInvites.find((row) => row.tokenHash === tokenHash)
    : undefined;
}

export async function markSentInviteOpened(sentInvite: SentInvite): Promise<{ sentInvite: SentInvite } | { error: string; status: 503 }> {
  const writable = await assertVmbMoneyWritableBackend();
  if (!writable.ok) return { error: writable.error, status: 503 };
  if (sentInvite.status !== "sent") return { sentInvite };
  const next = { ...sentInvite, status: "opened" as const, openedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  if (writable.backend === "postgres") {
    await prisma.$executeRaw`
      UPDATE vmb_sent_invite SET status = 'opened', payload = ${JSON.stringify(next)}::jsonb, updated_at = now()
      WHERE sent_invite_id = ${sentInvite.id} AND status = 'sent'
    `;
    return { sentInvite: next };
  }
  return serializeJson(async () => {
    const all = memoryInvites;
    const current = all.find((row) => row.id === sentInvite.id);
    if (!current || current.status !== "sent") return { sentInvite: current ?? sentInvite };
    memoryInvites = all.map((row) => row.id === sentInvite.id ? next : row);
    return { sentInvite: next };
  });
}

export type ClaimSentInviteResult =
  | { ok: true; claim: InviteClaim; existing: boolean }
  | { ok: false; error: string; status: 404 | 409 | 410 | 503 };

export async function claimSentInvite(input: {
  token: string;
  clientName: string;
  recipientContactSummary: string;
  recipientContactHash: string;
}): Promise<ClaimSentInviteResult> {
  const tokenHash = hashRecipientToken(input.token);
  const now = new Date();
  const writable = await assertVmbMoneyWritableBackend();
  if (!writable.ok) return { ok: false, error: writable.error, status: 503 };
  if (writable.backend === "postgres") {
    try {
      return await prisma.$transaction(async (tx) => {
        const rows = await tx.$queryRaw<PayloadRow[]>`
          SELECT payload FROM vmb_sent_invite WHERE token_hash = ${tokenHash} FOR UPDATE
        `;
        const invite = parseSent(rows[0]);
        if (!invite) return { ok: false, error: "Invite not found", status: 404 } as const;
        if (new Date(invite.expiresAt) <= now) return { ok: false, error: "This invite has expired", status: 410 } as const;
        if (invite.status === "redeemed" || invite.status === "cancelled" || invite.status === "expired") {
          return { ok: false, error: `This invite is ${invite.status}`, status: 409 } as const;
        }
        const existingRows = await tx.$queryRaw<PayloadRow[]>`
          SELECT payload FROM vmb_invite_claim WHERE sent_invite_id = ${invite.id} LIMIT 1
        `;
        const existing = parseClaim(existingRows[0]);
        if (existing) {
          return existing.recipientContactHash === input.recipientContactHash
            ? ({ ok: true, claim: existing, existing: true } as const)
            : ({ ok: false, error: "already_claimed_by_other", status: 409 } as const);
        }
        if (invite.status !== "sent" && invite.status !== "opened") {
          return { ok: false, error: "This invite cannot be claimed", status: 409 } as const;
        }
        const claimedAt = now.toISOString();
        const claim: InviteClaim = { id: newId("claim"), sentInviteId: invite.id, salonId: invite.salonId, clientName: input.clientName, recipientContactSummary: input.recipientContactSummary, recipientContactHash: input.recipientContactHash, claimedAt };
        const next: SentInvite = { ...invite, status: "claimed", claimedAt, updatedAt: claimedAt };
        await tx.$executeRaw`
          INSERT INTO vmb_invite_claim (claim_id, sent_invite_id, salon_id, payload, claimed_at)
          VALUES (${claim.id}, ${claim.sentInviteId}, ${claim.salonId}, ${JSON.stringify(claim)}::jsonb, ${now})
        `;
        await tx.$executeRaw`
          UPDATE vmb_sent_invite SET status = 'claimed', payload = ${JSON.stringify(next)}::jsonb, updated_at = now()
          WHERE sent_invite_id = ${invite.id}
        `;
        return { ok: true, claim, existing: false } as const;
      });
    } catch {
      return { ok: false, error: "Could not record claim", status: 503 };
    }
  }

  return serializeJson(async () => {
    const invites = memoryInvites;
    const invite = invites.find((row) => row.tokenHash === tokenHash);
    if (!invite) return { ok: false, error: "Invite not found", status: 404 } as const;
    if (new Date(invite.expiresAt) <= now) return { ok: false, error: "This invite has expired", status: 410 } as const;
    if (invite.status === "redeemed" || invite.status === "cancelled" || invite.status === "expired") return { ok: false, error: `This invite is ${invite.status}`, status: 409 } as const;
    const claims = memoryClaims;
    const existing = claims.find((row) => row.sentInviteId === invite.id);
    if (existing) {
      return existing.recipientContactHash === input.recipientContactHash
        ? ({ ok: true, claim: existing, existing: true } as const)
        : ({ ok: false, error: "already_claimed_by_other", status: 409 } as const);
    }
    if (invite.status !== "sent" && invite.status !== "opened") return { ok: false, error: "This invite cannot be claimed", status: 409 } as const;
    const claimedAt = now.toISOString();
    const claim: InviteClaim = { id: newId("claim"), sentInviteId: invite.id, salonId: invite.salonId, clientName: input.clientName, recipientContactSummary: input.recipientContactSummary, recipientContactHash: input.recipientContactHash, claimedAt };
    const next = { ...invite, status: "claimed" as const, claimedAt, updatedAt: claimedAt };
    memoryClaims = [...claims, claim];
    memoryInvites = invites.map((row) => row.id === invite.id ? next : row);
    return { ok: true, claim, existing: false } as const;
  });
}

export async function claimSentInviteById(input: {
  salonId: string;
  sentInviteId: string;
  clientName: string;
  recipientContactSummary: string;
  recipientContactHash: string;
}): Promise<ClaimSentInviteResult> {
  const now = new Date();
  const writable = await assertVmbMoneyWritableBackend();
  if (!writable.ok) return { ok: false, error: writable.error, status: 503 };
  if (writable.backend === "postgres") {
    try {
      return await prisma.$transaction(async (tx) => {
        const rows = await tx.$queryRaw<PayloadRow[]>`
          SELECT payload FROM vmb_sent_invite
          WHERE sent_invite_id = ${input.sentInviteId} AND salon_id = ${input.salonId}
          FOR UPDATE
        `;
        const invite = parseSent(rows[0]);
        if (!invite) return { ok: false, error: "Invite not found", status: 404 } as const;
        if (new Date(invite.expiresAt) <= now) return { ok: false, error: "This invite has expired", status: 410 } as const;
        if (invite.status === "redeemed" || invite.status === "cancelled" || invite.status === "expired") {
          return { ok: false, error: `This invite is ${invite.status}`, status: 409 } as const;
        }
        const existingRows = await tx.$queryRaw<PayloadRow[]>`
          SELECT payload FROM vmb_invite_claim WHERE sent_invite_id = ${invite.id} LIMIT 1
        `;
        const existing = parseClaim(existingRows[0]);
        if (existing) {
          return existing.recipientContactHash === input.recipientContactHash
            ? ({ ok: true, claim: existing, existing: true } as const)
            : ({ ok: false, error: "already_claimed_by_other", status: 409 } as const);
        }
        if (invite.status !== "sent" && invite.status !== "opened") {
          return { ok: false, error: "This invite cannot be claimed", status: 409 } as const;
        }
        const claimedAt = now.toISOString();
        const claim: InviteClaim = {
          id: newId("claim"),
          sentInviteId: invite.id,
          salonId: invite.salonId,
          clientName: input.clientName,
          recipientContactSummary: input.recipientContactSummary,
          recipientContactHash: input.recipientContactHash,
          claimedAt,
        };
        const next: SentInvite = { ...invite, status: "claimed", claimedAt, updatedAt: claimedAt };
        await tx.$executeRaw`
          INSERT INTO vmb_invite_claim (claim_id, sent_invite_id, salon_id, payload, claimed_at)
          VALUES (${claim.id}, ${claim.sentInviteId}, ${claim.salonId}, ${JSON.stringify(claim)}::jsonb, ${now})
        `;
        await tx.$executeRaw`
          UPDATE vmb_sent_invite SET status = 'claimed', payload = ${JSON.stringify(next)}::jsonb, updated_at = now()
          WHERE sent_invite_id = ${invite.id}
        `;
        return { ok: true, claim, existing: false } as const;
      });
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Claim failed", status: 503 };
    }
  }

  return serializeJson(async () => {
    const invites = memoryInvites;
    const invite = invites.find((row) => row.id === input.sentInviteId && row.salonId === input.salonId);
    if (!invite) return { ok: false, error: "Invite not found", status: 404 } as const;
    if (new Date(invite.expiresAt) <= now) return { ok: false, error: "This invite has expired", status: 410 } as const;
    if (invite.status === "redeemed" || invite.status === "cancelled" || invite.status === "expired") {
      return { ok: false, error: `This invite is ${invite.status}`, status: 409 } as const;
    }
    const claims = memoryClaims;
    const existing = claims.find((row) => row.sentInviteId === invite.id);
    if (existing) {
      return existing.recipientContactHash === input.recipientContactHash
        ? ({ ok: true, claim: existing, existing: true } as const)
        : ({ ok: false, error: "already_claimed_by_other", status: 409 } as const);
    }
    if (invite.status !== "sent" && invite.status !== "opened") return { ok: false, error: "This invite cannot be claimed", status: 409 } as const;
    const claimedAt = now.toISOString();
    const claim: InviteClaim = {
      id: newId("claim"),
      sentInviteId: invite.id,
      salonId: invite.salonId,
      clientName: input.clientName,
      recipientContactSummary: input.recipientContactSummary,
      recipientContactHash: input.recipientContactHash,
      claimedAt,
    };
    const next = { ...invite, status: "claimed" as const, claimedAt, updatedAt: claimedAt };
    memoryClaims = [...claims, claim];
    memoryInvites = invites.map((row) => row.id === invite.id ? next : row);
    return { ok: true, claim, existing: false } as const;
  });
}

export async function listSalonClaimTimeline(salonId: string): Promise<SalonClaimTimelineItem[]> {
  let invites: SentInvite[];
  let claims: InviteClaim[];
  if ((await resolveVmbStorageBackend()) === "postgres") {
    const [inviteRows, claimRows] = await Promise.all([
      prisma.$queryRaw<PayloadRow[]>`SELECT payload FROM vmb_sent_invite WHERE salon_id = ${salonId} ORDER BY updated_at DESC`,
      prisma.$queryRaw<PayloadRow[]>`SELECT payload FROM vmb_invite_claim WHERE salon_id = ${salonId} ORDER BY claimed_at DESC`,
    ]);
    invites = inviteRows.map((row) => parseSent(row)).filter((row): row is SentInvite => !!row);
    claims = claimRows.map((row) => parseClaim(row)).filter((row): row is InviteClaim => !!row);
  } else {
    if (process.env.VMB_MONEY_TEST_MEMORY !== "1") return [];
    invites = memoryInvites.filter((row) => row.salonId === salonId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    claims = memoryClaims.filter((row) => row.salonId === salonId);
  }
  const byInvite = new Map(claims.map((claim) => [claim.sentInviteId, claim]));
  return invites.map((sentInvite) => ({ sentInvite, claim: byInvite.get(sentInvite.id) }));
}

export async function redeemSentInvite(salonId: string, sentInviteId: string): Promise<{ sentInvite: SentInvite } | { error: string; status: number }> {
  const writable = await assertVmbMoneyWritableBackend();
  if (!writable.ok) return { error: writable.error, status: 503 };
  const timeline = await listSalonClaimTimeline(salonId);
  const current = timeline.find((row) => row.sentInvite.id === sentInviteId)?.sentInvite;
  if (!current) return { error: "Sent invite not found", status: 404 };
  if (current.status !== "claimed") return { error: "Only claimed invites can be redeemed", status: 409 };
  const now = new Date().toISOString();
  const next: SentInvite = { ...current, status: "redeemed", redeemedAt: now, updatedAt: now };
  if (writable.backend === "postgres") {
    const count = await prisma.$executeRaw`
      UPDATE vmb_sent_invite SET status = 'redeemed', payload = ${JSON.stringify(next)}::jsonb, updated_at = now()
      WHERE sent_invite_id = ${sentInviteId} AND salon_id = ${salonId} AND status = 'claimed'
    `;
    return count ? { sentInvite: next } : { error: "Invite state changed", status: 409 };
  }
  return serializeJson(async () => {
    const all = memoryInvites;
    const found = all.find((row) => row.id === sentInviteId && row.salonId === salonId);
    if (!found || found.status !== "claimed") return { error: "Invite state changed", status: 409 };
    memoryInvites = all.map((row) => row.id === sentInviteId ? next : row);
    return { sentInvite: next };
  });
}
