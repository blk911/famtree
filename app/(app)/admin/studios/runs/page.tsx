"use client";
// app/(app)/admin/studios/runs/page.tsx
// Run history and audit trail — last step in discovery flow (not an operating step).

import { CreatorIntelligenceNav } from "@/components/studios/creator-lab/CreatorIntelligenceNav";
import { salonConfig } from "@/lib/intelligence/verticals/salon.config";

export default function RunsPage() {
  return (
    <>
      <CreatorIntelligenceNav current="runs" />

      <header className="mb-4">
        <h1 className="m-0 text-xl font-extrabold text-stone-900 sm:text-[22px]">Run History</h1>
        <p className="m-0 mt-1 max-w-2xl text-sm leading-snug text-stone-500">
          Audit trail for harvests, resolver batches, profile enrichment, and imports.
        </p>
        <p className="m-0 mt-1 text-[11px] text-stone-400">
          {salonConfig.label} · {salonConfig.dataScope}
        </p>
      </header>

      <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50 px-6 py-10 text-center">
        <div className="mb-3 text-3xl">🗂️</div>
        <p className="m-0 text-sm font-semibold text-stone-600">No run logs yet</p>
        <p className="mx-auto m-0 mt-2 max-w-md text-xs leading-relaxed text-stone-500">
          Run history will show a chronological log of hashtag harvests, IG resolver batches,
          enrichment passes, and imports — with per-run summaries and re-run controls.
        </p>
      </div>
    </>
  );
}
