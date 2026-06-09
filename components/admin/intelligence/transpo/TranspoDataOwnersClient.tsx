"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { TranspoIntelligenceNav } from "@/components/admin/intelligence/transpo/TranspoIntelligenceNav";
import { NextDocumentsToAcquire } from "@/components/admin/intelligence/reporting/NextDocumentsToAcquire";
import { ReportingIntelligenceNav } from "@/components/admin/intelligence/reporting/ReportingIntelligenceNav";
import type {
  ClosestPathTarget,
  ColoradoNemtWorkflowArtifact,
  DataAccessPath,
  DataOpportunityScore,
  DataOwnershipRecord,
  OwnershipRole,
} from "@/lib/transpo/data-ownership-types";

const ROLES: OwnershipRole[] = [
  "request_originator",
  "authorization_owner",
  "broker",
  "dispatcher",
  "provider",
  "payer",
  "auditor",
  "complaint_owner",
  "reporting_owner",
];

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

type Summary = {
  ownershipRecords: number;
  knownSystems: number;
  publicSources: number;
  highValueTargets: number;
};

export function TranspoDataOwnersClient() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [records, setRecords] = useState<DataOwnershipRecord[]>([]);
  const [workflow, setWorkflow] = useState<ColoradoNemtWorkflowArtifact | null>(null);
  const [accessPaths, setAccessPaths] = useState<DataAccessPath[]>([]);
  const [targets, setTargets] = useState<DataOpportunityScore[]>([]);
  const [closestPath, setClosestPath] = useState<ClosestPathTarget[]>([]);
  const [knownSystems, setKnownSystems] = useState<string[]>([]);
  const [roleFilter, setRoleFilter] = useState("");
  const [selected, setSelected] = useState<DataOwnershipRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/intelligence/transpo/data-ownership", {
        cache: "no-store",
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? data.detail ?? "Failed to load data ownership registry");
        return;
      }

      const rows = (data.registry?.records ?? []) as DataOwnershipRecord[];
      setRecords(rows);
      setWorkflow(data.workflow ?? null);
      setAccessPaths(data.accessPaths?.paths ?? []);
      setTargets(data.highValueTargets?.targets ?? []);
      setClosestPath(data.highValueTargets?.closestPathToUnfilledRideData ?? []);
      setKnownSystems(data.registry?.summary?.knownSystems ?? []);
      setSummary(data.summary ?? null);
      setSelected((prev) => {
        if (prev && rows.some((r) => r.ownershipKey === prev.ownershipKey)) return prev;
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

  const filteredRecords = useMemo(() => {
    if (!roleFilter) return records;
    return records.filter((r) => r.role === roleFilter);
  }, [records, roleFilter]);

  const selectedAccess = useMemo(
    () => accessPaths.find((p) => p.ownershipKey === selected?.ownershipKey) ?? null,
    [accessPaths, selected],
  );

  const selectedTarget = useMemo(
    () => targets.find((t) => t.ownershipKey === selected?.ownershipKey) ?? null,
    [targets, selected],
  );

  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 pb-12 pt-5 sm:px-6 lg:px-8">
      <TranspoIntelligenceNav currentTool="data-owners" />

      <header className="mb-4">
        <h1 className="m-0 text-xl font-extrabold text-stone-900 sm:text-[22px]">
          Transpo Data Ownership Registry
        </h1>
        <p className="m-0 mt-1 max-w-3xl text-sm text-stone-500">
          Who owns the ride ledger — request through payment, complaint, and audit.
          Data opportunity, not market opportunity.
        </p>
      </header>

      <ReportingIntelligenceNav current="data-owners" />

      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ["Ownership Records", summary?.ownershipRecords ?? "…"],
          ["Known Systems", summary?.knownSystems ?? "…"],
          ["Public Sources", summary?.publicSources ?? "…"],
          ["High Value Targets", summary?.highValueTargets ?? "…"],
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

      <NextDocumentsToAcquire variant="compact" />

      <section className="mb-4 rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 shadow-sm">
        <h2 className="m-0 text-sm font-extrabold text-indigo-950">
          Closest Path To Unfilled Ride Data
        </h2>
        <p className="m-0 mt-1 text-xs text-indigo-800/80">
          Ranked entities most likely to hold unfilled, rejected, or failed ride records.
        </p>
        <ol className="m-0 mt-3 list-decimal space-y-3 pl-5 text-sm text-stone-700">
          {closestPath.map((item) => (
            <li key={item.rank}>
              <div className="font-bold text-stone-900">{item.entityName}</div>
              <p className="m-0 mt-0.5 text-xs leading-relaxed text-stone-600">
                {item.rationale}
              </p>
              <div className="mt-1 flex flex-wrap gap-1">
                {item.dataTypes.map((d) => (
                  <span
                    key={d}
                    className="rounded bg-white px-1.5 py-0.5 text-[10px] font-semibold text-indigo-800 ring-1 ring-indigo-200"
                  >
                    {d}
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ol>
      </section>

      {workflow ? (
        <section className="mb-4 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
          <h2 className="m-0 text-sm font-extrabold text-stone-900">
            Colorado NEMT Workflow Trace
          </h2>
          <p className="m-0 mt-1 text-xs text-stone-500">{workflow.summary}</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {workflow.steps.map((step, idx) => (
              <div
                key={step.stepKey}
                className="rounded-lg border border-stone-100 bg-stone-50 px-3 py-2"
              >
                <div className="text-[10px] font-bold uppercase text-stone-400">
                  {idx + 1}. {step.stepLabel}
                </div>
                <div className="mt-1 text-xs font-semibold text-stone-800">{step.owner}</div>
                {step.knownSystem ? (
                  <div className="text-[10px] text-stone-500">System: {step.knownSystem}</div>
                ) : null}
                {step.unknowns.length > 0 ? (
                  <div className="mt-1 text-[10px] text-amber-800">
                    Unknown: {step.unknowns.join("; ")}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <div className="mb-3">
        <label className="flex flex-col gap-1 text-xs font-semibold text-stone-600">
          Filter by role
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="h-8 w-48 rounded-md border border-stone-200 bg-white px-2 text-sm"
          >
            <option value="">All roles</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
          <div className="border-b border-stone-100 bg-stone-50 px-3 py-2 text-xs text-stone-500">
            {loading
              ? "Loading…"
              : `${filteredRecords.length} ownership record${filteredRecords.length === 1 ? "" : "s"}`}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {[
                    "Entity",
                    "Role",
                    "Data Owned",
                    "Access Method",
                    "Insight Value",
                    "Confidence",
                  ].map((h) => (
                    <th key={h} style={th}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((row) => {
                  const target = targets.find((t) => t.ownershipKey === row.ownershipKey);
                  const active = selected?.ownershipKey === row.ownershipKey;
                  return (
                    <tr
                      key={row.ownershipKey}
                      onClick={() => setSelected(row)}
                      className="cursor-pointer"
                      style={{ background: active ? "#fafaf9" : undefined }}
                    >
                      <td style={td}>
                        <div className="font-semibold text-stone-800">{row.entityName}</div>
                        <div className="text-[10px] text-stone-400">{row.organizationType}</div>
                      </td>
                      <td style={td}>{row.role.replace(/_/g, " ")}</td>
                      <td style={{ ...td, maxWidth: 200, fontSize: 11 }}>
                        {row.dataOwned.slice(0, 3).join(", ")}
                        {row.dataOwned.length > 3 ? "…" : ""}
                      </td>
                      <td style={td}>{row.accessMethod}</td>
                      <td style={{ ...td, fontWeight: 800 }}>
                        {target?.estimatedInsightValue ?? "—"}
                      </td>
                      <td style={td}>{row.confidence}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm lg:sticky lg:top-4 lg:self-start">
          {selected ? (
            <>
              <h2 className="m-0 text-sm font-extrabold text-stone-900">{selected.entityName}</h2>
              <p className="m-0 mt-1 text-xs text-stone-500">
                {selected.role.replace(/_/g, " ")} · {selected.organizationType}
              </p>

              <div className="mt-3 border-t border-stone-100 pt-3">
                <div className="text-[10px] font-bold uppercase text-stone-400">Data owned</div>
                <ul className="m-0 list-disc pl-4 text-xs text-stone-600">
                  {selected.dataOwned.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
              </div>

              {selected.systemNames.length > 0 ? (
                <div className="mt-3 border-t border-stone-100 pt-3">
                  <div className="text-[10px] font-bold uppercase text-stone-400">Systems</div>
                  <ul className="m-0 list-disc pl-4 text-xs text-stone-600">
                    {selected.systemNames.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {selectedTarget ? (
                <div className="mt-3 border-t border-stone-100 pt-3">
                  <div className="text-[10px] font-bold uppercase text-stone-400">
                    Data opportunity score
                  </div>
                  <div className="text-xs text-stone-600">
                    Value: {selectedTarget.dataValueScore} · Difficulty:{" "}
                    {selectedTarget.accessDifficulty} · Insight:{" "}
                    {selectedTarget.estimatedInsightValue}
                  </div>
                </div>
              ) : null}

              {selectedAccess ? (
                <div className="mt-3 border-t border-stone-100 pt-3">
                  <div className="text-[10px] font-bold uppercase text-stone-400">
                    Data access
                  </div>
                  <ul className="m-0 list-none space-y-1 p-0 text-[10px] text-stone-600">
                    {Object.entries(selectedAccess.canObtain).map(([k, v]) => (
                      <li key={k}>
                        <span className="font-semibold">{k.replace(/([A-Z])/g, " $1")}:</span> {v}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {selected.sourceUrl ? (
                <div className="mt-3 border-t border-stone-100 pt-3">
                  <a
                    href={selected.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-indigo-700 no-underline hover:underline"
                  >
                    Source documentation
                  </a>
                </div>
              ) : null}

              {selected.notes && selected.notes.length > 0 ? (
                <div className="mt-3 border-t border-stone-100 pt-3">
                  <div className="text-[10px] font-bold uppercase text-stone-400">Notes</div>
                  <ul className="m-0 list-disc pl-4 text-xs text-stone-600">
                    {selected.notes.map((n) => (
                      <li key={n}>{n}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </>
          ) : (
            <p className="m-0 text-xs text-stone-400">Select an entity to view ownership detail.</p>
          )}
        </aside>
      </div>

      {knownSystems.length > 0 ? (
        <section className="mt-4 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
          <h2 className="m-0 text-sm font-extrabold text-stone-900">Known Systems</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {knownSystems.map((s) => (
              <span
                key={s}
                className="rounded-md bg-stone-100 px-2 py-1 text-xs font-semibold text-stone-700"
              >
                {s}
              </span>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
