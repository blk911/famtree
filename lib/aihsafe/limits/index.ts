// AIH Safe — Usage Limits Engine (Agent 41)
//
// Enforces per-day and per-week action ceilings defined in LimitsPolicy.
// Counter reads only — no DB writes, no side effects.
// All time windows use UTC calendar-day boundaries.
//
// Child-tier message: "You've reached today's sharing limit. Ask your guardian if you need more."
// Adult message:      "You've reached your daily {kind} limit."
//
// Callers:
//   POST /api/aihsafe/activity           — checkPostLimits
//   POST /api/aihsafe/invites            — checkInviteLimits
//   POST /api/aihsafe/activity/*/comments — checkCommentLimits

import { prisma }          from "@/lib/db/prisma";
import { AgeTier, isMinorTier } from "@/types/aihsafe/age-tiers";
import { AuditEventKind }  from "@/types/aihsafe/audit-events";
import { resolvePolicyProfile } from "@/lib/aihsafe/policy";

// ─── Result type ──────────────────────────────────────────────────────────────

export interface LimitCheckResult {
  /** false when the user has hit a ceiling and must be blocked. */
  allowed: boolean;
  /** Ready-to-display message; child-appropriate copy when applicable. */
  message: string;
  /** Actions already taken in the current window. 0 when limit is unchecked. */
  used:    number;
  /** The ceiling value. 0 = unlimited (not enforced). */
  limit:   number;
  /** Time window the counter spans. */
  window:  "day" | "week";
}

// ─── UTC window helpers ───────────────────────────────────────────────────────

function utcDayStart(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function utcWeekStart(): Date {
  return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
}

// ─── Message factory ──────────────────────────────────────────────────────────

function limitMessage(
  kind:   "post" | "invite" | "comment",
  tier:   AgeTier,
  window: "day" | "week",
): string {
  const isMinor = isMinorTier(tier) || tier === AgeTier.UNKNOWN;
  if (isMinor) {
    return "You've reached today's sharing limit. Ask your guardian if you need more.";
  }
  if (window === "week") return `You've reached your weekly ${kind} limit.`;
  return `You've reached your daily ${kind} limit.`;
}

// ─── Internal result builders ─────────────────────────────────────────────────

function pass(used: number, limit: number, window: "day" | "week" = "day"): LimitCheckResult {
  return { allowed: true, message: "", used, limit, window };
}

function fail(
  kind:   "post" | "invite" | "comment",
  tier:   AgeTier,
  used:   number,
  limit:  number,
  window: "day" | "week",
): LimitCheckResult {
  return { allowed: false, message: limitMessage(kind, tier, window), used, limit, window };
}

// ─── Counter queries ──────────────────────────────────────────────────────────

async function countPostsToday(userId: string): Promise<number> {
  return prisma.aihActivityPost.count({
    where: { authorId: userId, createdAt: { gte: utcDayStart() } },
  });
}

async function countPostsThisWeek(userId: string): Promise<number> {
  return prisma.aihActivityPost.count({
    where: { authorId: userId, createdAt: { gte: utcWeekStart() } },
  });
}

async function countInvitesToday(userId: string): Promise<number> {
  // Direct invites (adults + any non-escalated paths) and escalated approval
  // requests (minors) live in separate tables. Sum both to prevent gaming.
  const [direct, escalated] = await Promise.all([
    prisma.invite.count({
      where: { senderId: userId, createdAt: { gte: utcDayStart() } },
    }),
    prisma.aihApprovalRequest.count({
      where: {
        requestorId: userId,
        actionKind:  AuditEventKind.INVITE_SENT_CHILD,
        createdAt:   { gte: utcDayStart() },
      },
    }),
  ]);
  return direct + escalated;
}

async function countCommentsToday(userId: string): Promise<number> {
  return prisma.aihActivityComment.count({
    where: { authorId: userId, createdAt: { gte: utcDayStart() } },
  });
}

// ─── Public check functions ───────────────────────────────────────────────────

/**
 * Check whether the user has headroom to create a post.
 * Enforces daily ceiling first, then the rolling 7-day ceiling.
 * Returns `allowed: true` immediately when both limits are 0 (unlimited).
 */
export async function checkPostLimits(userId: string): Promise<LimitCheckResult> {
  const profile = await resolvePolicyProfile(userId);
  const { dailyPostLimit, weeklyPostLimit } = profile.limits;
  const tier = profile.ageTierSnapshot;

  if (dailyPostLimit === 0 && weeklyPostLimit === 0) return pass(0, 0);

  const [dailyUsed, weeklyUsed] = await Promise.all([
    dailyPostLimit  > 0 ? countPostsToday(userId)    : Promise.resolve(0),
    weeklyPostLimit > 0 ? countPostsThisWeek(userId) : Promise.resolve(0),
  ]);

  if (dailyPostLimit  > 0 && dailyUsed  >= dailyPostLimit)  return fail("post", tier, dailyUsed,  dailyPostLimit,  "day");
  if (weeklyPostLimit > 0 && weeklyUsed >= weeklyPostLimit) return fail("post", tier, weeklyUsed, weeklyPostLimit, "week");

  return pass(dailyUsed, dailyPostLimit);
}

/**
 * Check whether the user has headroom to send an invite today.
 * Counts both direct invite rows and pending guardian-approval requests
 * so minor accounts cannot exceed their limit via repeated escalation.
 */
export async function checkInviteLimits(userId: string): Promise<LimitCheckResult> {
  const profile = await resolvePolicyProfile(userId);
  const { dailyInviteLimit } = profile.limits;
  const tier = profile.ageTierSnapshot;

  if (dailyInviteLimit === 0) return pass(0, 0);

  const used = await countInvitesToday(userId);
  if (used >= dailyInviteLimit) return fail("invite", tier, used, dailyInviteLimit, "day");
  return pass(used, dailyInviteLimit);
}

/**
 * Check whether the user has headroom to add a comment today.
 */
export async function checkCommentLimits(userId: string): Promise<LimitCheckResult> {
  const profile = await resolvePolicyProfile(userId);
  const { dailyCommentLimit } = profile.limits;
  const tier = profile.ageTierSnapshot;

  if (dailyCommentLimit === 0) return pass(0, 0);

  const used = await countCommentsToday(userId);
  if (used >= dailyCommentLimit) return fail("comment", tier, used, dailyCommentLimit, "day");
  return pass(used, dailyCommentLimit);
}
