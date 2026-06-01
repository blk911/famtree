// POST /api/admin/intelligence/salon/ggen-discovery/run

export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { runGgenSeedDiscovery } from "@/lib/intelligence/salon/ggen-seed-discovery/run";
import { getGgenDiscoveryStorePath } from "@/lib/intelligence/salon/ggen-seed-discovery/store";

const RequestSchema = z.object({
  inputText: z.string().min(1),
  category: z.string().max(120).optional(),
  city: z.string().max(80).optional(),
  state: z.string().max(40).optional(),
  maxSeeds: z.number().int().min(1).max(200).optional(),
  enableSearch: z.boolean().optional(),
  matchProspects: z.boolean().optional(),
});

export async function POST(req: Request) {
  try {
    const parsed = RequestSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Invalid request", detail: parsed.error.message },
        { status: 400 },
      );
    }

    const { run, storePath } = await runGgenSeedDiscovery(parsed.data);

    return NextResponse.json({
      ok: true,
      run,
      storePath,
      storeRoot: getGgenDiscoveryStorePath(),
    });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    console.error("[ggen-discovery/run]", detail);
    return NextResponse.json({ ok: false, error: "run failed", detail }, { status: 500 });
  }
}
