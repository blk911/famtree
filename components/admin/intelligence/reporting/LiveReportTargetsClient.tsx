"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MarketIntelChrome } from "@/components/admin/MarketIntelChrome";
import { ReportingIntelligenceNav } from "@/components/admin/intelligence/reporting/ReportingIntelligenceNav";
import type {
  AcquisitionWorkflowStage,
  ReportTarget,
  ReportTargetStatus,
  RequestPackage,
  RequestTemplate,
} from "@/lib/intelligence/reporting/target-types";

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

const STATUS_COLORS: Record<ReportTargetStatus, string> = {
  identified: "#57534e",
  request_ready: "#3730a3",
  requested: "#92400e",
  acquired: "#166534",
  failed: "#b91c1c",
};

const WORKFLOW_STAGES: AcquisitionWorkflowStage[] = [
  "identified",
  "request_ready",
  "requested",
  "acquired",
  "extracted",
  "signals_generated",
];

function workflowIndex(stage: AcquisitionWorkflowStage): number {
  if (stage === "failed") return -1;
  return WORKFLOW_STAGES.indexOf(stage);
}

function WorkflowProgress({ stage }: { stage: AcquisitionWorkflowStage }) {
  if (stage === "failed") {
    return <span className="text-[10px] font-bold uppercase text-red-700">failed</span>;
  }
  const current = workflowIndex(stage);
  return (
    <div className="flex flex-wrap gap-0.5">
      {WORKFLOW_STAGES.map((s, i) => (
        <span
          key={s}
          className="rounded px-1 py-0.5 text-[9px] font-bold uppercase"
          style={{
            background: i <= current ? "#dcfce7" : "#f5f5f4",
            color: i <= current ? "#166534" : "#a8a29e",
            border: `1px solid ${i <= current ? "#bbf7d0" : "#e7e5e4"}`,
          }}
        >
          {s.replace(/_/g, " ")}
        </span>
      ))}
    </div>
  );
}

