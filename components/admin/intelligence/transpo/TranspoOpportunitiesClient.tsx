"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { TranspoIntelligenceNav } from "@/components/admin/intelligence/transpo/TranspoIntelligenceNav";
import type {
  TranspoOpportunitiesSummary,
  TranspoOpportunity,
  TranspoOpportunityConfidence,
  TranspoOpportunityType,
} from "@/lib/transpo/opportunity-types";
import { TRANSPO_OPPORTUNITY_TYPE_LABELS } from "@/lib/transpo/opportunity-types";

const OPPORTUNITY_TYPES = Object.keys(TRANSPO_OPPORTUNITY_TYPE_LABELS) as TranspoOpportunityType[];
const CONFIDENCE_LEVELS: TranspoOpportunityConfidence[] = ["high", "medium", "low"];
const RESEARCH_PRIORITIES = ["low", "medium", "high"] as const;

const CONFIDENCE_STYLES: Record<TranspoOpportunityConfidence, { fg: string; bg: string; bd: string }> = {
  high: { fg: "#166534", bg: "#dcfce7", bd: "#bbf7d0" },
  medium: { fg: "#92400e", bg: "#fef3c7", bd: "#fde68a" },
  low: { fg: "#57534e", bg: "#f5f5f4", bd: "#e7e5e4" },
};

const th: React.CSSProperties = {
  textAlign: "left",
  padding: "8px 12px",
  fontSize: 10,
  fontWeight: 800,
  color: "#a8a29e",
  borderBottom: "1px solid #f0ede8",
  background: "#fafaf9",
  whiteSpace: "nowrap",
};

const td: React.CSSProperties = {
  padding: "10px 12px",
  fontSize: 12,
  color: "#57534e",
  borderBottom: "1px solid #f5f4f2",
  verticalAlign: "top",
};

