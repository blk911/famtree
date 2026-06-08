"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { TranspoIntelligenceNav } from "@/components/admin/intelligence/transpo/TranspoIntelligenceNav";
import type {
  CountyEvidenceDossier,
  EvidenceCategory,
  EvidenceItem,
  ResearchPriority,
} from "@/lib/transpo/evidence-types";

type Summary = {
  counties: number;
  knownItems: number;
  inferredItems: number;
  missingItems: number;
  averageCompleteness: number;
  generatedAt: string;
};

const MISSING_CATEGORIES: EvidenceCategory[] = [
  "demand",
  "capacity",
  "operations",
  "quality",
  "broker",
  "compliance",
];

const CATEGORY_LABELS: Record<EvidenceCategory, string> = {
  demand: "Demand",
  capacity: "Capacity",
  operations: "Operations",
  quality: "Quality",
  broker: "Broker",
  compliance: "Compliance",
};

const PRIORITY_STYLES: Record<ResearchPriority, { fg: string; bg: string; bd: string }> = {
  high: { fg: "#991b1b", bg: "#fef2f2", bd: "#fecaca" },
  medium: { fg: "#92400e", bg: "#fffbeb", bd: "#fde68a" },
  low: { fg: "#166534", bg: "#f0fdf4", bd: "#bbf7d0" },
};

