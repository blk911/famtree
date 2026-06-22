import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";
import { VMB_TRIAL_COOKIE } from "@/lib/vmb/paths";
import { createVmbSalonSession } from "@/lib/vmb/salon-authority";

export const VMB_TRIAL_COOKIE_MAX_AGE = 60 * 60 * 24 * 45;

export function buildVmbTrialCookieOptions(): Partial<ResponseCookie> {
  return {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: VMB_TRIAL_COOKIE_MAX_AGE,
    secure: process.env.NODE_ENV === "production",
  };
}

export function applyVmbTrialCookie(res: { cookies: { set: (name: string, value: string, options?: Partial<ResponseCookie>) => void } }, trialId: string): void {
  const id = trialId.trim();
  if (!id) return;
  res.cookies.set(VMB_TRIAL_COOKIE, createVmbSalonSession(id), buildVmbTrialCookieOptions());
}
