"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { TranspoIntelligenceNav } from "@/components/admin/intelligence/transpo/TranspoIntelligenceNav";
import { ReportingIntelligenceNav } from "@/components/admin/intelligence/reporting/ReportingIntelligenceNav";
import type {
  LiveOpportunityConfidence,
  LiveOpportunityTarget,
  LiveOpportunityTargetsArtifact,
  StartHereItem,
} from "@/lib/intelligence/reporting/live-opportunity-types";

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

const CONFIDENCE_COLORS: Record<LiveOpportunityConfidence, string> = {
  high: "#166534",
  medium: "#92400e",
  low: "#57534e",
};

export function LiveOpportunityDecisionClient() {
  const [targets, setTargets] = useState<LiveOpportunityTarget[]>([]);
  const [startHere, setStartHere] = useState<StartHereItem[]>([]);
  const [summary, setSummary] = useState<LiveOpportunityTargetsArtifact["summary"] | null>(null);
  const [selected, setSelected] = useState<LiveOpportunityTarget | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/intelligence/reporting/live-opportunities", {
        cache: "no-store",
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? data.detail ?? "Failed to load live opportunities");
        return;
      }
      const rows = (data.artifact?.targets ?? []) as LiveOpportunityTarget[];
      setTargets(rows);
      setStartHere(data.artifact?.startHere ?? []);
      setSummary(data.summary ?? null);
      setSelected((prev) => {
        if (prev && rows.some((t) => t.targetKey === prev.targetKey)) return prev;
        return rows[0] ?? null;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 pb-12 pt-5 sm:px-6 lg:px-8">
      <TranspoIntelligenceNav currentTool="reporting-live-opportunities" />

      <header className="mb-2">
        <h1 className="m-0 text-xl font-extrabold text-stone-900 sm:text-[22px]">
          Live Opportunity Decision Engine
        </h1>
        <p className="m-0 mt-1 max-w-3xl text-sm text-stone-500">
          Ranks report/data targets by expected ability to expose real denials, no-shows, missed dialysis
          transportation, complaints, and provider shortages.
        </p>
      </header>

      <ReportingIntelligenceNav current="live-opportunities" />

      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ["Total Targets", loading ? "…" : targets.length],
          ["Request Ready", summary?.requestReady ?? "…"],
          ["High Confidence", summary?.highConfidence ?? "…"],
          ["Top Decision Score", summary?.topDecisionScore ?? "…"],
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

      <section className="mb-4 rounded-xl border-2 border-amber-300 bg-amber-50 p-4 shadow-sm">
        <h2 className="m-0 text-sm font-extrabold text-amber-950">Start Here</h2>
        <p className="m-0 mt-1 text-xs text-amber-900/80">
          These three document targets are likely more valuable than county scoring — they may expose actual
          operational failures.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {startHere.map((item) => (
            <div
              key={item.targetKey}
              className="rounded-lg border border-amber-200 bg-white p-3 shadow-sm"
            >
              <div className="text-[10px] font-bold uppercase text-amber-700">#{item.rank}</div>
              <div className="font-extrabold text-stone-900">{item.targetName}</div>
              <div className="mt-1 text-xs leading-relaxed text-stone-600">{item.whyItMatters}</div>
              <div className="mt-2 text-[10px] font-bold uppercase text-indigo-800">
                Score {item.decisionScore} · {item.acquisitionStatus.replace(/_/g, " ")}
              </div>
              {item.requestTemplateKey ? (
                <div className="mt-1 font-mono text-[10px] text-stone-500">{item.requestTemplateKey}</div>
              ) : null}
              <div className="mt-2 flex flex-wrap gap-1">
                {item.whatItUnlocks.slice(0, 3).map((s) => (
                  <span
                    key={s}
                    className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900 ring-1 ring-amber-200"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="mb-4 grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
          <div className="border-b border-stone-100 bg-stone-50 px-3 py-2 text-xs text-stone-500">
            {loading ? "Loading…" : `${targets.length} ranked targets — click row for detail`}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {[
                    "Rank",
                    "Target",
                    "Holder",
                    "Status",
                    "Method",
                    "Decision Score",
                    "Confidence",
                    "Next Action",
                  ].map((h) => (
                    <th key={h} style={th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {targets.map((t) => (
                  <tr
                    key={t.targetKey}
                    onClick={() => setSelected(t)}
                    style={{
                      cursor: "pointer",
                      background: selected?.targetKey === t.targetKey ? "#fffbeb" : undefined,
                    }}
                  >
                    <td style={td}>
                      <span className="font-extrabold text-amber-800">{t.rank}</span>
                    </td>
                    <td style={td}>
                      <div className="font-semibold text-stone-800">{t.targetName}</div>
                    </td>
                    <td style={td}>{t.holder}</td>
                    <td style={td}>
                      <span className="text-[10px] font-bold uppercase text-indigo-800">
                        {t.acquisitionStatus.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td style={td}>{t.acquisitionMethod.replace(/_/g, " ")}</td>
                    <td style={td}>
                      <span className="text-lg font-extrabold text-stone-900">{t.decisionScore}</span>
                    </td>
                    <td style={td}>
                      <span
                        className="font-bold uppercase"
                        style={{ color: CONFIDENCE_COLORS[t.confidence] }}
                      >
                        {t.confidence}
                      </span>
                    </td>
                    <td style={{ ...td, maxWidth: 220, fontSize: 11 }}>{t.nextAction}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {selected ? (
          <aside className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
            <h2 className="m-0 text-sm font-extrabold text-stone-900">{selected.targetName}</h2>
            <p className="m-0 mt-1 text-xs text-stone-500">{selected.holder}</p>
            <p className="m-0 mt-2 text-xs leading-relaxed text-stone-700">{selected.whyItMatters}</p>

            <div className="mt-3">
              <div className="text-[10px] font-bold uppercase text-stone-400">Expected questions answered</div>
              <ul className="m-0 mt-1 list-disc space-y-0.5 pl-4 text-xs text-stone-700">
                {selected.expectedQuestionsAnswered.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ul>
            </div>

            <div className="mt-3">
              <div className="text-[10px] font-bold uppercase text-stone-400">Expected fields</div>
              <div className="mt-1 flex flex-wrap gap-1">
                {selected.expectedFields.map((f) => (
                  <span
                    key={f}
                    className="rounded bg-stone-50 px-1.5 py-0.5 text-[10px] text-stone-600 ring-1 ring-stone-200"
                  >
                    {f}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-3">
              <div className="text-[10px] font-bold uppercase text-stone-400">Expected opportunity signals</div>
              <div className="mt-1 flex flex-wrap gap-1">
                {selected.expectedOpportunitySignals.map((s) => (
                  <span
                    key={s}
                    className="rounded bg-green-50 px-1.5 py-0.5 text-[10px] font-semibold text-green-800 ring-1 ring-green-200"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-3">
              <div className="text-[10px] font-bold uppercase text-stone-400">Evidence basis</div>
              <ul className="m-0 mt-1 list-disc space-y-0.5 pl-4 text-xs text-stone-600">
                {selected.evidenceBasis.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </div>

            {selected.requestTemplateKey ? (
              <div className="mt-3 rounded-lg border border-indigo-100 bg-indigo-50/50 p-2">
                <div className="text-[10px] font-bold uppercase text-indigo-700">Request template</div>
                <div className="font-mono text-xs text-indigo-900">{selected.requestTemplateKey}</div>
                <Link
                  href="/admin/intelligence/reporting/live-targets"
                  className="text-[10px] font-bold text-indigo-700 no-underline hover:underline"
                >
                  View templates on Live Targets →
                </Link>
              </div>
            ) : null}

            <div className="mt-3">
              <div className="text-[10px] font-bold uppercase text-stone-400">Source artifacts</div>
              <ul className="m-0 mt-1 list-none space-y-0.5 p-0 font-mono text-[10px] text-stone-500">
                {selected.sourceArtifacts.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  );
}
