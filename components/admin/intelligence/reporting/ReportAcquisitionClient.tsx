"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MarketIntelChrome } from "@/components/admin/MarketIntelChrome";
import { ReportingIntelligenceNav } from "@/components/admin/intelligence/reporting/ReportingIntelligenceNav";
import type {
  AcquiredReport,
  AcquisitionStatus,
  RecordsRequestTarget,
  ReportSource,
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

const STATUS_COLORS: Record<AcquisitionStatus, string> = {
  not_started: "#a8a29e",
  discovered: "#3730a3",
  requested: "#92400e",
  acquired: "#166534",
  failed: "#b91c1c",
};

function StatusBadge({ status }: { status: AcquisitionStatus }) {
  return (
    <span
      className="text-[10px] font-bold uppercase"
      style={{ color: STATUS_COLORS[status] }}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

export function ReportAcquisitionClient() {
  const [sources, setSources] = useState<ReportSource[]>([]);
  const [acquired, setAcquired] = useState<AcquiredReport[]>([]);
  const [recordsTargets, setRecordsTargets] = useState<RecordsRequestTarget[]>([]);
  const [failureSignalCount, setFailureSignalCount] = useState(0);
  const [summary, setSummary] = useState<{
    sources: number;
    acquired: number;
    pending: number;
    failureSignals: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/intelligence/reporting/acquisition", { cache: "no-store" });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? data.detail ?? "Failed to load acquisition engine");
        return;
      }
      setSources(data.acquisition?.sources ?? []);
      setAcquired(data.acquisition?.acquiredReports ?? []);
      setRecordsTargets(data.recordsTargets?.targets ?? []);
      setFailureSignalCount(data.failureSignals?.total ?? 0);
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

  const extractedBySource = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const a of acquired) {
      map.set(a.sourceKey, a.extracted);
    }
    return map;
  }, [acquired]);

  const pendingCount = summary?.pending ?? sources.filter(
    (s) => s.acquisitionStatus === "discovered" || s.acquisitionStatus === "requested" || s.acquisitionStatus === "not_started",
  ).length;

  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 pb-12 pt-5 sm:px-6 lg:px-8">
      <MarketIntelChrome />

      <header className="mb-4">
        <div className="mb-2 text-xs text-stone-500">
          <Link href="/admin/intelligence/transpo" className="font-semibold text-stone-600 no-underline hover:underline">
            Intelligence
          </Link>
          <span className="mx-1">›</span>
          <Link href="/admin/intelligence/reporting" className="font-semibold text-stone-600 no-underline hover:underline">
            Reporting
          </Link>
          <span className="mx-1">›</span>
          <span className="font-bold text-indigo-800">Acquisition</span>
        </div>
        <h1 className="m-0 text-xl font-extrabold text-stone-900 sm:text-[22px]">
          Report Acquisition Engine
        </h1>
        <p className="m-0 mt-1 max-w-3xl text-sm text-stone-500">
          Can we get each report? Track acquisition paths, store acquired documents, and feed extraction.
        </p>
      </header>

      <ReportingIntelligenceNav current="acquisition" />

      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ["Sources", summary?.sources ?? "…"],
          ["Acquired", summary?.acquired ?? "…"],
          ["Pending", pendingCount],
          ["Failure Signals", failureSignalCount],
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

      {recordsTargets.length > 0 ? (
        <section className="mb-4 rounded-xl border border-amber-200 bg-amber-50/50 p-4 shadow-sm">
          <h2 className="m-0 text-sm font-extrabold text-amber-950">Highest Value Acquisition Targets</h2>
          <ol className="m-0 mt-2 list-decimal space-y-2 pl-5 text-sm text-stone-700">
            {recordsTargets.slice(0, 5).map((t) => (
              <li key={t.targetKey}>
                <span className="font-bold text-stone-900">{t.reportName}</span>
                <span className="text-stone-500"> — {t.holder}</span>
                <div className="text-xs text-amber-800">
                  {t.accessMethod.replace(/_/g, " ")} · priority {t.priority}
                </div>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
        <div className="border-b border-stone-100 bg-stone-50 px-3 py-2 text-xs text-stone-500">
          {loading ? "Loading…" : `${sources.length} report sources`}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {["Entity", "Report", "Acquisition Method", "Status", "Public?", "Extracted?"].map((h) => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sources.map((s) => (
                <tr key={s.sourceKey}>
                  <td style={td}>
                    <div className="font-semibold text-stone-800">{s.entityName}</div>
                  </td>
                  <td style={td}>
                    <div>{s.reportName}</div>
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
                  <td style={td}>{s.acquisitionMethod.replace(/_/g, " ")}</td>
                  <td style={td}>
                    <StatusBadge status={s.acquisitionStatus} />
                  </td>
                  <td style={td}>{s.publicAvailable ? "yes" : "no"}</td>
                  <td style={td}>
                    {extractedBySource.get(s.sourceKey) ? (
                      <span className="font-bold text-green-800">yes</span>
                    ) : s.acquisitionStatus === "acquired" ? (
                      <span className="text-stone-400">pending</span>
                    ) : (
                      <span className="text-stone-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
