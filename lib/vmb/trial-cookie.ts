import type { NextRequest } from "next/server";
import { VMB_TRIAL_COOKIE } from "./paths";
import { verifyVmbSalonSession } from "./salon-authority";

export function getVmbTrialIdFromRequest(req: NextRequest): string | undefined {
  return verifyVmbSalonSession(req.cookies.get(VMB_TRIAL_COOKIE)?.value);
}
