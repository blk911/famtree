"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { TranspoIntelligenceNav } from "@/components/admin/intelligence/transpo/TranspoIntelligenceNav";
import { ServiceDeficitDetailDrawer } from "@/components/admin/intelligence/transpo/ServiceDeficitDetailDrawer";
import {
  SERVICE_CATEGORY_LABELS,
  type TranspoGapSeverity,
  type TranspoServiceCategory,
} from "@/lib/intelligence/transpo/market-gaps/types";
import type {
  TranspoRevenuePotential,
  TranspoServiceDeficitQuestion,
  TranspoServiceDeficitRecord,
  TranspoServiceDeficitSummary,
} from "@/lib/intelligence/transpo/service-deficits/deficit-types";

const SEV: Record<TranspoGapSeverity, { fg: string; bg: string }> = {
  critical: { fg: "#991b1b", bg: "#fef2f2" },
  high: { fg: "#9a3412", bg: "#ffedd5" },
  medium: { fg: "#92400e", bg: "#fef3c7" },
  low: { fg: "#166534", bg: "#dcfce7" },
};

type SortColumn = "market" | "service" | "need" | "payer" | "coverage" | "deficit" | "severity" | "revenue" | "play";
type SortDir = "asc" | "desc";

const SORT_COLS: { key: SortColumn; label: string }[] = [
  { key: "market", label: "Market" },
  { key: "service", label: "Service" },
  { key: "need", label: "Need" },
  { key: "payer", label: "Payer" },
  { key: "coverage", label: "Coverage" },
  { key: "deficit", label: "Deficit" },
  { key: "severity", label: "Severity" },
  { key: "revenue", label: "Revenue" },
  { key: "play", label: "Recommended Play" },
];

const SEV_ORDER: Record<TranspoGapSeverity, number> = { critical: 4, high: 3, medium: 2, low: 1 };
const REV_ORDER: Record<TranspoRevenuePotential, number> = { strategic: 4, high: 3, medium: 2, low: 1 };

function compareRecords(a: TranspoServiceDeficitRecord, b: TranspoServiceDeficitRecord, col: SortColumn, dir: SortDir): number {
  const sign = dir === "asc" ? 1 : -1;
  let cmp = 0;
  switch (col) {
    case "market": cmp = a.marketLabel.localeCompare(b.marketLabel); break;
    case "service": cmp = SERVICE_CATEGORY_LABELS[a.serviceCategory].localeCompare(SERVICE_CATEGORY_LABELS[b.serviceCategory]); break;
    case "need": cmp = a.needScore - b.needScore; break;
    case "payer": cmp = a.payerPresenceScore - b.payerPresenceScore; break;
    case "coverage": cmp = a.coverageScore - b.coverageScore; break;
    case "deficit": cmp = a.deficitScore - b.deficitScore; break;
    case "severity": cmp = SEV_ORDER[a.severity] - SEV_ORDER[b.severity]; break;
    case "revenue": cmp = REV_ORDER[a.revenueOpportunity.revenuePotential] - REV_ORDER[b.revenueOpportunity.revenuePotential]; break;
    case "play": cmp = a.revenueOpportunity.recommendedPlay.localeCompare(b.revenueOpportunity.recommendedPlay); break;
  }
  return cmp * sign;
}

