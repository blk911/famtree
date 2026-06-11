import type { AiosContextPacket } from "@/lib/taikos/types";
import { listActivities, recordActivity } from "./activity-store";
import { summarizeActivities } from "./activity-summary";
import type { RecordActivityInput, TaikosActivitySummary } from "./activity-types";

export async function summarizeActivityForSalon(salonId: string): Promise<TaikosActivitySummary> {
  const events = await listActivities(salonId);
  return summarizeActivities(events);
}

/** Seed human-readable stories when the stream is empty but book signals exist. */
export async function ensureSeedActivityFromContext(ctx: AiosContextPacket): Promise<void> {
  const existing = await listActivities(ctx.salonId, 1);
  if (existing.length > 0) return;

  const seeds: RecordActivityInput[] = [];

  if (ctx.pcnSummary.membersJoined > 0) {
    seeds.push({
      salonId: ctx.salonId,
      operatorId: ctx.operatorId,
      kind: "pcn_join",
      emoji: "🎉",
      headline: `${ctx.pcnSummary.membersJoined} client${ctx.pcnSummary.membersJoined === 1 ? "" : "s"} joined your PCN`,
      detail: "Network growth from trusted invitations.",
    });
  }

  const referralOpp = ctx.opportunitySummary.opportunities.find((o) => o.category === "Referral");
  if (referralOpp) {
    seeds.push({
      salonId: ctx.salonId,
      operatorId: ctx.operatorId,
      kind: "referral",
      emoji: "🤝",
      headline: referralOpp.title,
      detail: referralOpp.recommendation,
      estimatedValue: referralOpp.estimatedValue,
      linkedGoalId: referralOpp.linkedGoalId,
    });
  }

  const slotOpp = ctx.opportunitySummary.opportunities.find((o) => o.category === "Open Slot");
  if (slotOpp && ctx.calendarSummary.slots[0]) {
    seeds.push({
      salonId: ctx.salonId,
      operatorId: ctx.operatorId,
      kind: "open_slot",
      emoji: "📅",
      headline: `${ctx.calendarSummary.slots[0]} opening detected`,
      detail: slotOpp.recommendation,
      estimatedValue: slotOpp.estimatedValue,
      linkedGoalId: slotOpp.linkedGoalId,
    });
  }

  if (ctx.draftSummary.openDrafts > 0) {
    seeds.push({
      salonId: ctx.salonId,
      operatorId: ctx.operatorId,
      kind: "draft_created",
      emoji: "📄",
      headline: `${ctx.draftSummary.openDrafts} draft${ctx.draftSummary.openDrafts === 1 ? "" : "s"} ready for review`,
      detail: "Review in Campaigns or Invites before queuing.",
    });
  }

  for (const seed of seeds.slice(0, 6)) {
    await recordActivity(seed);
  }
}

export { recordActivity } from "./activity-store";
