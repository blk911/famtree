"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { TranspoIntelligenceNav } from "@/components/admin/intelligence/transpo/TranspoIntelligenceNav";
import { TranspoClearRuntimeAction } from "@/components/admin/runtime/TranspoClearRuntimeAction";
import type { CountyCapacity, ProviderCapacity } from "@/lib/transpo/provider-types";

type Summary = {
  totalProviders: number;
  countiesCovered: number;
  regionalProviders: number;
  statewideProviders: number;
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

export function TranspoProviderCapacityClient() {
  const searchParams = useSearchParams();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [providers, setProviders] = useState<ProviderCapacity[]>([]);
  const [countyCapacity, setCountyCapacity] = useState<CountyCapacity | null>(null);
  const [counties, setCounties] = useState<string[]>([]);
  const [countyFilter, setCountyFilter] = useState(searchParams.get("county") ?? "Alamosa");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const allRes = await fetch("/api/admin/intelligence/transpo/provider-capacity", {
        cache: "no-store",
      });
      const allData = await allRes.json();
      if (!allData.ok) {
        setError(allData.error ?? allData.detail ?? "Failed to load provider registry");
        return;
      }

      const countySet = new Set<string>();
      for (const p of allData.providers as ProviderCapacity[]) {
        for (const c of p.countiesServed) countySet.add(c);
      }
      setCounties(Array.from(countySet).sort());

      const params = new URLSearchParams();
      if (countyFilter) params.set("county", countyFilter);
      params.set("state", "CO");

      const res = await fetch(
        `/api/admin/intelligence/transpo/provider-capacity?${params.toString()}`,
        { cache: "no-store" },
      );
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? "Failed to load");
        return;
      }

      setSummary(data.summary ?? null);
      setProviders(data.providers ?? []);
      setCountyCapacity(data.countyCapacity?.[0] ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [countyFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const sortedProviders = useMemo(
    () =>
      [...providers].sort((a, b) => {
        if (b.countyCount !== a.countyCount) return b.countyCount - a.countyCount;
        return a.providerName.localeCompare(b.providerName);
      }),
    [providers],
  );

  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 pb-12 pt-5 sm:px-6 lg:px-8">
      <TranspoIntelligenceNav currentTool="provider-capacity" />

      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="m-0 text-xl font-extrabold text-stone-900 sm:text-[22px]">
            Provider Capacity Registry
          </h1>
          <p className="m-0 mt-1 max-w-2xl text-sm text-stone-500">
            Colorado HCPF NEMT providers and county service footprints.
          </p>
        </div>
        <TranspoClearRuntimeAction />
      </header>

      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ["Total Providers", summary?.totalProviders ?? "…"],
          ["Counties Covered", summary?.countiesCovered ?? "…"],
          ["Regional Providers", summary?.regionalProviders ?? "…"],
          ["Statewide Providers", summary?.statewideProviders ?? "…"],
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

      <div className="mb-4">
        <label className="flex flex-col gap-1 text-xs font-semibold text-stone-600">
          County filter
          <select
            value={countyFilter}
            onChange={(e) => setCountyFilter(e.target.value)}
            className="h-8 max-w-xs rounded-md border border-stone-200 bg-white px-2 text-sm"
          >
            <option value="">All counties</option>
            {counties.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
      </div>

      {countyCapacity ? (
        <section className="mb-4 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
          <h2 className="m-0 text-sm font-extrabold text-stone-900">
            {countyCapacity.county} County capacity
          </h2>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              ["Providers", countyCapacity.providerCount],
              ["Active", countyCapacity.activeProviders],
              ["Regional", countyCapacity.regionalProviders],
              ["Capacity Score", countyCapacity.capacityScore],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-xs"
              >
                <div className="font-semibold text-stone-500">{label}</div>
                <div className="text-lg font-extrabold text-stone-900">{value}</div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-sm">
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 960 }}>
          <thead>
            <tr>
              {[
                "Provider",
                "Counties Served",
                "County Count",
                "Phone",
                "Footprint Score",
                "Active Medicaid",
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
                <td colSpan={6} style={{ ...td, textAlign: "center", color: "#a8a29e" }}>
                  Loading…
                </td>
              </tr>
            ) : sortedProviders.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ ...td, textAlign: "center", color: "#a8a29e" }}>
                  No providers match filters.
                </td>
              </tr>
            ) : (
              sortedProviders.map((p) => (
                <tr key={p.providerKey}>
                  <td style={{ ...td, fontWeight: 600, color: "#1c1917" }}>{p.providerName}</td>
                  <td style={{ ...td, maxWidth: 320 }}>
                    {countyFilter
                      ? p.countiesServed.filter((c) => c.toLowerCase() === countyFilter.toLowerCase()).join(", ") || p.countiesServed.slice(0, 6).join(", ")
                      : p.countiesServed.slice(0, 8).join(", ")}
                    {p.countiesServed.length > 8 && !countyFilter ? ` +${p.countiesServed.length - 8}` : ""}
                  </td>
                  <td style={td}>{p.countyCount}</td>
                  <td style={td}>{p.phone ?? "—"}</td>
                  <td style={td}>{p.footprintScore}</td>
                  <td style={td}>{p.activeMedicaidProvider ? "Yes" : "No"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
