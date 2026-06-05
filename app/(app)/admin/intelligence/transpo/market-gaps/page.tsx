"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { IntelligenceMarketNav } from "@/components/admin/IntelligenceMarketNav";
import { TranspoIntelligenceNav } from "@/components/admin/intelligence/transpo/TranspoIntelligenceNav";
import { MarketGapDetailDrawer } from "@/components/admin/intelligence/transpo/MarketGapDetailDrawer";
import {
  SERVICE_CATEGORY_LABELS,
  type TranspoGapSeverity,
  type TranspoMarketGapQuestion,
  type TranspoMarketGapRecord,
  type TranspoMarketGapSummary,
  type TranspoRurality,
  type TranspoServiceCategory,
} from "@/lib/intelligence/transpo/market-gaps/types";

const SEVERITY_STYLE: Record<TranspoGapSeverity, { fg: string; bg: string }> = {
  critical: { fg: "#991b1b", bg: "#fef2f2" },
  high: { fg: "#9a3412", bg: "#ffedd5" },
  medium: { fg: "#92400e", bg: "#fef3c7" },
  low: { fg: "#166534", bg: "#dcfce7" },
};

const thS: React.CSSProperties = {
  textAlign: "left",
  padding: "8px 12px",
  fontSize: 10,
  fontWeight: 800,
  color: "#a8a29e",
  letterSpacing: "0.08em",
  borderBottom: "1px solid #f0ede8",
  background: "#fafaf9",
  whiteSpace: "nowrap",
};

const tdS: React.CSSProperties = {
  padding: "10px 12px",
  fontSize: 12,
  color: "#57534e",
  borderBottom: "1px solid #f5f4f2",
  verticalAlign: "top",
};

type SortColumn =
  | "market"
  | "service"
  | "carriers"
  | "verified"
  | "supply"
  | "demand"
  | "gap"
  | "severity"
  | "play";

type SortDir = "asc" | "desc";

const SORT_COLUMNS: { key: SortColumn; label: string }[] = [
  { key: "market", label: "Market" },
  { key: "service", label: "Service" },
  { key: "carriers", label: "Carriers" },
  { key: "verified", label: "Verified" },
  { key: "supply", label: "Supply" },
  { key: "demand", label: "Demand" },
  { key: "gap", label: "Gap" },
  { key: "severity", label: "Severity" },
  { key: "play", label: "Recommended Play" },
];

const SEVERITY_SORT_ORDER: Record<TranspoGapSeverity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

function compareMarketGaps(
  a: TranspoMarketGapRecord,
  b: TranspoMarketGapRecord,
  col: SortColumn,
  dir: SortDir,
): number {
  const sign = dir === "asc" ? 1 : -1;
  let cmp = 0;

  switch (col) {
    case "market":
      cmp = a.marketLabel.localeCompare(b.marketLabel, undefined, { sensitivity: "base" });
      break;
    case "service":
      cmp = SERVICE_CATEGORY_LABELS[a.serviceCategory].localeCompare(
        SERVICE_CATEGORY_LABELS[b.serviceCategory],
        undefined,
        { sensitivity: "base" },
      );
      break;
    case "carriers":
      cmp = a.carrierCount - b.carrierCount;
      break;
    case "verified":
      cmp = a.verifiedCarrierCount - b.verifiedCarrierCount;
      break;
    case "supply":
      cmp = a.supplyScore - b.supplyScore;
      break;
    case "demand":
      cmp = a.demandScore - b.demandScore;
      break;
    case "gap":
      cmp = a.gapScore - b.gapScore;
      break;
    case "severity":
      cmp = SEVERITY_SORT_ORDER[a.severity] - SEVERITY_SORT_ORDER[b.severity];
      break;
    case "play":
      cmp = a.recommendedPlay.localeCompare(b.recommendedPlay, undefined, { sensitivity: "base" });
      break;
  }

  return cmp * sign;
}

