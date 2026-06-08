"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { TranspoIntelligenceNav } from "@/components/admin/intelligence/transpo/TranspoIntelligenceNav";
import type {
  CountyDemandDossier,
  DemandGenerator,
  DemandGeneratorCategory,
  GapLevel,
  ResearchPriority,
} from "@/lib/transpo/types";

const CATEGORIES: DemandGeneratorCategory[] = [
  "hospital",
  "dialysis",
  "va",
  "behavioral_health",
  "adult_day",
  "senior_center",
  "meal_program",
  "school_transition",
  "pharmacy",
  "other",
];

const PRIORITY_STYLES: Record<ResearchPriority, { fg: string; bg: string; bd: string }> = {
  high: { fg: "#991b1b", bg: "#fef2f2", bd: "#fecaca" },
  medium: { fg: "#92400e", bg: "#fffbeb", bd: "#fde68a" },
  low: { fg: "#166534", bg: "#f0fdf4", bd: "#bbf7d0" },
};

const CATEGORY_LABELS: Record<DemandGeneratorCategory, string> = {
  hospital: "Hospital",
  dialysis: "Dialysis",
  va: "VA",
  behavioral_health: "Behavioral Health",
  adult_day: "Adult Day",
  senior_center: "Senior Center",
  meal_program: "Meal Program",
  school_transition: "School Transition",
  pharmacy: "Pharmacy",
  other: "Other",
};