function AnchorList({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="mb-2">
      <div className="text-[10px] font-bold uppercase tracking-wide text-stone-400">{label}</div>
      <ul className="m-0 list-disc pl-4 text-xs text-stone-600">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export function TranspoOpportunitiesClient() {
  const searchParams = useSearchParams();
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<TranspoOpportunitiesSummary | null>(null);
  const [opportunities, setOpportunities] = useState<TranspoOpportunity[]>([]);
  const [counties, setCounties] = useState<string[]>([]);
  const [selected, setSelected] = useState<TranspoOpportunity | null>(null);
  const [countyFilter, setCountyFilter] = useState(searchParams.get("county") ?? "");
  const [typeFilter, setTypeFilter] = useState("");
  const [confidenceFilter, setConfidenceFilter] = useState("");
  const [researchFilter, setResearchFilter] = useState("");
  const [minActionability, setMinActionability] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      params.set("state", "CO");
      if (countyFilter) params.set("county", countyFilter);
      if (typeFilter) params.set("opportunityType", typeFilter);
      if (confidenceFilter) params.set("confidence", confidenceFilter);
      if (researchFilter) params.set("researchPriority", researchFilter);
      if (minActionability) params.set("minActionability", minActionability);

      const res = await fetch(
        `/api/admin/intelligence/transpo/transpo-opportunities?${params.toString()}`,
        { cache: "no-store" },
      );
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? data.detail ?? "Failed to load opportunities");
        return;
      }

      const rows = (data.opportunities ?? []) as TranspoOpportunity[];
      setTotal(data.total ?? rows.length);
      setSummary(data.summary ?? null);
      setOpportunities(rows);
      setCounties(data.counties ?? []);
      setSelected((prev) => {
        if (prev && rows.some((r) => r.opportunityKey === prev.opportunityKey)) return prev;
        return rows[0] ?? null;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [countyFilter, typeFilter, confidenceFilter, researchFilter, minActionability]);

  useEffect(() => {
    load();
  }, [load]);

  const sortedRows = useMemo(
    () => [...opportunities].sort((a, b) => b.actionabilityScore - a.actionabilityScore),
    [opportunities],
  );

  const highCount = summary?.byConfidence.high ?? 0;
  const mediumCount = summary?.byConfidence.medium ?? 0;
  const researchCount = summary?.byType.research_priority ?? 0;
  const monitorCount = summary?.byType.low_gap_monitor ?? 0;

  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 pb-12 pt-5 sm:px-6 lg:px-8">
      <TranspoIntelligenceNav currentTool="opportunity-synthesis" />

      <header className="mb-4">
        <h1 className="m-0 text-xl font-extrabold text-stone-900 sm:text-[22px]">
          Transpo Opportunities
        </h1>
        <p className="m-0 mt-1 max-w-2xl text-sm text-stone-500">
          Ranked opportunity synthesis from demand anchors, provider capacity, and evidence gaps.
        </p>
      </header>

      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {[
          ["Total", loading ? "…" : total],
          ["High confidence", loading ? "…" : highCount],
          ["Medium confidence", loading ? "…" : mediumCount],
          ["Research priority", loading ? "…" : researchCount],
          ["Low-gap monitors", loading ? "…" : monitorCount],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-lg border border-stone-200 bg-white px-3 py-2 shadow-sm"
          >
            <div className="text-[10px] font-bold uppercase tracking-wide text-stone-400">
              {label}
            </div>
            <div className="text-xl font-extrabold text-stone-900">{value}</div>
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs font-semibold text-stone-600">
          County
          <select
            value={countyFilter}
            onChange={(e) => setCountyFilter(e.target.value)}
            className="h-8 min-w-[160px] rounded-md border border-stone-200 bg-white px-2 text-sm"
          >
            <option value="">All counties</option>
            {counties.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs font-semibold text-stone-600">
          Opportunity type
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-8 min-w-[180px] rounded-md border border-stone-200 bg-white px-2 text-sm"
          >
            <option value="">All types</option>
            {OPPORTUNITY_TYPES.map((t) => (
              <option key={t} value={t}>
                {TRANSPO_OPPORTUNITY_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs font-semibold text-stone-600">
          Confidence
          <select
            value={confidenceFilter}
            onChange={(e) => setConfidenceFilter(e.target.value)}
            className="h-8 min-w-[120px] rounded-md border border-stone-200 bg-white px-2 text-sm"
          >
            <option value="">All</option>
            {CONFIDENCE_LEVELS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs font-semibold text-stone-600">
          Research priority
          <select
            value={researchFilter}
            onChange={(e) => setResearchFilter(e.target.value)}
            className="h-8 min-w-[120px] rounded-md border border-stone-200 bg-white px-2 text-sm"
          >
            <option value="">All</option>
            {RESEARCH_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs font-semibold text-stone-600">
          Min actionability
          <input
            type="number"
            min={0}
            max={100}
            value={minActionability}
            onChange={(e) => setMinActionability(e.target.value)}
            placeholder="0"
            className="h-8 w-24 rounded-md border border-stone-200 bg-white px-2 text-sm"
          />
        </label>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
          <div className="border-b border-stone-100 bg-stone-50 px-3 py-2 text-xs text-stone-500">
            {loading
              ? "Loading…"
              : `${sortedRows.length} opportunit${sortedRows.length === 1 ? "y" : "ies"} · sorted by actionability`}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {[
                    "County",
                    "Opportunity Type",
                    "Confidence",
                    "Actionability",
                    "Demand",
                    "Capacity",
                    "Evidence",
                    "Providers",
                    "Next Action",
                  ].map((h) => (
                    <th key={h} style={th}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedRows.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ ...td, textAlign: "center", color: "#a8a29e" }}>
                      {loading ? "Loading opportunities…" : "No opportunities match filters."}
                    </td>
                  </tr>
                ) : (
                  sortedRows.map((row) => {
                    const active = selected?.opportunityKey === row.opportunityKey;
                    const conf = CONFIDENCE_STYLES[row.confidence];
                    return (
                      <tr
                        key={row.opportunityKey}
                        onClick={() => setSelected(row)}
                        className="cursor-pointer"
                        style={{ background: active ? "#fafaf9" : undefined }}
                      >
                        <td style={td}>
                          <div className="font-semibold text-stone-800">{row.county}</div>
                          <div className="text-[10px] text-stone-400">{row.state}</div>
                        </td>
                        <td style={td}>
                          <span className="text-xs font-semibold text-indigo-800">
                            {TRANSPO_OPPORTUNITY_TYPE_LABELS[row.opportunityType]}
                          </span>
                        </td>
                        <td style={td}>
                          <span
                            className="rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase"
                            style={{
                              color: conf.fg,
                              background: conf.bg,
                              border: `1px solid ${conf.bd}`,
                            }}
                          >
                            {row.confidence}
                          </span>
                        </td>
                        <td style={{ ...td, fontWeight: 800 }}>{row.actionabilityScore}</td>
                        <td style={td}>{row.demandScore}</td>
                        <td style={td}>{row.capacityScore}</td>
                        <td style={td}>{row.evidenceCompletenessScore}%</td>
                        <td style={td}>{row.providerCount}</td>
                        <td style={{ ...td, maxWidth: 220, fontSize: 11 }}>{row.nextAction}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm lg:sticky lg:top-4 lg:self-start">
          {selected ? (
            <>
              <h2 className="m-0 text-sm font-extrabold text-stone-900">{selected.title}</h2>
              <p className="mt-2 text-xs leading-relaxed text-stone-600">{selected.summary}</p>

              <div className="mt-4 border-t border-stone-100 pt-3">
                <div className="text-[10px] font-bold uppercase tracking-wide text-stone-400">
                  Demand anchors
                </div>
                <AnchorList label="Hospitals" items={selected.demandAnchors.hospitals} />
                <AnchorList label="Dialysis" items={selected.demandAnchors.dialysis} />
                <AnchorList label="Meal programs" items={selected.demandAnchors.mealPrograms} />
                <AnchorList label="Senior centers" items={selected.demandAnchors.seniorCenters} />
                <AnchorList label="VA" items={selected.demandAnchors.va} />
                <AnchorList label="Behavioral health" items={selected.demandAnchors.behavioralHealth} />
              </div>

              {selected.topProviders.length > 0 ? (
                <div className="mt-3 border-t border-stone-100 pt-3">
                  <div className="text-[10px] font-bold uppercase tracking-wide text-stone-400">
                    Top providers
                  </div>
                  <ul className="m-0 list-disc pl-4 text-xs text-stone-600">
                    {selected.topProviders.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {selected.missingCriticalEvidence.length > 0 ? (
                <div className="mt-3 border-t border-stone-100 pt-3">
                  <div className="text-[10px] font-bold uppercase tracking-wide text-stone-400">
                    Missing critical evidence
                  </div>
                  <ul className="m-0 list-disc pl-4 text-xs text-red-800">
                    {selected.missingCriticalEvidence.map((k) => (
                      <li key={k}>{k.replace(/_/g, " ")}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="mt-3 border-t border-stone-100 pt-3">
                <div className="text-[10px] font-bold uppercase tracking-wide text-stone-400">
                  Rationale
                </div>
                <ul className="m-0 list-disc pl-4 text-xs text-stone-600">
                  {selected.rationale.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>

              <div className="mt-3 border-t border-stone-100 pt-3">
                <div className="text-[10px] font-bold uppercase tracking-wide text-stone-400">
                  Source artifacts
                </div>
                <ul className="m-0 list-none space-y-1 p-0 text-[10px] text-stone-500">
                  {selected.sourceArtifacts.map((a) => (
                    <li key={a} className="break-all font-mono">
                      {a}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            <p className="m-0 text-xs text-stone-400">Select a county opportunity to view detail.</p>
          )}
        </aside>
      </div>
    </div>
  );
}
