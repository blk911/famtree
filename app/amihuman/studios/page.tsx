// app/amihuman/studios/page.tsx — Public gateway + SSR access context

import { headers } from "next/headers";
import { getCurrentUser } from "@/lib/auth";
import { StudiosLanding } from "@/components/studios/StudiosLandingClient";
import {
  resolveStudiosAccessContext,
  trackStudiosPageRequest,
} from "@/lib/studios/gateway/resolve-studios-access-context";
import type { SerializedStudiosGatewayContext } from "@/components/studios/gateway/StudiosGatewayRoot";

const SOURCE_ROUTE = "/amihuman/studios";

export default async function AmihumanStudiosPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const rawToken =
    (typeof searchParams?.token === "string" && searchParams.token) ||
    (typeof searchParams?.invite === "string" && searchParams.invite) ||
    (typeof searchParams?.inviteToken === "string" && searchParams.inviteToken) ||
    null;

  const studioSlug =
    (typeof searchParams?.studio === "string" && searchParams.studio.trim()) ||
    (typeof searchParams?.studioSlug === "string" && searchParams.studioSlug.trim()) ||
    null;

  const user = await getCurrentUser().catch(() => null);

  const ctx = await resolveStudiosAccessContext({ user, inviteTokenFromQuery: rawToken });

  const h = headers();
  const referrer = h.get("referer") ?? h.get("referrer") ?? null;

  await trackStudiosPageRequest({
    sourceRoute: SOURCE_ROUTE,
    visitorType: ctx.visitorType,
    authPresent: Boolean(user),
    invitePresent: Boolean(rawToken?.trim()),
    referrer,
    studioSlug,
  });

  const serialized: SerializedStudiosGatewayContext = {
    sourceRoute: SOURCE_ROUTE,
    visitorType: ctx.visitorType,
    canAccessPrivateActions: ctx.canAccessPrivateActions,
    inviteToken: ctx.inviteToken ?? null,
    referrer,
  };

  return <StudiosLanding serializedGateway={serialized} />;
}
