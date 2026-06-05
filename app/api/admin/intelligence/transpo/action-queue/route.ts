export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import {
  buildActionFromCountyOpportunity,
  buildActionFromServiceDeficit,
  promoteToActionQueue,
} from "@/lib/intelligence/transpo/action-queue/action-engine";
import {
  buildActionQueueQuestions,
  buildActionQueueSummary,
} from "@/lib/intelligence/transpo/action-queue/action-summary";
import { readActionQueue, writeActionQueue } from "@/lib/intelligence/transpo/action-queue/action-store";
import { readCountyOpportunityCache } from "@/lib/intelligence/transpo/opportunity-dossiers/county-opportunity-store";
import { readServiceDeficitCache } from "@/lib/intelligence/transpo/service-deficits/deficit-store";

export async function GET() {
  try {
    const records = await readActionQueue();
    const open = records.filter((r) => r.status !== "closed");
    const summary = buildActionQueueSummary(records);
    const questions = buildActionQueueQuestions(records, summary);
    return NextResponse.json({
      ok: true,
      summary,
      records: open.sort((a, b) => b.actionabilityScore - a.actionabilityScore),
      questions,
      meta: { count: open.length },
    });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: "action queue failed", detail }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      countyOpportunityId?: string;
      county?: string;
      state?: string;
      serviceCategory?: string;
      service?: string;
      source?: "county_opportunity" | "service_deficit";
    };

    const county = (body.county ?? "").trim();
    const state = ((body.state ?? "CO").trim()).toUpperCase();
    const service = (body.serviceCategory ?? body.service ?? "").trim();

    let incoming;
    const dossiers = await readCountyOpportunityCache();

    if (body.countyOpportunityId) {
      const dossier = dossiers.find((d) => d.id === body.countyOpportunityId);
      if (!dossier) {
        return NextResponse.json({ ok: false, error: "county opportunity not found" }, { status: 404 });
      }
      incoming = buildActionFromCountyOpportunity(dossier);
    } else if (county && service) {
      const dossier = dossiers.find(
        (d) =>
          d.county.toLowerCase() === county.toLowerCase() &&
          d.state === state &&
          d.serviceCategory === service,
      );
      if (dossier) {
        incoming = buildActionFromCountyOpportunity(dossier);
      } else if (body.source === "service_deficit") {
        const deficits = await readServiceDeficitCache();
        const deficit = deficits.find(
          (d) =>
            d.county.toLowerCase() === county.toLowerCase() &&
            d.state === state &&
            d.serviceCategory === service,
        );
        if (!deficit) {
          return NextResponse.json({ ok: false, error: "service deficit not found" }, { status: 404 });
        }
        const opp = dossiers.find(
          (d) =>
            d.county.toLowerCase() === county.toLowerCase() &&
            d.state === state &&
            d.serviceCategory === service,
        );
        incoming = buildActionFromServiceDeficit(deficit, opp?.actionabilityScore);
      } else {
        return NextResponse.json(
          { ok: false, error: "county opportunity not found — run county opportunity backfill first" },
          { status: 404 },
        );
      }
    } else {
      return NextResponse.json(
        { ok: false, error: "countyOpportunityId or county+serviceCategory required" },
        { status: 400 },
      );
    }

    const records = await readActionQueue();
    const result = promoteToActionQueue(records, incoming);
    if (result.duplicate) {
      return NextResponse.json({
        ok: true,
        duplicate: true,
        record: findOpen(records, incoming.county, incoming.state, incoming.serviceCategory),
      });
    }

    const persistWarning = (await writeActionQueue(result.records)) ?? undefined;
    return NextResponse.json({
      ok: true,
      created: true,
      record: incoming,
      ...(persistWarning ? { persistWarning } : {}),
    });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: "action queue create failed", detail }, { status: 500 });
  }
}

function findOpen(
  records: Awaited<ReturnType<typeof readActionQueue>>,
  county: string,
  state: string,
  serviceCategory: string,
) {
  return records.find(
    (r) =>
      r.status !== "closed" &&
      r.county.toLowerCase() === county.toLowerCase() &&
      r.state === state &&
      r.serviceCategory === serviceCategory,
  );
}
