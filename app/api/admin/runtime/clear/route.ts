export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import {
  getRuntimeClearTarget,
  type RuntimeClearScope,
} from "@/lib/runtime/clear-runtime-config";
import { clearRuntimeArtifacts } from "@/lib/runtime/clear-runtime-artifacts";

const SCOPES: RuntimeClearScope[] = ["salon", "transpo", "hcare", "labs"];

function isAdmin(role: string): boolean {
  return role === "founder" || role === "admin";
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAuth();
    if (!isAdmin(admin.role)) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const scope = body.scope as RuntimeClearScope | undefined;
    const confirm = body.confirm === true;
    const dryRun = body.dryRun === true;

    if (!scope || !SCOPES.includes(scope)) {
      return NextResponse.json(
        { ok: false, error: "scope must be salon, transpo, hcare, or labs" },
        { status: 400 },
      );
    }

    if (!confirm && !dryRun) {
      return NextResponse.json(
        {
          ok: false,
          error: "confirm true or dryRun true required",
        },
        { status: 400 },
      );
    }

    const result = await clearRuntimeArtifacts(scope, { dryRun: dryRun && !confirm });
    const target = getRuntimeClearTarget(scope);

    return NextResponse.json({
      ok: true,
      result,
      target: {
        scope: target.scope,
        label: target.label,
        suggestedRebuildCommands: target.suggestedRebuildCommands,
      },
    });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, error: "runtime clear failed", detail },
      { status: 500 },
    );
  }
}