export default function TranspoServiceDeficitsPage() {
  const [summary, setSummary] = useState<TranspoServiceDeficitSummary | null>(null);
  const [records, setRecords] = useState<TranspoServiceDeficitRecord[]>([]);
  const [questions, setQuestions] = useState<TranspoServiceDeficitQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [backfilling, setBackfilling] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<TranspoServiceDeficitRecord | null>(null);

  const [stateFilter, setStateFilter] = useState("");
  const [countyFilter, setCountyFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<TranspoServiceCategory | "">("");
  const [severityFilter, setSeverityFilter] = useState<TranspoGapSeverity | "">("");
  const [revenueFilter, setRevenueFilter] = useState<TranspoRevenuePotential | "">("");
  const [sortKey, setSortKey] = useState<SortColumn>("deficit");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const toggleSort = useCallback((col: SortColumn) => {
    if (sortKey === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(col);
      setSortDir(col === "market" || col === "service" || col === "play" ? "asc" : "desc");
    }
  }, [sortKey]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/intelligence/transpo/service-deficits", { cache: "no-store" });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? "Failed to load");
        return;
      }
      setSummary(data.summary ?? null);
      setRecords(data.records ?? []);
      setQuestions(data.questions ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleBackfill() {
    setBackfilling(true);
    try {
      const res = await fetch("/api/admin/intelligence/transpo/service-deficits/backfill", { method: "POST" });
      const data = await res.json();
      if (!data.ok) { setError(data.error ?? "Backfill failed"); return; }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBackfilling(false);
    }
  }

  const states = useMemo(() => Array.from(new Set(records.map((r) => r.state))).sort(), [records]);
  const counties = useMemo(() => Array.from(new Set(records.filter((r) => !stateFilter || r.state === stateFilter).map((r) => r.county))).sort(), [records, stateFilter]);

  const filtered = useMemo(() => records.filter((r) => {
    if (stateFilter && r.state !== stateFilter) return false;
    if (countyFilter && r.county !== countyFilter) return false;
    if (categoryFilter && r.serviceCategory !== categoryFilter) return false;
    if (severityFilter && r.severity !== severityFilter) return false;
    if (revenueFilter && r.revenueOpportunity.revenuePotential !== revenueFilter) return false;
    return true;
  }), [records, stateFilter, countyFilter, categoryFilter, severityFilter, revenueFilter]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    list.sort((a, b) => compareRecords(a, b, sortKey, sortDir));
    return list;
  }, [filtered, sortKey, sortDir]);

  const topRevenue = summary?.topRevenueOpportunities ?? [];

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 20px 60px" }}>
      <TranspoIntelligenceNav currentTool="service-deficits" />

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Service Deficits</h1>
          <p style={{ fontSize: 12, color: "#78716c", margin: 0, maxWidth: 680, lineHeight: 1.55 }}>
            Need → Payer → Provider → Coverage. Identify underserved transportation markets where public funding exists.
          </p>
        </div>
        <button type="button" onClick={handleBackfill} disabled={backfilling} style={{
          fontSize: 13, fontWeight: 700, padding: "9px 18px", borderRadius: 8, border: "none",
          background: backfilling ? "#d6d3d1" : "#4338ca", color: "#fff", cursor: backfilling ? "default" : "pointer",
        }}>
          {backfilling ? "Building…" : "Run Service Deficit Backfill"}
        </button>
      </div>

      {error ? <div style={{ marginBottom: 16, fontSize: 12, color: "#b91c1c", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 12px" }}>{error}</div> : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 10, marginBottom: 20 }}>
        {[["Deficits", summary?.totalDeficits ?? "…"], ["Critical", summary?.critical ?? 0], ["High", summary?.high ?? 0], ["Medium", summary?.medium ?? 0], ["Low", summary?.low ?? 0], ["Avg Deficit", summary?.averageDeficitScore ?? 0]].map(([l, v]) => (
          <div key={l} style={{ background: "#fff", border: "1px solid #e7e5e4", borderRadius: 10, padding: "12px 14px" }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: "#a8a29e" }}>{l}</div>
            <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>{v}</div>
          </div>
        ))}
      </div>

      {topRevenue.length > 0 ? (
        <div style={{ background: "#eef2ff", border: "1px solid #c7d2fe", borderRadius: 14, padding: "14px 18px", marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "#4338ca", marginBottom: 8 }}>TOP REVENUE OPPORTUNITIES</div>
          <div style={{ display: "grid", gap: 6 }}>
            {topRevenue.slice(0, 5).map((r) => (
              <div key={r.id} style={{ fontSize: 12, color: "#3730a3" }}>
                <strong>{r.marketLabel}</strong> — {r.revenueOpportunity.revenuePotential} · {r.revenueOpportunity.recommendedPlay}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
        <select value={stateFilter} onChange={(e) => setStateFilter(e.target.value)} style={sel}><option value="">All states</option>{states.map((s) => <option key={s} value={s}>{s}</option>)}</select>
        <select value={countyFilter} onChange={(e) => setCountyFilter(e.target.value)} style={sel}><option value="">All counties</option>{counties.map((c) => <option key={c} value={c}>{c}</option>)}</select>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value as TranspoServiceCategory | "")} style={sel}>
          <option value="">All services</option>
          {(Object.keys(SERVICE_CATEGORY_LABELS) as TranspoServiceCategory[]).map((c) => <option key={c} value={c}>{SERVICE_CATEGORY_LABELS[c]}</option>)}
        </select>
        <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value as TranspoGapSeverity | "")} style={sel}>
          <option value="">All severity</option>
          {(["critical", "high", "medium", "low"] as TranspoGapSeverity[]).map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={revenueFilter} onChange={(e) => setRevenueFilter(e.target.value as TranspoRevenuePotential | "")} style={sel}>
          <option value="">All revenue potential</option>
          {(["strategic", "high", "medium", "low"] as TranspoRevenuePotential[]).map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <span style={{ fontSize: 11, color: "#a8a29e" }}>{sorted.length} shown</span>
      </div>

      <div style={{ background: "#fff", border: "1px solid #e7e5e4", borderRadius: 14, overflow: "auto", marginBottom: 24 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1100 }}>
          <thead>
            <tr>
              {SORT_COLS.map(({ key, label }) => {
                const active = sortKey === key;
                return (
                  <th key={key} style={th}>
                    <button type="button" onClick={() => toggleSort(key)} style={thBtn(active)}>{label} {active ? (sortDir === "asc" ? "▲" : "▼") : "↕"}</button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={9} style={{ ...td, textAlign: "center" }}>Loading…</td></tr>
              : sorted.length === 0 ? <tr><td colSpan={9} style={{ ...td, textAlign: "center" }}>No deficits — run backfill after carrier ingest.</td></tr>
              : sorted.map((r) => {
                const sev = SEV[r.severity];
                return (
                  <tr key={r.id} onClick={() => setSelected(r)} style={{ cursor: "pointer" }}>
                    <td style={{ ...td, fontWeight: 700, color: "#1c1917" }}>{r.marketLabel}</td>
                    <td style={td}>{SERVICE_CATEGORY_LABELS[r.serviceCategory]}</td>
                    <td style={td}>{r.needScore}</td>
                    <td style={td}>{r.payerPresenceScore}</td>
                    <td style={td}>{r.coverageScore}</td>
                    <td style={{ ...td, fontWeight: 800 }}>{r.deficitScore}</td>
                    <td style={td}><span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, color: sev.fg, background: sev.bg }}>{r.severity}</span></td>
                    <td style={td}>{r.revenueOpportunity.revenuePotential}</td>
                    <td style={{ ...td, maxWidth: 220 }}>{r.revenueOpportunity.recommendedPlay}</td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      <div style={{ background: "#fff", border: "1px solid #e7e5e4", borderRadius: 14, padding: "18px 20px" }}>
        <h2 style={{ fontSize: 14, fontWeight: 800, margin: "0 0 14px" }}>Questions Answered</h2>
        <div style={{ display: "grid", gap: 12 }}>
          {questions.map((q) => (
            <div key={q.id} style={{ borderTop: "1px solid #f5f4f2", paddingTop: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#4338ca" }}>{q.id}</div>
              <div style={{ fontSize: 13, fontWeight: 700, margin: "4px 0" }}>{q.question}</div>
              <div style={{ fontSize: 12, color: "#57534e", lineHeight: 1.55 }}>{q.answer}</div>
            </div>
          ))}
        </div>
      </div>

      <ServiceDeficitDetailDrawer record={selected} open={!!selected} onClose={() => setSelected(null)} />
    </div>
  );
}

const sel: React.CSSProperties = { fontSize: 12, padding: "6px 10px", borderRadius: 8, border: "1px solid #e7e5e4", background: "#fff" };
const th: React.CSSProperties = { textAlign: "left", padding: "8px 12px", fontSize: 10, fontWeight: 800, color: "#a8a29e", borderBottom: "1px solid #f0ede8", background: "#fafaf9" };
const td: React.CSSProperties = { padding: "10px 12px", fontSize: 12, color: "#57534e", borderBottom: "1px solid #f5f4f2", verticalAlign: "top" };
const thBtn = (active: boolean): React.CSSProperties => ({
  display: "inline-flex", alignItems: "center", gap: 4, padding: 0, border: "none", background: "transparent",
  font: "inherit", fontWeight: 800, color: active ? "#4338ca" : "#a8a29e", cursor: "pointer", whiteSpace: "nowrap",
});