type Summary = {
  totalGenerators: number;
  countiesCovered: number;
  hospitalAnchors: number;
  dialysisAnchors: number;
  generatedAt: string;
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

export function TranspoDemandGeneratorsClient() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [generators, setGenerators] = useState<DemandGenerator[]>([]);
  const [dossier, setDossier] = useState<CountyDemandDossier | null>(null);
  const [gapLevel, setGapLevel] = useState<GapLevel | null>(null);
  const [counties, setCounties] = useState<string[]>([]);
  const [countyFilter, setCountyFilter] = useState("Alamosa");
  const [stateFilter] = useState("CO");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const allRes = await fetch("/api/admin/intelligence/transpo/demand-generators", {
        cache: "no-store",
      });
      const allData = await allRes.json();
      if (!allData.ok) {
        setError(allData.error ?? allData.detail ?? "Failed to load registry");
        return;
      }

      const countyList = Array.from(
        new Set((allData.generators as DemandGenerator[]).map((g) => g.county)),
      ).sort();
      setCounties(countyList);

      const params = new URLSearchParams();
      if (countyFilter) params.set("county", countyFilter);
      params.set("state", stateFilter);
      if (categoryFilter) params.set("category", categoryFilter);

      const res = await fetch(
        `/api/admin/intelligence/transpo/demand-generators?${params.toString()}`,
        { cache: "no-store" },
      );
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? "Failed to load");
        return;
      }

      setSummary(data.summary ?? null);
      setGenerators(data.generators ?? []);
      const selected = data.selectedDossier ?? data.dossiers?.[0] ?? null;
      setDossier(selected);
      setGapLevel(selected?.gapLevel ?? data.selectedGap?.gapLevel ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [countyFilter, stateFilter, categoryFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const sortedGenerators = useMemo(
    () =>
      [...generators].sort((a, b) => {
        if (a.category !== b.category) return a.category.localeCompare(b.category);
        return a.displayName.localeCompare(b.displayName);
      }),
    [generators],
  );

  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 pb-12 pt-5 sm:px-6 lg:px-8">
      <TranspoIntelligenceNav currentTool="demand-generators" />

      <header className="mb-4">
        <h1 className="m-0 text-xl font-extrabold text-stone-900 sm:text-[22px]">
          Transpo Demand Generators
        </h1>
        <p className="m-0 mt-1 max-w-2xl text-sm text-stone-500">
          Facilities and programs that create recurring transportation need.
        </p>
      </header>

      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ["Generators", summary?.totalGenerators ?? "…"],
          ["Counties", summary?.countiesCovered ?? "…"],
          ["Hospitals", summary?.hospitalAnchors ?? "…"],
          ["Dialysis", summary?.dialysisAnchors ?? "…"],
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
          Category
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-8 min-w-[160px] rounded-md border border-stone-200 bg-white px-2 text-sm"
          >
            <option value="">All categories</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {CATEGORY_LABELS[cat]}
              </option>
            ))}
          </select>
        </label>

        {countyFilter ? (
          <>
            <Link
              href={`/admin/intelligence/transpo/providers?county=${encodeURIComponent(countyFilter)}&state=CO`}
              className="text-xs font-semibold text-indigo-700 no-underline hover:underline"
            >
              View provider capacity →
            </Link>
            <Link
              href={`/admin/intelligence/transpo/missing-evidence?county=${encodeURIComponent(countyFilter)}`}
              className="text-xs font-semibold text-indigo-700 no-underline hover:underline"
            >
              View Missing Evidence →
            </Link>
          </>
        ) : null}
      </div>

      {dossier ? (
        <section className="mb-4 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
          <h2 className="m-0 text-sm font-extrabold text-stone-900">
            {dossier.county} County dossier
          </h2>
          <p className="m-0 mt-0.5 text-xs text-stone-500">
            Demand generators behind the county opportunity signal.
          </p>

          {dossier.evidenceCompletenessScore != null ? (
            <div className="mt-3 rounded-lg border border-dashed border-stone-300 bg-stone-50 px-3 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wide text-stone-500">
                    Evidence completeness
                  </div>
                  <div className="text-lg font-extrabold text-stone-900">
                    {dossier.evidenceCompletenessScore}%
                  </div>
                  <div className="text-xs text-stone-600">
                    Known: {dossier.evidenceKnownCount ?? 0} · Inferred:{" "}
                    {dossier.evidenceInferredCount ?? 0} · Missing:{" "}
                    {dossier.evidenceMissingCount ?? 0}
                  </div>
                </div>
                {dossier.researchPriority ? (
                  <span
                    className="rounded-md px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide"
                    style={{
                      color: PRIORITY_STYLES[dossier.researchPriority].fg,
                      background: PRIORITY_STYLES[dossier.researchPriority].bg,
                      border: `1px solid ${PRIORITY_STYLES[dossier.researchPriority].bd}`,
                    }}
                  >
                    Research: {dossier.researchPriority}
                  </span>
                ) : null}
                <Link
                  href={`/admin/intelligence/transpo/missing-evidence?county=${encodeURIComponent(dossier.county)}`}
                  className="text-xs font-semibold text-indigo-700 no-underline hover:underline"
                >
                  View Missing Evidence →
                </Link>
              </div>
            </div>
          ) : null}

          <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
            <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
              <div className="mb-2 text-[10px] font-bold uppercase tracking-wide text-stone-500">
                Demand
              </div>
              <div className="space-y-1 text-xs text-stone-700">
                <div>Hospitals: {dossier.countsByCategory.hospital ?? 0}</div>
                <div>Dialysis: {dossier.countsByCategory.dialysis ?? 0}</div>
                <div>Meals: {dossier.countsByCategory.meal_program ?? 0}</div>
                <div>Senior Centers: {dossier.countsByCategory.senior_center ?? 0}</div>
              </div>
            </div>

            <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
              <div className="mb-2 text-[10px] font-bold uppercase tracking-wide text-stone-500">
                Capacity
              </div>
              <div className="space-y-1 text-xs text-stone-700">
                <div>Provider Count: {dossier.providerCount ?? 0}</div>
                <div className="mt-2 text-[10px] font-bold uppercase tracking-wide text-stone-400">
                  Provider Names
                </div>
                <ul className="m-0 max-h-28 list-disc overflow-y-auto pl-4">
                  {(dossier.providerNames ?? []).slice(0, 8).map((name) => (
                    <li key={name}>{name}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
              <div className="mb-2 text-[10px] font-bold uppercase tracking-wide text-stone-500">
                Result
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  ["Demand", dossier.demandScore],
                  ["Capacity", dossier.providerCapacityScore ?? 0],
                  ["Opportunity", dossier.opportunityScore ?? 0],
                  ["Evidence", dossier.evidenceCompletenessScore ?? "—"],
                ].map(([label, value]) => (
                  <div key={label} className="text-xs">
                    <div className="font-semibold text-stone-500">{label}</div>
                    <div className="text-lg font-extrabold text-stone-900">{value}</div>
                  </div>
                ))}
                <div className="col-span-2 text-xs">
                  <div className="font-semibold text-stone-500">Gap Level</div>
                  <div className="text-sm font-extrabold uppercase text-stone-900">
                    {gapLevel ?? dossier.gapLevel ?? "—"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {dossier.missingData.length > 0 ? (
            <div className="mt-3 rounded-lg border border-dashed border-amber-200 bg-amber-50 px-3 py-2">
              <div className="text-[10px] font-bold uppercase tracking-wide text-amber-800">
                Missing data
              </div>
              <div className="mt-1 flex flex-wrap gap-1">
                {dossier.missingData.map((m) => (
                  <span
                    key={m}
                    className="rounded-md bg-white px-1.5 py-0.5 text-[10px] font-medium text-amber-900 ring-1 ring-amber-200"
                  >
                    {m}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-sm">
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
          <thead>
            <tr>
              {[
                "Facility / program",
                "Category",
                "County",
                "City",
                "Est. trips/wk",
                "Confidence",
                "Source",
                "Notes",
              ].map((h) => (
                <th key={h} style={th}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ ...td, textAlign: "center", color: "#a8a29e" }}>
                  Loading…
                </td>
              </tr>
            ) : sortedGenerators.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ ...td, textAlign: "center", color: "#a8a29e" }}>
                  No demand generators match filters.
                </td>
              </tr>
            ) : (
              sortedGenerators.map((g) => (
                <tr key={g.generatorKey}>
                  <td style={{ ...td, fontWeight: 600, color: "#1c1917" }}>{g.displayName}</td>
                  <td style={td}>{CATEGORY_LABELS[g.category]}</td>
                  <td style={td}>{g.county}</td>
                  <td style={td}>{g.city ?? "—"}</td>
                  <td style={td}>
                    {g.estimatedTripsPerWeek != null ? g.estimatedTripsPerWeek.toLocaleString() : "—"}
                  </td>
                  <td style={td}>{g.confidence}</td>
                  <td style={td}>{g.sourceProvider}</td>
                  <td style={{ ...td, maxWidth: 280 }}>
                    {g.notes?.length ? g.notes[0] : "—"}
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
