import { createVmbSalonSession } from "@/lib/vmb/salon-authority";
import { vmbDatabaseUrlPresent } from "@/lib/vmb/db";
import { createSalonInvitationApproval, listSalonInvitationApprovals } from "@/lib/vmb/invites/salon-invitation-approval-store";
import { createSentInvite, listSalonClaimTimeline } from "@/lib/vmb/invites/sent-invite-store";
import type { InviteTemplateSnapshot } from "@/lib/vmb/invites/invite-template-snapshot";
import type { SentInvite, SentInvitePublicSnapshot } from "@/lib/vmb/invites/sent-invite-types";

export const VMB_CLIENT_INVITE_WORKBENCH = {
  salonId: "vmb-dev-deb-salon",
  salonName: "Your Salon",
  providerName: "Your nail tech",
  clientName: "Deb",
  clientEmail: "deb@test.com",
  sourceCopyId: "workbench-deb-birthday-copy",
  sourceTemplateId: "workbench-deb-birthday-template",
} as const;

export type ClientInviteWorkbenchResult =
  | {
      ok: true;
      invite: SentInvite;
      contact: string;
      salonSession: string;
      created: boolean;
    }
  | { ok: false; error: string; status: number };

function enableLocalMemoryBackendIfNeeded(): void {
  if (!process.env.VERCEL && !vmbDatabaseUrlPresent()) {
    process.env.VMB_MONEY_TEST_MEMORY = "1";
  }
}

function expiresIn(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

function workbenchSnapshot(now = new Date().toISOString()): InviteTemplateSnapshot {
  return {
    id: "workbench-deb-birthday-v1",
    sourceTemplateId: VMB_CLIENT_INVITE_WORKBENCH.sourceTemplateId,
    templateName: "Birthday Celebration",
    categoryId: "nails",
    headline: "A little birthday sparkle for you",
    body: "Happy Birthday Deb! I put together something special so you can celebrate with a fresh set, a little shine, and a reason to feel extra cared for this month.",
    ctaLabel: "Open my birthday gift",
    serviceIds: ["default-nails-gel-x"],
    rewardIds: ["addon-chrome", "addon-crystals"],
    serviceImageUrl: "https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=1200&q=80",
    inviteArtImageUrl: "https://images.unsplash.com/photo-1513201099705-a9746e1e201f?auto=format&fit=crop&w=1200&q=80",
    priceLabel: "$90",
    expirationLabel: "Valid through birthday month",
    termsText: "Valid through birthday month",
    totalValue: 105,
    savingsAmount: 15,
    offerPrice: 90,
    valueLabel: "$105",
    ownerName: VMB_CLIENT_INVITE_WORKBENCH.providerName,
    salonName: VMB_CLIENT_INVITE_WORKBENCH.salonName,
    status: "published",
    version: 1,
    createdAt: now,
    updatedAt: now,
  };
}

function publicSnapshot(snapshot: InviteTemplateSnapshot): SentInvitePublicSnapshot {
  return {
    salonDisplayName: VMB_CLIENT_INVITE_WORKBENCH.salonName,
    providerName: VMB_CLIENT_INVITE_WORKBENCH.providerName,
    recipientName: VMB_CLIENT_INVITE_WORKBENCH.clientName,
    inviteTypeLabel: snapshot.templateName,
    headline: snapshot.headline,
    body: snapshot.body,
    ctaLabel: snapshot.ctaLabel,
    services: ["Gel-X Extensions"],
    rewards: ["Chrome Upgrade", "Crystal Accent"],
    levelUps: [
      { label: "Chrome Upgrade", price: 15, selected: true },
      { label: "Crystal Accent", price: 15, selected: true },
    ],
    expirationLabel: snapshot.expirationLabel,
    termsText: snapshot.termsText,
    priceLabel: snapshot.priceLabel,
    valueLabel: snapshot.valueLabel,
    totalValue: snapshot.totalValue,
    savingsAmount: snapshot.savingsAmount,
    offerPrice: snapshot.offerPrice,
    ownerPhotoUrl: snapshot.ownerPhotoUrl,
    salonLogoUrl: snapshot.salonLogoUrl,
    serviceImageUrl: snapshot.serviceImageUrl,
    inviteArtImageUrl: snapshot.inviteArtImageUrl,
  };
}

export async function ensureDebClientInviteWorkbench(options: { fresh?: boolean } = {}): Promise<ClientInviteWorkbenchResult> {
  enableLocalMemoryBackendIfNeeded();

  const salonId = VMB_CLIENT_INVITE_WORKBENCH.salonId;
  const contact = VMB_CLIENT_INVITE_WORKBENCH.clientEmail;
  if (!options.fresh) {
    const [timeline, approvals] = await Promise.all([
      listSalonClaimTimeline(salonId),
      listSalonInvitationApprovals(salonId),
    ]);
    const debApprovalIds = new Set(
      approvals
        .filter((approval) => approval.clientEmail?.trim().toLowerCase() === contact)
        .map((approval) => approval.id),
    );
    const existing = timeline.find((item) =>
      debApprovalIds.has(item.sentInvite.sourceApprovalId)
      && new Date(item.sentInvite.expiresAt).getTime() > Date.now()
      && !["redeemed", "cancelled", "expired"].includes(item.sentInvite.status),
    );
    if (existing) {
      return {
        ok: true,
        invite: existing.sentInvite,
        contact,
        salonSession: createVmbSalonSession(salonId),
        created: false,
      };
    }
  }

  const snapshot = workbenchSnapshot();
  const approvalResult = await createSalonInvitationApproval(salonId, {
    clientName: VMB_CLIENT_INVITE_WORKBENCH.clientName,
    clientEmail: contact,
    opportunityId: options.fresh ? `workbench-deb-${Date.now()}` : "workbench-deb-birthday",
    opportunityType: "birthday",
    sourceCopyId: VMB_CLIENT_INVITE_WORKBENCH.sourceCopyId,
    sourceTemplateId: VMB_CLIENT_INVITE_WORKBENCH.sourceTemplateId,
    snapshot,
    reasonText: "Workbench birthday gift for Deb",
    estimatedValue: 90,
    status: "approved",
  });
  if ("error" in approvalResult) return { ok: false, error: approvalResult.error, status: 503 };

  const sent = await createSentInvite({
    salonId,
    sourceApprovalId: approvalResult.approval.id,
    sourceCopyId: VMB_CLIENT_INVITE_WORKBENCH.sourceCopyId,
    snapshot: publicSnapshot(snapshot),
    expiresAt: expiresIn(30),
  });
  if ("error" in sent) return { ok: false, error: sent.error, status: sent.status };

  return {
    ok: true,
    invite: sent.sentInvite,
    contact,
    salonSession: createVmbSalonSession(salonId),
    created: true,
  };
}
