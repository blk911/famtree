// POST /api/admin/intelligence/salon/provider-validation/debug

export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { validateProviderUrlDebug } from "@/lib/intelligence/salon/provider-validation/discovery-pipeline";

const BodySchema = z.object({
  url: z.string().url(),
  handle: z.string().optional(),
  displayName: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = BodySchema.parse(await req.json());
    const validation = await validateProviderUrlDebug(body.url, {
      handle: body.handle,
      displayName: body.displayName,
    });

    const paymentOnly =
      validation.provider === "square" &&
      !validation.confirmed &&
      (validation.status === "rejected_marketing_page" ||
        validation.reason.includes("payment"));

    return NextResponse.json({
      ok: true,
      validation,
      paymentOnly,
      bookingConfirmed: validation.confirmed && !paymentOnly,
    });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, error: "provider validation debug failed", detail },
      { status: 500 },
    );
  }
}
