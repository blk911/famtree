import type { User } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { StudiosVisitorType } from "@/lib/studios/gateway/visitor-types";
import type { InviteStatus } from "@prisma/client";

export type StudiosAccessContext = {
  visitorType: StudiosVisitorType;
  canAccessPrivateActions: boolean;
  inviteToken?: string | null;
};

const VALID_INVITE: InviteStatus[] = ["PENDING", "ACCEPTED"];

async function inviteTokenLooksValid(raw: string | null | undefined): Promise<boolean> {
  const token = typeof raw === "string" ? raw.trim() : "";
  if (!token) return false;
  const invite = await prisma.invite.findFirst({
    where: { token, status: { in: VALID_INVITE } },
    select: { id: true },
  });
  return Boolean(invite);
}

/**
 * Resolved on the server for Studios gateway routes.
 */
export async function resolveStudiosAccessContext(args: {
  user: User | null;
  inviteTokenFromQuery?: string | null;
}): Promise<StudiosAccessContext> {
  if (args.user) {
    return {
      visitorType: "authenticated",
      canAccessPrivateActions: true,
      inviteToken: args.inviteTokenFromQuery ?? null,
    };
  }

  const token = args.inviteTokenFromQuery ?? null;
  const invited = await inviteTokenLooksValid(token ?? undefined);

  if (invited) {
    return {
      visitorType: "invited",
      canAccessPrivateActions: true,
      inviteToken: token,
    };
  }

  return {
    visitorType: "public_unknown",
    canAccessPrivateActions: false,
    inviteToken: token,
  };
}

/** Fire-and-forget page breadcrumb telemetry for funnel analytics / admin QA. */
export async function trackStudiosPageRequest(input: {
  sourceRoute: string;
  visitorType: StudiosVisitorType;
  authPresent: boolean;
  invitePresent: boolean;
  referrer?: string | null;
  studioSlug?: string | null;
}): Promise<void> {
  try {
    await prisma.studiosGatewayPageHit.create({
      data: {
        sourceRoute: input.sourceRoute.slice(0, 500),
        visitorType: input.visitorType,
        authPresent: input.authPresent,
        invitePresent: input.invitePresent,
        referrer: input.referrer ? input.referrer.slice(0, 2000) : null,
        studioSlug: input.studioSlug?.trim()?.slice(0, 320) || null,
      },
    });

    console.log("[studios/gateway/track]", {
      route: input.sourceRoute,
      visitorType: input.visitorType,
      authPresent: input.authPresent,
      invitePresent: input.invitePresent,
      studioSlug: input.studioSlug ?? null,
    });
  } catch (e) {
    console.warn("[studios/gateway/track] failed — non-blocking", e);
  }
}


