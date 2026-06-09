"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { ReportTarget } from "@/lib/intelligence/reporting/target-types";

interface NextDocumentsToAcquireProps {
  variant?: "compact" | "full";
}

export function NextDocumentsToAcquire({ variant = "full" }: NextDocumentsToAcquireProps) {
  const [targets, setTargets] = useState<ReportTarget[]>([]);
  const [requestReadyCount, setRequestReadyCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/intelligence/reporting/next-documents", {
        cache: "no-store",
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.detail ?? data.error ?? "Targets not built");
        return;
      }
      setTargets(data.targets ?? []);
      setRequestReadyCount(data.requestReadyCount ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (error && targets.length === 0) {
    return (
      <section className="mb-4 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
        <h2 className="m-0 text-sm font-extrabold text-stone-900">Next Documents To Acquire</h2>
        <p className="m-0 mt-1 text-xs text-stone-500">{error}</p>
      </section>
    );
  }

  return (
    <section
      className="mb-4 rounded-xl border border-amber-200 bg-amber-50/50 p-4 shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="m-0 text-sm font-extrabold text-amber-950">Next Documents To Acquire</h2>
          <p className="m-0 mt-1 text-xs text-amber-900/80">
            {loading
              ? "Loading acquisition queue…"
              : `${requestReadyCount} request-ready · denial counts, no-shows, missed dialysis, complaint volume`}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Link
            href="/admin/intelligence/reporting/live-opportunities"
            className="rounded-full border border-amber-400 bg-amber-100 px-3 py-1 text-xs font-bold text-amber-950 no-underline hover:bg-amber-200"
          >
            Decision engine →
          </Link>
          <Link
            href="/admin/intelligence/reporting/live-targets"
            className="rounded-full border border-amber-300 bg-white px-3 py-1 text-xs font-bold text-amber-900 no-underline hover:bg-amber-50"
          >
            Live targets
          </Link>
        </div>
      </div>

      {variant === "full" ? (
        <ol className="m-0 mt-3 list-decimal space-y-2 pl-5 text-sm text-stone-700">
          {targets.map((t) => (
            <li key={t.targetKey}>
              <span className="font-bold text-stone-900">{t.reportName}</span>
              <span className="text-stone-500"> — {t.holder}</span>
              <div className="text-xs text-amber-800">
                Priority {t.priority} · {t.acquisitionMethod.replace(/_/g, " ")} ·{" "}
                <span className="font-semibold uppercase">{t.status.replace(/_/g, " ")}</span>
              </div>
              <div className="mt-0.5 flex flex-wrap gap-1">
                {t.expectedInsights.slice(0, 3).map((insight) => (
                  <span
                    key={insight}
                    className="rounded bg-white px-1.5 py-0.5 text-[10px] font-semibold text-amber-900 ring-1 ring-amber-200"
                  >
                    {insight}
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <ul className="m-0 mt-2 list-none space-y-1 p-0 text-sm text-stone-700">
          {targets.slice(0, 3).map((t) => (
            <li key={t.targetKey}>
              <span className="font-semibold text-stone-900">{t.reportName}</span>
              <span className="text-xs text-amber-800"> — {t.status.replace(/_/g, " ")}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
