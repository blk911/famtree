// shellMode.ts — pure, synchronous helper. No DB calls. No side effects.
//
// Maps a user's system role + dateOfBirth to a FamilySafeShellMode string.
// Used by the aihsafe page server component to pick the right shell view.
//
// AUTHORIZATION NOTE:
// shellMode controls ONLY which UI panels are rendered. It is NOT a security
// boundary. All action gates live in lib/aihsafe/governance/ and are enforced
// in API route handlers regardless of which shell is shown. UI hiding is a
// UX convenience — the backend remains the authoritative source of truth.

import { deriveAgeTier }  from "@/lib/aihsafe/governance";
import { isMinorTier, AgeTier } from "@/types/aihsafe/age-tiers";
/** UI shell mode — controls which panels are rendered. NOT a security boundary. */
export type FamilySafeShellMode = "founder" | "member" | "child";

/**
 * Derives the shell view mode for a user.
 *
 * Routing table:
 *   systemRole = founder | admin  →  "founder"   (full governance UI)
 *   ageTier in MINOR_TIERS        →  "child"     (guided, read-only governance)
 *   ageTier = UNKNOWN             →  "member"    (conservative — no admin UI)
 *   ageTier = ADULT | ELDER       →  "member"    (participation view)
 *
 * UNKNOWN age tier: dateOfBirth is absent. The backend governance kernel
 * treats UNKNOWN as permitting all scopes (for backward compat with legacy
 * accounts). The UI deliberately routes UNKNOWN → "member" (not "founder")
 * to avoid surfacing stewardship controls to accounts whose age is unverified.
 * The governance backend remains authoritative; this is a UI-layer default only.
 */
export function deriveShellMode(user: {
  role:        string;
  dateOfBirth: Date | null;
}): FamilySafeShellMode {
  // System-role gate first: founder/admin always see the governance shell.
  if (user.role === "founder" || user.role === "admin") return "founder";

  const ageTier = deriveAgeTier(user.dateOfBirth ?? null);

  // Known minor tiers → child view (guided, guardian-supervised).
  if (isMinorTier(ageTier)) return "child";

  // UNKNOWN: no dateOfBirth on record. Route conservatively to member view.
  // Do NOT escalate to founder view even if systemRole would otherwise allow it,
  // because age is unverified and we cannot confirm the user is an adult.
  if (ageTier === AgeTier.UNKNOWN) return "member";

  // ADULT and ELDER → standard member participation view.
  return "member";
}
