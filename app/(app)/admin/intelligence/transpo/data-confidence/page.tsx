"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { TranspoIntelligenceNav } from "@/components/admin/intelligence/transpo/TranspoIntelligenceNav";
import { DataSourceStatusBadge } from "@/components/admin/intelligence/transpo/DataSourceStatusBadge";
import {
  SERVICE_CATEGORY_LABELS,
  type TranspoServiceCategory,
} from "@/lib/intelligence/transpo/market-gaps/types";
import type {
  TranspoConfidenceGrade,
  TranspoDataConfidenceQuestion,
  TranspoDataConfidenceRecord,
  TranspoDataConfidenceSummary,
  TranspoLiveDataSetupStatus,
} from "@/lib/intelligence/transpo/data-confidence/data-confidence-types";
import type { TranspoServiceDeficitRecord } from "@/lib/intelligence/transpo/service-deficits/deficit-types";

const GRADE_STYLE: Record<TranspoConfidenceGrade, { fg: string; bg: string }> = {
  high: { fg: "#166534", bg: "#dcfce7" },
  medium: { fg: "#1d4ed8", bg: "#dbeafe" },
  low: { fg: "#92400e", bg: "#fef3c7" },
  experimental: { fg: "#991b1b", bg: "#fef2f2" },
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

function marketLabel(r: TranspoDataConfidenceRecord): string {
  return r.county ? `${r.county}, ${r.state}` : r.state;
}

export default function TranspoDataConfidencePage() {
  const [summary, setSummary] = useState<TranspoDataConfidenceSummary | null>(null);
  const [records, setRecords] = useState<TranspoDataConfidenceRecord[]>([]);
  const [questions, setQuestions] = useState<TranspoDataConfidenceQuestion[]>([]);
  const [setup, setSetup] = useState<TranspoLiveDataSetupStatus | null>(null);
  const [deficits, setDeficits] = useState<TranspoServiceDeficitRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [backfilling, setBackfilling] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [confRes, defRes] = await Promise.all([
        fetch("/api/admin/intelligence/transpo/data-confidence", { cache: "no-store" }),
        fetch("/api/admin/intelligence/transpo/service-deficits", { cache: "no-store" }),
      ]);
      const confData = await confRes.json();
      const defData = await defRes.json();
      if (!confData.ok) {
        setError(confData.error ?? "Failed to load");
        return;
      }
      setSummary(confData.summary ?? null);
      setRecords(confData.records ?? []);
      setQuestions(confData.questions ?? []);
      setSetup(confData.setup ?? null);
      if (defData.ok) setDeficits(defData.records ?? []);
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
      const res = await fetch("/api/admin/intelligence/transpo/data-confidence/backfill", { method: "POST" });
      const data = await res.json();
      if (!data.ok) { setError(data.error ?? "Backfill failed"); return; }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBackfilling(false);
    }
  }

  const deficitByKey = useMemo(
    () => new Map(deficits.map((d) => [`${d.state}|${d.county}|${d.serviceCategory}`, d])),
    [deficits],
  );

  const weakRecords = useMemo(
    () => records.filter((r) => r.confidenceGrade === "low" || r.confidenceGrade === "experimental"),
    [records],
  );

  const actionableRecords = useMemo(() => {
    return records.filter((r) => {
      const d = deficitByKey.get(`${r.state}|${r.county ?? ""}|${r.serviceCategory ?? ""}`);
      if (!d) return false;
      const sevOk = d.severity === "high" || d.severity === "critical";
      const revOk =
        d.revenueOpportunity.revenuePotential === "high" ||
        d.revenueOpportunity.revenuePotential === "strategic";
      const confOk = r.confidenceGrade === "high" || r.confidenceGrade === "medium";
      return sevOk && revOk && confOk;
    });
  }, [records, deficitByKey]);

  const summaryCards = [
    ["High", summary?.high ?? "…"],
    ["Medium", summary?.medium ?? 0],
    ["Low", summary?.low ?? 0],
    ["Experimental", summary?.experimental ?? 0],
    ["Live Carrier Supply", summary?.liveCarrierSupply ?? 0],
    ["Live Verification", summary?.liveVerification ?? 0],
    ["Seeded Demand", summary?.seededDemand ?? 0],
    ["Seeded Payers", summary?.seededPayers ?? 0],
    ["Missing Demand/Payer", summary?.missingDemandOrPayer ?? 0],
  ];

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 20px 60px" }}>
      <TranspoIntelligenceNav currentTool="data-confidence" />

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Live Data Confidence</h1>
          <p style={{ fontSize: 12, color: "#78716c", margin: 0, maxWidth: 680, lineHeight: 1.55 }}>
            Separate live signals from seeded, heuristic, and missing data before acting on service deficits.
          </p>
        </div>
        <button type="button" onClick={handleBackfill} disabled={backfilling} style={{
          fontSize: 13, fontWeight: 700, padding: "9px 18px", borderRadius: 8, border: "none",
          background: backfilling ? "#d6d3d1" : "#4338ca", color: "#fff", cursor: backfilling ? "default" : "pointer",
        }}>
          {backfilling ? "Building…" : "Run Confidence Backfill"}
        </button>
      </div>

      {error ? (
        <div style={{ marginBottom: 16, fontSize: 12, color: "#b91c1c", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 12px" }}>
          {error}
        </div>
      ) : null}

      {setup ? (
        <div style={{ background: "#fff", border: "1px solid #e7e5e4", borderRadius: 14, padding: "16px 18px", marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "#4338ca", marginBottom: 10 }}>LIVE DATA SETUP</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8, fontSize: 12, marginBottom: 14 }}>
            <SetupRow label="DATABASE_URL" ok={setup.databaseUrlPresent} />
            <SetupRow label="TRANSPO_FMCSA_PROVIDER" value={setup.transpoFmcsaProvider} />
            <SetupRow label="GOOGLE_MAPS_API_KEY" ok={setup.googleMapsApiKeyPresent} />
            <SetupRow label="Carrier master" value={String(setup.carrierMasterCount)} />
            <SetupRow label="Verifications" value={String(setup.verificationCount)} />
            <SetupRow label="Demand layer" value={setup.demandSourceStatus} />
            <SetupRow label="Payer layer" value={setup.payerSourceStatus} />
            <SetupRow label="Storage" value={`${setup.storageBackend}${setup.storageDurable ? " (durable)" : ""}`} />
          </div>
          <ol style={{ margin: 0, paddingLeft: 20, fontSize: 12, color: "#57534e", lineHeight: 1.7 }}>
            <li>Set TRANSPO_FMCSA_PROVIDER=live</li>
            <li>Run FMCSA live pull</li>
            <li>Promote source run to carriers</li>
            <li>Run verification</li>
            <li>Run service deficit backfill</li>
            <li>Run confidence backfill</li>
            <li>Connect Census/ACS demand source</li>
            <li>Connect Medicaid/NEMT payer/provider registry</li>
          </ol>
        </div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 10, marginBottom: 20 }}>
        {summaryCards.map(([l, v]) => (
          <div key={l} style={{ background: "#fff", border: "1px solid #e7e5e4", borderRadius: 10, padding: "12px 14px" }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: "#a8a29e" }}>{l}</div>
            <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>{v}</div>
          </div>
        ))}
      </div>

      <Section title="Confidence Table">
        <ConfidenceTable records={records} loading={loading} />
      </Section>

      <Section title="Weak Data (low / experimental)">
        <ConfidenceTable records={weakRecords} loading={loading} emptyMsg="No weak-confidence records." />
      </Section>

      <Section title="Actionable Now (medium+ confidence, high/critical deficit, high/strategic revenue)">
        <ActionableTable records={actionableRecords} deficitByKey={deficitByKey} loading={loading} />
      </Section>

      <div style={{ background: "#fff", border: "1px solid #e7e5e4", borderRadius: 14, padding: "18px 20px", marginTop: 24 }}>
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
    </div>
  );
}