export default function TranspoMarketGapsPage() {
  const [summary, setSummary] = useState<TranspoMarketGapSummary | null>(null);
  const [records, setRecords] = useState<TranspoMarketGapRecord[]>([]);
  const [questions, setQuestions] = useState<TranspoMarketGapQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [backfilling, setBackfilling] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<TranspoMarketGapRecord | null>(null);

  const [stateFilter, setStateFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<TranspoServiceCategory | "">("");
  const [severityFilter, setSeverityFilter] = useState<TranspoGapSeverity | "">("");
  const [ruralityFilter, setRuralityFilter] = useState<TranspoRurality | "">("");
  const [sortKey, setSortKey] = useState<SortColumn>("gap");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const toggleSort = useCallback((col: SortColumn) => {
    if (sortKey === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(col);
      setSortDir(col === "market" || col === "service" || col === "play" ? "asc" : "desc");
    }
  }, [sortKey]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/intelligence/transpo/market-gaps", { cache: "no-store" });
      const data = (await res.json()) as {
        ok: boolean;
        summary?: TranspoMarketGapSummary;
        records?: TranspoMarketGapRecord[];
        questions?: TranspoMarketGapQuestion[];
        error?: string;
      };
      if (!data.ok) {
        setError(data.error ?? "Failed to load market gaps");
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

  useEffect(() => {
    load();
  }, [load]);

  async function handleBackfill() {
    setBackfilling(true);
    setError("");
    try {
      const res = await fetch("/api/admin/intelligence/transpo/market-gaps/backfill", {
        method: "POST",
      });
      const data = (await res.json()) as { ok: boolean; error?: string; persistWarning?: string };
      if (!data.ok) {
        setError(data.error ?? "Backfill failed");
        return;
      }
      if (data.persistWarning) {
        setError(`Backfill built records but cache write warned: ${data.persistWarning}`);
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBackfilling(false);
    }
  }

  const states = useMemo(
    () => Array.from(new Set(records.map((r) => r.state).filter(Boolean))).sort(),
    [records],
  );

  const filtered = useMemo(() => {
    return records.filter((r) => {
      if (stateFilter && r.state !== stateFilter) return false;
      if (categoryFilter && r.serviceCategory !== categoryFilter) return false;
      if (severityFilter && r.severity !== severityFilter) return false;
      if (ruralityFilter && r.demandSignals.rurality !== ruralityFilter) return false;
      return true;
    });
  }, [records, stateFilter, categoryFilter, severityFilter, ruralityFilter]);

  const sortedGaps = useMemo(() => {
    const list = [...filtered];
    list.sort((a, b) => compareMarketGaps(a, b, sortKey, sortDir));
    return list;
  }, [filtered, sortKey, sortDir]);

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 20px 60px" }}>
      <IntelligenceMarketNav />
      <TranspoIntelligenceNav currentTool="market-gaps" />

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1c1917", margin: "0 0 4px" }}>
            Market Gap Analyzer
          </h1>
          <p style={{ fontSize: 12, color: "#78716c", margin: 0, maxWidth: 640, lineHeight: 1.55 }}>
            Find underserved transportation markets by comparing service supply against location demand.
          </p>
        </div>
        <button
          type="button"
          onClick={handleBackfill}
          disabled={backfilling}
          style={{
            fontSize: 13, fontWeight: 700, padding: "9px 18px", borderRadius: 8, border: "none",
            background: backfilling ? "#d6d3d1" : "#4338ca", color: "#fff",
            cursor: backfilling ? "default" : "pointer",
          }}
        >
          {backfilling ? "Running backfill…" : "Run Market Gap Backfill"}
        </button>
      </div>

      {error ? (
        <div style={{
          marginBottom: 16, fontSize: 12, color: "#b91c1c", background: "#fef2f2",
          border: "1px solid #fecaca", borderRadius: 8, padding: "10px 12px",
        }}>
          {error}
        </div>
      ) : null}

      {/* Summary cards */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
        gap: 10,
        marginBottom: 20,
      }}>
        {[
          ["Markets", summary?.totalMarkets ?? (loading ? "…" : 0)],
          ["Critical", summary?.critical ?? 0],
          ["High", summary?.high ?? 0],
          ["Medium", summary?.medium ?? 0],
          ["Low", summary?.low ?? 0],
          ["Avg Gap Score", summary?.averageGapScore ?? 0],
        ].map(([label, value]) => (
          <div
            key={label}
            style={{
              background: "#fff", border: "1px solid #e7e5e4", borderRadius: 10,
              padding: "12px 14px",
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 800, color: "#a8a29e", letterSpacing: "0.06em" }}>{label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#1c1917", marginTop: 4 }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{
        display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 16, alignItems: "center",
      }}>
        <select value={stateFilter} onChange={(e) => setStateFilter(e.target.value)} style={selectStyle}>
          <option value="">All states</option>
          {states.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as TranspoServiceCategory | "")}
          style={selectStyle}
        >
          <option value="">All services</option>
          {(Object.keys(SERVICE_CATEGORY_LABELS) as TranspoServiceCategory[]).map((c) => (
            <option key={c} value={c}>{SERVICE_CATEGORY_LABELS[c]}</option>
          ))}
        </select>
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value as TranspoGapSeverity | "")}
          style={selectStyle}
        >
          <option value="">All severity</option>
          {(["critical", "high", "medium", "low"] as TranspoGapSeverity[]).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={ruralityFilter}
          onChange={(e) => setRuralityFilter(e.target.value as TranspoRurality | "")}
          style={selectStyle}
        >
          <option value="">All rurality</option>
          {(["urban", "suburban", "rural", "frontier", "unknown"] as TranspoRurality[]).map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <span style={{ fontSize: 11, color: "#a8a29e" }}>
          {sortedGaps.length} market{sortedGaps.length === 1 ? "" : "s"} shown · click a column to sort
        </span>
      </div>

      {/* Top gap table */}
      <div style={{
        background: "#fff", border: "1px solid #e7e5e4", borderRadius: 14,
        overflow: "auto", marginBottom: 24,
      }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 960 }}>
          <thead>
            <tr>
              {SORT_COLUMNS.map(({ key, label }) => {
                const active = sortKey === key;
                return (
                  <th key={key} style={thS}>
                    <button
                      type="button"
                      onClick={() => toggleSort(key)}
                      title={`Sort by ${label}`}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        padding: 0,
                        border: "none",
                        background: "transparent",
                        font: "inherit",
                        fontWeight: 800,
                        color: active ? "#4338ca" : "#a8a29e",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        letterSpacing: "0.08em",
                        fontSize: 10,
                        textTransform: "uppercase",
                      }}
                    >
                      {label}
                      <span style={{ fontSize: 9, opacity: active ? 1 : 0.45 }}>
                        {active ? (sortDir === "asc" ? "▲" : "▼") : "↕"}
                      </span>
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} style={{ ...tdS, textAlign: "center", color: "#a8a29e" }}>Loading…</td>
              </tr>
            ) : sortedGaps.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ ...tdS, textAlign: "center", color: "#a8a29e" }}>
                  No gap records — ingest carriers, then run Market Gap Backfill.
                </td>
              </tr>
            ) : (
              sortedGaps.map((r) => {
                const sev = SEVERITY_STYLE[r.severity];
                return (
                  <tr
                    key={r.id}
                    onClick={() => setSelected(r)}
                    style={{ cursor: "pointer" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "#fafaf9"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = ""; }}
                  >
                    <td style={{ ...tdS, fontWeight: 700, color: "#1c1917" }}>{r.marketLabel}</td>
                    <td style={tdS}>{SERVICE_CATEGORY_LABELS[r.serviceCategory]}</td>
                    <td style={tdS}>{r.carrierCount}</td>
                    <td style={tdS}>{r.verifiedCarrierCount}</td>
                    <td style={tdS}>{r.supplyScore}</td>
                    <td style={tdS}>{r.demandScore}</td>
                    <td style={{ ...tdS, fontWeight: 800 }}>{r.gapScore}</td>
                    <td style={tdS}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
                        color: sev.fg, background: sev.bg,
                      }}>
                        {r.severity}
                      </span>
                    </td>
                    <td style={{ ...tdS, maxWidth: 220 }}>{r.recommendedPlay}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Questions */}
      <div style={{
        background: "#fff", border: "1px solid #e7e5e4", borderRadius: 14, padding: "18px 20px",
      }}>
        <h2 style={{ fontSize: 14, fontWeight: 800, color: "#1c1917", margin: "0 0 14px" }}>
          Questions Answered
        </h2>
        <div style={{ display: "grid", gap: 12 }}>
          {questions.map((q) => (
            <div key={q.id} style={{ borderTop: "1px solid #f5f4f2", paddingTop: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#4338ca", marginBottom: 4 }}>{q.id}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1c1917", marginBottom: 4 }}>{q.question}</div>
              <div style={{ fontSize: 12, color: "#57534e", lineHeight: 1.55 }}>{q.answer}</div>
            </div>
          ))}
        </div>
      </div>

      <MarketGapDetailDrawer
        record={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  fontSize: 12,
  padding: "6px 10px",
  borderRadius: 8,
  border: "1px solid #e7e5e4",
  background: "#fff",
  color: "#44403c",
};
