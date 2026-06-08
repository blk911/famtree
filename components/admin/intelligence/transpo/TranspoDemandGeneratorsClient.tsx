"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { TranspoIntelligenceNav } from "@/components/admin/intelligence/transpo/TranspoIntelligenceNav";
import type { CountyDemandDossier, DemandGenerator, DemandGeneratorCategory } from "@/lib/transpo/types";

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
      setDossier(data.selectedDossier ?? data.dossiers?.[0] ?? null);
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

        {countyFilter.toLowerCase() === "alamosa" ? (
          <Link
            href="/admin/intelligence/transpo/county-opportunities?county=Alamosa&state=CO"
            className="text-xs font-semibold text-indigo-700 no-underline hover:underline"
          >
            View county opportunities →
          </Link>
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

          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {[
              ["Demand score", dossier.demandScore],
              ["Recurring demand", dossier.recurringDemandScore],
              ["Rural anchor", dossier.ruralAnchorScore],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex items-center justify-between rounded-lg border border-stone-200 bg-stone-50 px-3 py-2"
              >
                <span className="text-xs font-semibold text-stone-600">{label}</span>
                <span className="text-lg font-extrabold text-stone-900">{value}</span>
              </div>
            ))}
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
            <div>
              <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-stone-400">
                Counts by category
              </div>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(dossier.countsByCategory).map(([cat, count]) => (
                  <span
                    key={cat}
                    className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-900 ring-1 ring-indigo-100"
                  >
                    {CATEGORY_LABELS[cat as DemandGeneratorCategory] ?? cat}: {count}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-stone-400">
                Top anchors
              </div>
              <ul className="m-0 list-disc pl-4 text-xs text-stone-700">
                {dossier.topAnchors.map((a) => (
                  <li key={a.generatorKey}>
                    {a.displayName}{" "}
                    <span className="text-stone-400">({CATEGORY_LABELS[a.category]})</span>
                  </li>
                ))}
              </ul>
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
