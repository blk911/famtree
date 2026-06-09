"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { TranspoIntelligenceNav } from "@/components/admin/intelligence/transpo/TranspoIntelligenceNav";
import { ReportingIntelligenceNav } from "@/components/admin/intelligence/reporting/ReportingIntelligenceNav";
import type {
  ExtractedMetric,
  FailureSignal,
  FailureSignalSeverity,
} from "@/lib/intelligence/reporting/acquisition-types";

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

const SEVERITY_COLORS: Record<FailureSignalSeverity, string> = {
  low: "#57534e",
  medium: "#92400e",
  high: "#c2410c",
  critical: "#b91c1c",
};

const REPORT_NAMES: Record<string, string> = {
  "osa:nemt-audit-2021": "OSA NEMT Performance Audit (2021)",
  "contract:hcpf-nemt-rfp": "HCPF NEMT Broker Contract",
};

function categoryForSignal(signal: FailureSignal): string {
  if (signal.signalType === "complaint_spike") return "complaints";
  if (signal.signalType === "denial_spike") return "denials";
  if (signal.signalType === "missed_dialysis") return "dialysis";
  if (signal.signalType === "provider_shortage") return "provider_network";
  if (signal.signalType === "missed_kpi") return "timeliness";
  if (signal.signalType === "corrective_action") return "corrective_action";
  return "other";
}

export function OperationalFailureSignalsClient() {
  const [signals, setSignals] = useState<FailureSignal[]>([]);
  const [metrics, setMetrics] = useState<ExtractedMetric[]>([]);
  const [summary, setSummary] = useState<{
    metricsExtracted: number;
    failureSignals: number;
    critical: number;
    high: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/intelligence/reporting/signals", { cache: "no-store" });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? data.detail ?? "Failed to load failure signals");
        return;
      }
      setSignals(data.failureSignals?.signals ?? []);
      setMetrics(data.metrics?.metrics ?? []);
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

  const sortedSignals = useMemo(() => {
    const order: Record<FailureSignalSeverity, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    };
    return [...signals].sort((a, b) => order[a.severity] - order[b.severity]);
  }, [signals]);

  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 pb-12 pt-5 sm:px-6 lg:px-8">
      <TranspoIntelligenceNav currentTool="reporting-signals" />

      <header className="mb-4">
        <h1 className="m-0 text-xl font-extrabold text-stone-900 sm:text-[22px]">
          Operational Failure Signals
        </h1>
        <p className="m-0 mt-1 max-w-3xl text-sm text-stone-500">
          Measurable operational failures extracted from acquired reports — evidence-backed, not inferred demand.
        </p>
      </header>

      <ReportingIntelligenceNav current="signals" />

      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ["Failure Signals", summary?.failureSignals ?? "…"],
          ["Critical", summary?.critical ?? "…"],
          ["High", summary?.high ?? "…"],
          ["Metrics Extracted", summary?.metricsExtracted ?? "…"],
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

      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
        <div className="border-b border-stone-100 bg-stone-50 px-3 py-2 text-xs text-stone-500">
          {loading ? "Loading…" : `${sortedSignals.length} failure signals from ${metrics.length} metrics`}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {["Entity", "Signal", "Severity", "Source Report", "Category"].map((h) => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedSignals.map((s) => (
                <tr key={s.signalKey}>
                  <td style={td}>{s.entityName}</td>
                  <td style={{ ...td, maxWidth: 360 }}>
                    <div>{s.summary}</div>
                    {s.sourceUrl ? (
                      <a
                        href={s.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-indigo-700 no-underline hover:underline"
                      >
                        source
                      </a>
                    ) : null}
                  </td>
                  <td style={td}>
                    <span
                      className="font-bold uppercase"
                      style={{ color: SEVERITY_COLORS[s.severity] }}
                    >
                      {s.severity}
                    </span>
                  </td>
                  <td style={td}>{REPORT_NAMES[s.reportId] ?? s.reportId}</td>
                  <td style={td}>{categoryForSignal(s)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
