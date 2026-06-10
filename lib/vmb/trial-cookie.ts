import type { NextRequest } from "next/server";
import { VMB_TRIAL_COOKIE } from "./paths";

export function getVmbTrialIdFromRequest(req: NextRequest): string | undefined {
  const id = req.cookies.get(VMB_TRIAL_COOKIE)?.value?.trim();
  return id || undefined;
}
