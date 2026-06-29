export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { ensureDebClientInviteWorkbench } from "@/lib/vmb/invites/client-invite-workbench";
import { VMB_TRIAL_COOKIE } from "@/lib/vmb/paths";

export async function GET(request: NextRequest) {
  const fresh = request.nextUrl.searchParams.get("fresh") === "1";
  const result = await ensureDebClientInviteWorkbench({ fresh });
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  }

  const url = new URL("/vmb/client", request.url);
  url.searchParams.set("inviteId", result.invite.id);
  url.searchParams.set("contact", result.contact);
  url.searchParams.set("workbench", "deb");

  const response = NextResponse.redirect(url);
  response.cookies.set(VMB_TRIAL_COOKIE, result.salonSession, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
  return response;
}