export function LiveReportTargetsClient() {
  const [targets, setTargets] = useState<ReportTarget[]>([]);
  const [packages, setPackages] = useState<RequestPackage[]>([]);
  const [templates, setTemplates] = useState<RequestTemplate[]>([]);
  const [summary, setSummary] = useState<{
    total: number;
    requestReady: number;
    requested: number;
    acquired: number;
    failed: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/intelligence/reporting/live-targets", {
        cache: "no-store",
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? data.detail ?? "Failed to load live targets");
        return;
      }
      setTargets(data.targets?.targets ?? []);
      setPackages(data.packages?.packages ?? []);
      setTemplates(data.templates?.templates ?? []);
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

  const operationalTargets = useMemo(
    () =>
      targets.filter(
        (t) => t.reportCategory !== "contract_attachment" && t.status !== "acquired",
      ),
    [targets],
  );

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
          <span className="font-bold text-indigo-800">Live Targets</span>
        </div>
        <h1 className="m-0 text-xl font-extrabold text-stone-900 sm:text-[22px]">
          Live Report Targets
        </h1>
        <p className="m-0 mt-1 max-w-3xl text-sm text-stone-500">
          Prioritized acquisition queue — what report, who has it, how to get it, what value it unlocks.
        </p>
      </header>

      <ReportingIntelligenceNav current="live-targets" />

      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {[
          ["Targets", summary?.total ?? "…"],
          ["Request Ready", summary?.requestReady ?? "…"],
          ["Requested", summary?.requested ?? "…"],
          ["Acquired", summary?.acquired ?? "…"],
          ["Failed", summary?.failed ?? "…"],
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
        <h2 className="m-0 text-sm font-extrabold text-indigo-950">Top Acquisition Targets</h2>
        <p className="m-0 mt-1 text-xs text-indigo-800/80">
          Ranked by expected operational insight — first real reports with denial counts and failure metrics.
        </p>
      </section>

      <div className="mb-4 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
        <div className="border-b border-stone-100 bg-stone-50 px-3 py-2 text-xs text-stone-500">
          {loading ? "Loading…" : `${targets.length} targets`}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {[
                  "Priority",
                  "Report",
                  "Holder",
                  "Method",
                  "Status",
                  "Insight Value",
                  "Expected Insights",
                  "Workflow",
                ].map((h) => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {targets.map((t) => (
                <tr key={t.targetKey}>
                  <td style={td}>
                    <span className="font-extrabold text-indigo-800">{t.priority}</span>
                  </td>
                  <td style={td}>
                    <div className="font-semibold text-stone-800">{t.reportName}</div>
                    {t.sourceUrl ? (
                      <a
                        href={t.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-indigo-700 no-underline hover:underline"
                      >
                        source
                      </a>
                    ) : null}
                  </td>
                  <td style={td}>{t.holder}</td>
                  <td style={td}>{t.acquisitionMethod.replace(/_/g, " ")}</td>
                  <td style={td}>
                    <span
                      className="text-[10px] font-bold uppercase"
                      style={{ color: STATUS_COLORS[t.status] }}
                    >
                      {t.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td style={td}>
                    <span className="font-bold text-stone-900">{t.expectedInsightValue}</span>
                  </td>
                  <td style={{ ...td, maxWidth: 220 }}>
                    <div className="flex flex-wrap gap-1">
                      {t.expectedInsights.slice(0, 4).map((insight) => (
                        <span
                          key={insight}
                          className="rounded bg-stone-50 px-1 py-0.5 text-[10px] text-stone-600 ring-1 ring-stone-200"
                        >
                          {insight}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td style={{ ...td, minWidth: 280 }}>
                    <WorkflowProgress stage={t.workflowStage} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {packages.length > 0 ? (
        <section className="mb-4 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
          <h2 className="m-0 text-sm font-extrabold text-stone-900">Request Packages</h2>
          <p className="m-0 mt-1 text-xs text-stone-500">
            {operationalTargets.length} operational targets pending acquisition
          </p>
          <div className="mt-3 space-y-3">
            {packages.slice(0, 5).map((pkg) => (
              <div
                key={pkg.packageKey}
                className="rounded-lg border border-stone-100 bg-stone-50 p-3"
              >
                <div className="font-bold text-stone-900">{pkg.reportName}</div>
                <div className="text-xs text-stone-600">
                  Holder: {pkg.holder} · {pkg.suggestedRequestType.replace(/_/g, " ")}
                </div>
                <a
                  href={pkg.requestPath.startsWith("http") ? pkg.requestPath : CORA_FALLBACK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-indigo-700 no-underline hover:underline"
                >
                  {pkg.requestPath.startsWith("http") ? "Open request path" : pkg.requestPath}
                </a>
                <div className="mt-1 flex flex-wrap gap-1">
                  {pkg.expectedOutput.map((o) => (
                    <span
                      key={o}
                      className="rounded bg-white px-1.5 py-0.5 text-[10px] font-semibold text-green-800 ring-1 ring-green-200"
                    >
                      {o}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {templates.length > 0 ? (
        <section className="mb-4 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
          <h2 className="m-0 text-sm font-extrabold text-stone-900">Request Templates</h2>
          <p className="m-0 mt-1 text-xs text-stone-500">Reusable CORA request assets</p>
          <div className="mt-3 space-y-2">
            {templates.map((tpl) => (
              <div key={tpl.templateKey} className="rounded-lg border border-stone-100 p-3">
                <button
                  type="button"
                  onClick={() =>
                    setExpandedTemplate((prev) => (prev === tpl.templateKey ? null : tpl.templateKey))
                  }
                  className="w-full cursor-pointer border-0 bg-transparent p-0 text-left"
                >
                  <div className="font-bold text-stone-900">{tpl.subject}</div>
                  <div className="text-xs text-stone-500">{tpl.agency}</div>
                </button>
                {expandedTemplate === tpl.templateKey ? (
                  <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded bg-stone-50 p-3 text-xs text-stone-700">
                    {tpl.body}
                  </pre>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

const CORA_FALLBACK = "https://hcpf.colorado.gov/contact-hcpf";
