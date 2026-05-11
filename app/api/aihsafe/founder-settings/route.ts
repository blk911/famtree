// AIH Safe — Founder Settings API
// GET  /api/aihsafe/founder-settings  — read the singleton AihFounderSettings row
// PATCH /api/aihsafe/founder-settings — update one or more settings fields
//
// Access: founder or admin only.
// The row is auto-created with safe defaults on first GET.

import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireAuth } from "@/lib/auth";
import { emitAuditEvent } from "@/lib/aihsafe/audit";
import { AuditEventKind } from "@/types/aihsafe/audit-events";
import { VisibilityScope } from "@/types/aihsafe/visibility";
import {
  ok,
  forbidden,
  unauthenticated,
  validationFail,
  serverError,
} from "@/lib/aihsafe/api/envelopes";
import { readJson } from "@/lib/aihsafe/api/parse";
import type { FounderSettingsDTO } from "@/types/aihsafe/dto";

// ─── Safe default scope values the founder may set ───────────────────────────
// Exclude PRIVATE, GUARDIAN_ONLY (too narrow for network default)
// and PUBLIC_APPROVED (too broad — must be intentional opt-in, not a default).
const ALLOWED_DEFAULT_SCOPES = [
  VisibilityScope.FAMILY,
  VisibilityScope.TRUST_UNIT,
  VisibilityScope.EXTENDED_TRUST,
] as const;

// ─── Validation ───────────────────────────────────────────────────────────────

const PatchSchema = z.object({
  requireGuardianApprovalForMinors: z.boolean().optional(),
  allowMinorInvites:                z.boolean().optional(),
  allowMinorPosting:                z.boolean().optional(),
  allowMinorExternalLinks:          z.boolean().optional(),
  defaultVisibilityScope:           z
    .string()
    .refine(
      (v) => (ALLOWED_DEFAULT_SCOPES as readonly string[]).includes(v),
      {
        message: `defaultVisibilityScope must be one of: ${ALLOWED_DEFAULT_SCOPES.join(", ")}`,
      }
    )
    .optional(),
  enableTrustedAdults:   z.boolean().optional(),
  enablePrivateThreads:  z.boolean().optional(),
});

// ─── DTO mapper ───────────────────────────────────────────────────────────────

function toDTO(row: {
  id:                              string;
  requireGuardianApprovalForMinors: boolean;
  allowMinorInvites:               boolean;
  allowMinorPosting:               boolean;
  allowMinorExternalLinks:         boolean;
  defaultVisibilityScope:          string;
  enableTrustedAdults:             boolean;
  enablePrivateThreads:            boolean;
  updatedAt:                       Date;
}): FounderSettingsDTO {
  return {
    id:                              row.id,
    requireGuardianApprovalForMinors: row.requireGuardianApprovalForMinors,
    allowMinorInvites:               row.allowMinorInvites,
    allowMinorPosting:               row.allowMinorPosting,
    allowMinorExternalLinks:         row.allowMinorExternalLinks,
    defaultVisibilityScope:          row.defaultVisibilityScope,
    enableTrustedAdults:             row.enableTrustedAdults,
    enablePrivateThreads:            row.enablePrivateThreads,
    updatedAt:                       row.updatedAt.toISOString(),
  };
}

// ─── GET — read (auto-create on first call) ───────────────────────────────────

export async function GET() {
  let user;
  try { user = await requireAuth(); } catch { return unauthenticated(); }

  if (user.role !== "founder" && user.role !== "admin") {
    return forbidden("Only founders and admins can read governance settings.");
  }

  try {
    // upsert: create with safe defaults if row doesn't exist yet.
    const row = await prisma.aihFounderSettings.upsert({
      where:  { id: "singleton" },
      create: {
        id:            "singleton",
        founderUserId: user.id,
      },
      update: {},
    });
    return ok<FounderSettingsDTO>(toDTO(row));
  } catch (err) {
    console.error("[founder-settings GET]", err);
    return serverError();
  }
}

// ─── PATCH — update fields ────────────────────────────────────────────────────

export async function PATCH(req: NextRequest) {
  let user;
  try { user = await requireAuth(); } catch { return unauthenticated(); }

  if (user.role !== "founder" && user.role !== "admin") {
    return forbidden("Only founders and admins can change governance settings.");
  }

  const body = await readJson(req);
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    const fields = parsed.error.errors.map((e) => ({
      path:    e.path.join("."),
      message: e.message,
    }));
    return validationFail("Invalid settings payload.", fields);
  }

  const patch = parsed.data;
  if (Object.keys(patch).length === 0) {
    return validationFail("At least one field is required.");
  }

  try {
    const row = await prisma.aihFounderSettings.upsert({
      where:  { id: "singleton" },
      create: {
        id:            "singleton",
        founderUserId: user.id,
        ...patch,
      },
      update: {
        founderUserId: user.id,
        ...patch,
      },
    });

    // Emit audit event — non-blocking; failure must not fail the request.
    emitAuditEvent({
      kind:     AuditEventKind.FOUNDER_SETTINGS_UPDATED,
      actorId:  user.id,
      targetId: row.id,
      meta:     { patch, settingsId: row.id },
    }).catch(console.error);

    return ok<FounderSettingsDTO>(toDTO(row));
  } catch (err) {
    console.error("[founder-settings PATCH]", err);
    return serverError();
  }
}