function SetupRow({ label, ok, value }: { label: string; ok?: boolean; value?: string }) {
  const display = value ?? (ok ? "present" : "missing");
  const color = ok === undefined ? "#57534e" : ok ? "#166534" : "#b91c1c";
  return (
    <div>
      <span style={{ color: "#a8a29e", fontWeight: 700 }}>{label}: </span>
      <span style={{ color, fontWeight: 600 }}>{display}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h2 style={{ fontSize: 14, fontWeight: 800, margin: "0 0 10px" }}>{title}</h2>
      {children}
    </div>
  );
}

function ConfidenceTable({
  records,
  loading,
  emptyMsg = "No records — run confidence backfill after service deficits.",
}: {
  records: TranspoDataConfidenceRecord[];
  loading: boolean;
  emptyMsg?: string;
}) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e7e5e4", borderRadius: 14, overflow: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1100 }}>
        <thead>
          <tr>
            {["Market", "Service", "Confidence", "Grade", "Carrier Supply", "Verification", "Demand", "Payer", "Revenue", "Next Data Source"].map((h) => (
              <th key={h} style={th}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={10} style={{ ...td, textAlign: "center" }}>Loading…</td></tr>
          ) : records.length === 0 ? (
            <tr><td colSpan={10} style={{ ...td, textAlign: "center" }}>{emptyMsg}</td></tr>
          ) : (
            records.map((r) => {
              const grade = GRADE_STYLE[r.confidenceGrade];
              const svc = r.serviceCategory as TranspoServiceCategory | undefined;
              return (
                <tr key={r.id}>
                  <td style={{ ...td, fontWeight: 700, color: "#1c1917" }}>{marketLabel(r)}</td>
                  <td style={td}>{svc ? SERVICE_CATEGORY_LABELS[svc] : "—"}</td>
                  <td style={{ ...td, fontWeight: 800 }}>{r.confidenceScore}</td>
                  <td style={td}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, color: grade.fg, background: grade.bg }}>
                      {r.confidenceGrade}
                    </span>
                  </td>
                  <td style={td}><DataSourceStatusBadge status={r.carrierSupplyStatus} compact /></td>
                  <td style={td}><DataSourceStatusBadge status={r.verificationStatus} compact /></td>
                  <td style={td}><DataSourceStatusBadge status={r.demandStatus} compact /></td>
                  <td style={td}><DataSourceStatusBadge status={r.payerStatus} compact /></td>
                  <td style={td}><DataSourceStatusBadge status={r.revenueStatus} compact /></td>
                  <td style={{ ...td, maxWidth: 200 }}>{r.recommendedNextDataSource ?? "—"}</td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

function ActionableTable({
  records,
  deficitByKey,
  loading,
}: {
  records: TranspoDataConfidenceRecord[];
  deficitByKey: Map<string, TranspoServiceDeficitRecord>;
  loading: boolean;
}) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e7e5e4", borderRadius: 14, overflow: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 800 }}>
        <thead>
          <tr>
            {["Market", "Service", "Confidence", "Deficit", "Severity", "Revenue"].map((h) => (
              <th key={h} style={th}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={6} style={{ ...td, textAlign: "center" }}>Loading…</td></tr>
          ) : records.length === 0 ? (
            <tr><td colSpan={6} style={{ ...td, textAlign: "center" }}>No actionable markets yet.</td></tr>
          ) : (
            records.map((r) => {
              const d = deficitByKey.get(`${r.state}|${r.county ?? ""}|${r.serviceCategory ?? ""}`);
              const svc = r.serviceCategory as TranspoServiceCategory | undefined;
              return (
                <tr key={r.id}>
                  <td style={{ ...td, fontWeight: 700 }}>{marketLabel(r)}</td>
                  <td style={td}>{svc ? SERVICE_CATEGORY_LABELS[svc] : "—"}</td>
                  <td style={td}>{r.confidenceScore} ({r.confidenceGrade})</td>
                  <td style={td}>{d?.deficitScore ?? "—"}</td>
                  <td style={td}>{d?.severity ?? "—"}</td>
                  <td style={td}>{d?.revenueOpportunity.revenuePotential ?? "—"}</td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
