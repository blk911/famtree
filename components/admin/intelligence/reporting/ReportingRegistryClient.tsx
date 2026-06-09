"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MarketIntelChrome } from "@/components/admin/MarketIntelChrome";
import type {
  AuditFinding,
  ClosestPathToFailureMetric,
  KpiDefinition,
  OperationalStressSignal,
  RequiredReport,
  ReportingConfidence,
} from "@/lib/intelligence/reporting/reporting-types";

type Tab = "reports" | "kpis" | "audits" | "stress";

const CONFIDENCE_STYLES: Record<ReportingConfidence, { fg: string; bg: string; bd: string }> = {
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

function ConfidenceBadge({ value }: { value: ReportingConfidence }) {
  const s = CONFIDENCE_STYLES[value];
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase"
      style={{ color: s.fg, background: s.bg, border: `1px solid ${s.bd}` }}
    >
      {value}
    </span>
  );
}

export function ReportingRegistryClient() {
  const [tab, setTab] = useState<Tab>("reports");
  const [reports, setReports] = useState<RequiredReport[]>([]);
  const [kpis, setKpis] = useState<KpiDefinition[]>([]);
  const [findings, setFindings] = useState<AuditFinding[]>([]);
  const [signals, setSignals] = useState<OperationalStressSignal[]>([]);
  const [closestPath, setClosestPath] = useState<ClosestPathToFailureMetric[]>([]);
  const [summary, setSummary] = useState<{
    reports: number;
    discovered: number;
    kpis: number;
    auditFindings: number;
    stressSignals: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showUnknownOnly, setShowUnknownOnly] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/intelligence/reporting", { cache: "no-store" });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? data.detail ?? "Failed to load reporting registry");
        return;
      }
      setReports(data.requiredReports?.reports ?? []);
      setKpis(data.kpiRegistry?.kpis ?? []);
      setFindings(data.auditFindings?.findings ?? []);
      setSignals(data.stressSignals?.signals ?? []);
      setClosestPath(data.stressSignals?.closestPathToFailureMetrics ?? []);
      setSummary(data.summary ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filteredReports = useMemo(() => {
    if (!showUnknownOnly) return reports;
    return reports.filter((r) => r.status === "reporting_unknown");
  }, [reports, showUnknownOnly]);

  const discoveredCount = summary?.discovered ?? reports.filter((r) => r.status === "discovered").length;

  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 pb-12 pt-5 sm:px-6 lg:px-8">
      <MarketIntelChrome />

      <header className="mb-4">
        <div className="mb-2 text-xs text-stone-500">
          <Link href="/admin/intelligence/transpo" className="font-semibold text-stone-600 no-underline hover:underline">
            Intelligence
          </Link>
          <span className="mx-1">›</span>
          <span className="font-bold text-indigo-800">Reporting</span>
        </div>
        <h1 className="m-0 text-xl font-extrabold text-stone-900 sm:text-[22px]">
          Required Reporting Registry
        </h1>
        <p className="m-0 mt-1 max-w-3xl text-sm text-stone-500">
          Contract-required reports, KPIs, audit findings, and operational stress signals —
          evidence-backed failure metrics without ride-level PHI.
        </p>
      </header>

      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ["Required Reports", summary?.reports ?? "…"],
          ["KPIs", summary?.kpis ?? "…"],
          ["Audit Findings", summary?.auditFindings ?? "…"],
          ["Stress Signals", summary?.stressSignals ?? "…"],
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

      <section className="mb-4 rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 shadow-sm">
        <h2 className="m-0 text-sm font-extrabold text-indigo-950">
          Closest Path To Failure Metrics
        </h2>
        <p className="m-0 mt-1 text-xs text-indigo-800/80">
          Ranked sources for unmet demand, service failures, and transport bottlenecks without PHI.
        </p>
        <ol className="m-0 mt-3 list-decimal space-y-3 pl-5 text-sm text-stone-700">
          {closestPath.map((item) => (
            <li key={item.rank}>
              <div className="font-bold text-stone-900">{item.entityName}</div>
              <div className="text-xs font-semibold text-indigo-800">{item.metricSource}</div>
              <p className="m-0 mt-0.5 text-xs leading-relaxed text-stone-600">{item.rationale}</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {item.failureSignals.map((s) => (
                  <span
                    key={s}
                    className="rounded bg-white px-1.5 py-0.5 text-[10px] font-semibold text-red-800 ring-1 ring-red-200"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ol>
      </section>

      <div className="mb-3 flex flex-wrap gap-2">
        {(
          [
            ["reports", `Reports (${discoveredCount} discovered)`],
            ["kpis", `KPIs (${kpis.length})`],
            ["audits", `Audits (${findings.length})`],
            ["stress", `Stress Signals (${signals.length})`],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className="rounded-full px-3 py-1 text-xs font-bold"
            style={{
              border: `1px solid ${tab === key ? "#c7d2fe" : "#e7e5e4"}`,
              background: tab === key ? "#eef2ff" : "#fff",
              color: tab === key ? "#3730a3" : "#78716c",
              cursor: "pointer",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
        {tab === "reports" ? (
          <>
            <div className="flex items-center justify-between border-b border-stone-100 bg-stone-50 px-3 py-2">
              <span className="text-xs text-stone-500">
                {loading ? "Loading…" : `${filteredReports.length} reports`}
              </span>
              <label className="flex items-center gap-2 text-xs text-stone-600">
                <input
                  type="checkbox"
                  checked={showUnknownOnly}
                  onChange={(e) => setShowUnknownOnly(e.target.checked)}
                />
                Unknown only
              </label>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    {["Entity", "Report", "Frequency", "Access", "Status", "Confidence"].map((h) => (
                      <th key={h} style={th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredReports.map((r) => (
                    <tr key={r.reportKey} style={{ opacity: r.status === "reporting_unknown" ? 0.7 : 1 }}>
                      <td style={td}>
                        <div className="font-semibold text-stone-800">{r.entityName}</div>
                      </td>
                      <td style={td}>
                        <div>{r.reportName}</div>
                        {r.sourceUrl ? (
                          <a
                            href={r.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-indigo-700 no-underline hover:underline"
                          >
                            source
                          </a>
                        ) : null}
                      </td>
                      <td style={td}>{r.frequency}</td>
                      <td style={td}>{r.publicAccess}</td>
                      <td style={td}>
                        <span
                          className="text-[10px] font-bold uppercase"
                          style={{ color: r.status === "discovered" ? "#166534" : "#a8a29e" }}
                        >
                          {r.status === "discovered" ? "discovered" : "unknown"}
                        </span>
                      </td>
                      <td style={td}>
                        <ConfidenceBadge value={r.confidence} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}

        {tab === "kpis" ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {["Entity", "Category", "KPI", "Target", "Confidence"].map((h) => (
                    <th key={h} style={th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {kpis.map((k) => (
                  <tr key={k.kpiKey}>
                    <td style={td}>{k.entityName}</td>
                    <td style={td}>{k.category}</td>
                    <td style={td}>
                      {k.kpiName}
                      <div>
                        <a href={k.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-indigo-700 no-underline hover:underline">
                          source
                        </a>
                      </div>
                    </td>
                    <td style={td}>{k.targetValue ?? "—"}</td>
                    <td style={td}>
                      <ConfidenceBadge value={k.confidence} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {tab === "audits" ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {["Entity", "Audit", "Severity", "Finding", "Corrective Action", "Confidence"].map((h) => (
                    <th key={h} style={th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {findings.map((f) => (
                  <tr key={f.findingKey}>
                    <td style={td}>{f.entityName}</td>
                    <td style={td}>
                      <div>{f.auditName}</div>
                      <div className="text-[10px] text-stone-400">{f.auditDate ?? ""}</div>
                    </td>
                    <td style={td}>
                      <span className="font-bold uppercase text-red-800">{f.severity}</span>
                    </td>
                    <td style={{ ...td, maxWidth: 280 }}>{f.finding}</td>
                    <td style={{ ...td, maxWidth: 220, fontSize: 11 }}>{f.correctiveAction ?? "—"}</td>
                    <td style={td}>
                      <ConfidenceBadge value={f.confidence} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {tab === "stress" ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {["Entity", "Type", "Severity", "Summary", "Confidence"].map((h) => (
                    <th key={h} style={th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {signals.map((s) => (
                  <tr key={s.signalKey}>
                    <td style={td}>{s.entityName}</td>
                    <td style={td}>{s.signalType.replace(/_/g, " ")}</td>
                    <td style={td}>
                      <span className="font-bold uppercase">{s.severity}</span>
                    </td>
                    <td style={{ ...td, maxWidth: 360 }}>{s.summary}</td>
                    <td style={td}>
                      <ConfidenceBadge value={s.confidence} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </div>
  );
}