function EvidenceList({
  items,
  tone,
}: {
  items: EvidenceItem[];
  tone: "known" | "inferred" | "missing";
}) {
  const colors = {
    known: { dot: "#16a34a", text: "#166534", bg: "#f0fdf4", bd: "#bbf7d0" },
    inferred: { dot: "#d97706", text: "#92400e", bg: "#fffbeb", bd: "#fde68a" },
    missing: { dot: "#dc2626", text: "#991b1b", bg: "#fef2f2", bd: "#fecaca" },
  }[tone];

  const symbol = tone === "known" ? "✓" : tone === "inferred" ? "~" : "✗";

  if (items.length === 0) {
    return <p className="m-0 text-xs text-stone-400">None</p>;
  }

  return (
    <ul className="m-0 list-none space-y-1.5 p-0">
      {items.map((item) => (
        <li
          key={item.key}
          className="rounded-md px-2 py-1.5 text-xs"
          style={{ background: colors.bg, border: `1px solid ${colors.bd}`, color: colors.text }}
        >
          <div className="flex items-start gap-1.5">
            <span className="font-bold" style={{ color: colors.dot }}>
              {symbol}
            </span>
            <div className="min-w-0 flex-1">
              <div className="font-semibold">{item.label}</div>
              {item.value != null ? (
                <div className="text-[10px] opacity-80">Value: {String(item.value)}</div>
              ) : null}
              {item.source ? (
                <div className="text-[10px] opacity-70">Source: {item.source}</div>
              ) : null}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function TranspoMissingEvidenceClient() {
  const searchParams = useSearchParams();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [dossiers, setDossiers] = useState<CountyEvidenceDossier[]>([]);
  const [selected, setSelected] = useState<CountyEvidenceDossier | null>(null);
  const [counties, setCounties] = useState<string[]>([]);
  const [countyFilter, setCountyFilter] = useState(searchParams.get("county") ?? "Alamosa");
  const [minCompleteness, setMinCompleteness] = useState("");
  const [maxCompleteness, setMaxCompleteness] = useState("");
  const [missingCategory, setMissingCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (countyFilter) params.set("county", countyFilter);
      params.set("state", "CO");
      if (minCompleteness) params.set("minCompleteness", minCompleteness);
      if (maxCompleteness) params.set("maxCompleteness", maxCompleteness);
      if (missingCategory) params.set("missingCategory", missingCategory);

      const res = await fetch(
        `/api/admin/intelligence/transpo/county-evidence?${params.toString()}`,
        { cache: "no-store" },
      );
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? data.detail ?? "Failed to load evidence registry");
        return;
      }

      setSummary(data.summary ?? null);
      setDossiers(data.dossiers ?? []);
      setSelected(data.selectedDossier ?? data.dossiers?.[0] ?? null);
      setCounties(data.counties ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [countyFilter, minCompleteness, maxCompleteness, missingCategory]);

  useEffect(() => {
    load();
  }, [load]);

  const sortedDossiers = useMemo(
    () =>
      [...dossiers].sort((a, b) => {
        if (a.evidenceCompletenessScore !== b.evidenceCompletenessScore) {
          return a.evidenceCompletenessScore - b.evidenceCompletenessScore;
        }
        return a.county.localeCompare(b.county);
      }),
    [dossiers],
  );

  const priorityStyle = selected
    ? PRIORITY_STYLES[selected.researchPriority]
    : PRIORITY_STYLES.medium;

  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 pb-12 pt-5 sm:px-6 lg:px-8">
      <TranspoIntelligenceNav currentTool="missing-evidence" />

      <header className="mb-4">
        <h1 className="m-0 text-xl font-extrabold text-stone-900 sm:text-[22px]">
          Missing Evidence Registry
        </h1>
        <p className="m-0 mt-1 max-w-2xl text-sm text-stone-500">
          Shows what is known, inferred, and still missing for each county.
        </p>
      </header>

      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {[
          ["Counties", summary?.counties ?? "…"],
          ["Known Items", summary?.knownItems ?? "…"],
          ["Inferred Items", summary?.inferredItems ?? "…"],
          ["Missing Items", summary?.missingItems ?? "…"],
          ["Avg Completeness", summary ? `${summary.averageCompleteness}%` : "…"],
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
          Min completeness
          <input
            type="number"
            min={0}
            max={100}
            value={minCompleteness}
            onChange={(e) => setMinCompleteness(e.target.value)}
            placeholder="0"
            className="h-8 w-20 rounded-md border border-stone-200 bg-white px-2 text-sm"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs font-semibold text-stone-600">
          Max completeness
          <input
            type="number"
            min={0}
            max={100}
            value={maxCompleteness}
            onChange={(e) => setMaxCompleteness(e.target.value)}
            placeholder="100"
            className="h-8 w-20 rounded-md border border-stone-200 bg-white px-2 text-sm"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs font-semibold text-stone-600">
          Missing category
          <select
            value={missingCategory}
            onChange={(e) => setMissingCategory(e.target.value)}
            className="h-8 min-w-[140px] rounded-md border border-stone-200 bg-white px-2 text-sm"
          >
            <option value="">All categories</option>
            {MISSING_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {CATEGORY_LABELS[cat]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {selected ? (
        <section className="mb-4 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="m-0 text-sm font-extrabold text-stone-900">
                {selected.county} County
              </h2>
              <p className="m-0 mt-0.5 text-xs text-stone-500">
                Evidence completeness: {selected.evidenceCompletenessScore}% — data confidence,
                not opportunity.
              </p>
            </div>
            <span
              className="rounded-md px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide"
              style={{
                color: priorityStyle.fg,
                background: priorityStyle.bg,
                border: `1px solid ${priorityStyle.bd}`,
              }}
            >
              Research priority: {selected.researchPriority}
            </span>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
            {[
              ["Known", selected.knownCount, "#166534"],
              ["Inferred", selected.inferredCount, "#92400e"],
              ["Missing", selected.missingCount, "#991b1b"],
            ].map(([label, count, color]) => (
              <div key={label} className="rounded-lg border border-stone-200 bg-stone-50 px-2 py-2">
                <div className="font-semibold text-stone-500">{label}</div>
                <div className="text-lg font-extrabold" style={{ color: String(color) }}>
                  {count}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div>
              <h3 className="m-0 mb-2 text-[10px] font-extrabold uppercase tracking-wide text-green-700">
                Known
              </h3>
              <EvidenceList items={selected.known} tone="known" />
            </div>
            <div>
              <h3 className="m-0 mb-2 text-[10px] font-extrabold uppercase tracking-wide text-amber-700">
                Inferred
              </h3>
              <EvidenceList items={selected.inferred} tone="inferred" />
            </div>
            <div>
              <h3 className="m-0 mb-2 text-[10px] font-extrabold uppercase tracking-wide text-red-700">
                Missing
              </h3>
              <EvidenceList items={selected.missing} tone="missing" />
            </div>
          </div>
        </section>
      ) : null}

      <section className="overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-sm">
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
          <thead>
            <tr>
              {["County", "Known", "Inferred", "Missing", "Completeness", "Priority"].map(
                (h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: "left",
                      padding: "8px 12px",
                      fontSize: 10,
                      fontWeight: 800,
                      color: "#a8a29e",
                      borderBottom: "1px solid #f0ede8",
                      background: "#fafaf9",
                    }}
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={6}
                  style={{ padding: "10px 12px", textAlign: "center", color: "#a8a29e" }}
                >
                  Loading…
                </td>
              </tr>
            ) : sortedDossiers.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  style={{ padding: "10px 12px", textAlign: "center", color: "#a8a29e" }}
                >
                  No counties match filters.
                </td>
              </tr>
            ) : (
              sortedDossiers.map((d) => (
                <tr
                  key={d.countyKey}
                  onClick={() => setSelected(d)}
                  style={{ cursor: "pointer" }}
                  className={selected?.countyKey === d.countyKey ? "bg-stone-50" : undefined}
                >
                  <td style={{ padding: "10px 12px", fontSize: 12, fontWeight: 600 }}>
                    {d.county}
                  </td>
                  <td style={{ padding: "10px 12px", fontSize: 12, color: "#166534" }}>
                    {d.knownCount}
                  </td>
                  <td style={{ padding: "10px 12px", fontSize: 12, color: "#92400e" }}>
                    {d.inferredCount}
                  </td>
                  <td style={{ padding: "10px 12px", fontSize: 12, color: "#991b1b" }}>
                    {d.missingCount}
                  </td>
                  <td style={{ padding: "10px 12px", fontSize: 12 }}>{d.evidenceCompletenessScore}%</td>
                  <td style={{ padding: "10px 12px", fontSize: 12, textTransform: "uppercase" }}>
                    {d.researchPriority}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
