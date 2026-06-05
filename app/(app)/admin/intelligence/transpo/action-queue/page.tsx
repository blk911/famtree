"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { TranspoIntelligenceNav } from "@/components/admin/intelligence/transpo/TranspoIntelligenceNav";
import { ActionQueueDrawer } from "@/components/admin/intelligence/transpo/ActionQueueDrawer";
import { actionabilityTier } from "@/lib/intelligence/transpo/action-queue/action-engine";
import type {
  TranspoActionDecision,
  TranspoActionQueueQuestion,
  TranspoActionQueueRecord,
  TranspoActionQueueSummary,
  TranspoActionStatus,
} from "@/lib/intelligence/transpo/action-queue/action-types";
import { SERVICE_CATEGORY_LABELS, type TranspoServiceCategory } from "@/lib/intelligence/transpo/market-gaps/types";

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

const sel: React.CSSProperties = { fontSize: 12, padding: "6px 10px", borderRadius: 8, border: "1px solid #e7e5e4", background: "#fff" };

export default function TranspoActionQueuePage() {
  const searchParams = useSearchParams();
  const [summary, setSummary] = useState<TranspoActionQueueSummary | null>(null);
  const [records, setRecords] = useState<TranspoActionQueueRecord[]>([]);
  const [questions, setQuestions] = useState<TranspoActionQueueQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<TranspoActionQueueRecord | null>(null);

  const [decisionFilter, setDecisionFilter] = useState<TranspoActionDecision | "">("");
  const [statusFilter, setStatusFilter] = useState<TranspoActionStatus | "">("");
  const [serviceFilter, setServiceFilter] = useState<TranspoServiceCategory | "">("");
  const [countyFilter, setCountyFilter] = useState("");
  const [tierFilter, setTierFilter] = useState<"" | "immediate" | "priority" | "investigate" | "watch">("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/intelligence/transpo/action-queue", { cache: "no-store" });
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

  useEffect(() => {
    const actionId = searchParams.get("action");
    if (actionId && records.length > 0) {
      const match = records.find((r) => r.id === actionId);
      if (match) setSelected(match);
    }
  }, [searchParams, records]);

  const filtered = useMemo(() => records.filter((r) => {
    if (decisionFilter && r.decision !== decisionFilter) return false;
    if (statusFilter && r.status !== statusFilter) return false;
    if (serviceFilter && r.serviceCategory !== serviceFilter) return false;
    if (countyFilter && !r.county.toLowerCase().includes(countyFilter.toLowerCase())) return false;
    if (tierFilter && actionabilityTier(r.actionabilityScore) !== tierFilter) return false;
    return true;
  }), [records, decisionFilter, statusFilter, serviceFilter, countyFilter, tierFilter]);

  const sorted = useMemo(
    () => [...filtered].sort((a, b) => b.actionabilityScore - a.actionabilityScore),
    [filtered],
  );

  function handleUpdated(record: TranspoActionQueueRecord) {
    setRecords((prev) => prev.map((r) => (r.id === record.id ? record : r)));
    setSelected(record);
    load();
  }

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 20px 60px" }}>
      <TranspoIntelligenceNav currentTool="action-queue" />

      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Action Queue</h1>
        <p style={{ fontSize: 12, color: "#78716c", margin: 0, maxWidth: 680, lineHeight: 1.55 }}>
          Track transportation opportunities from investigation through execution.
        </p>
      </div>

      {error ? <div style={{ marginBottom: 16, fontSize: 12, color: "#b91c1c", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 12px" }}>{error}</div> : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 10, marginBottom: 20 }}>
        {[["New", summary?.new ?? "…"], ["Active", summary?.active ?? "…"], ["Waiting", summary?.waiting ?? "…"], ["Completed", summary?.completed ?? "…"], ["Rejected", summary?.rejected ?? "…"], ["Immediate", summary?.immediateOpportunities ?? "…"]].map(([l, v]) => (
          <div key={l} style={{ background: "#fff", border: "1px solid #e7e5e4", borderRadius: 10, padding: "12px 14px" }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: "#a8a29e" }}>{l}</div>
            <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
        <select value={decisionFilter} onChange={(e) => setDecisionFilter(e.target.value as TranspoActionDecision | "")} style={sel}>
          <option value="">All decisions</option>
          {(["unreviewed", "investigate", "partner", "acquire", "launch", "watch", "reject"] as TranspoActionDecision[]).map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as TranspoActionStatus | "")} style={sel}>
          <option value="">All status</option>
          {(["new", "active", "waiting", "completed", "closed"] as TranspoActionStatus[]).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value as TranspoServiceCategory | "")} style={sel}>
          <option value="">All services</option>
          {(Object.keys(SERVICE_CATEGORY_LABELS) as TranspoServiceCategory[]).map((c) => (
            <option key={c} value={c}>{SERVICE_CATEGORY_LABELS[c]}</option>
          ))}
        </select>
        <select value={tierFilter} onChange={(e) => setTierFilter(e.target.value as typeof tierFilter)} style={sel}>
          <option value="">All actionability</option>
          <option value="immediate">Immediate (75+)</option>
          <option value="priority">Priority (50–74)</option>
          <option value="investigate">Investigate (25–49)</option>
          <option value="watch">Watch (0–24)</option>
        </select>
        <input value={countyFilter} onChange={(e) => setCountyFilter(e.target.value)} placeholder="County" style={sel} />
        <span style={{ fontSize: 11, color: "#a8a29e" }}>{sorted.length} shown</span>
      </div>

      <div style={{ background: "#fff", border: "1px solid #e7e5e4", borderRadius: 14, overflow: "auto", marginBottom: 24 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1100 }}>
          <thead>
            <tr>
              {["County", "Service", "Gap", "Confidence", "Actionability", "Play", "Decision", "Status", "Updated"].map((h) => (
                <th key={h} style={th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={9} style={{ ...td, textAlign: "center" }}>Loading…</td></tr>
              : sorted.length === 0 ? <tr><td colSpan={9} style={{ ...td, textAlign: "center" }}>No actions — promote from Opportunity Radar or County Dossier.</td></tr>
              : sorted.map((r) => {
                const svc = r.serviceCategory as TranspoServiceCategory;
                return (
                  <tr key={r.id} onClick={() => setSelected(r)} style={{ cursor: "pointer" }}>
                    <td style={{ ...td, fontWeight: 700, color: "#1c1917" }}>{r.county}, {r.state}</td>
                    <td style={td}>{SERVICE_CATEGORY_LABELS[svc] ?? r.serviceCategory}</td>
                    <td style={{ ...td, fontWeight: 800 }}>{r.deficitScore}</td>
                    <td style={td}>{r.confidenceScore}</td>
                    <td style={td}>{r.actionabilityScore}</td>
                    <td style={{ ...td, maxWidth: 180 }}>{r.recommendedPlay}</td>
                    <td style={td}>{r.decision}</td>
                    <td style={td}>{r.status}</td>
                    <td style={td}>{new Date(r.updatedAt).toLocaleDateString()}</td>
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

      <ActionQueueDrawer record={selected} open={!!selected} onClose={() => setSelected(null)} onUpdated={handleUpdated} />
    </div>
  );
}
