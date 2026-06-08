"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { TranspoIntelligenceNav } from "@/components/admin/intelligence/transpo/TranspoIntelligenceNav";
import type {
  CountyResearchSummary,
  ResearchTask,
  ResearchTaskCategory,
  ResearchTaskPriority,
  ResearchTaskStatus,
} from "@/lib/transpo/research-types";

type Summary = {
  openTasks: number;
  criticalTasks: number;
  highPriorityTasks: number;
  completedTasks: number;
  totalTasks: number;
  generatedAt: string;
};

const PRIORITIES: ResearchTaskPriority[] = ["critical", "high", "medium", "low"];
const STATUSES: ResearchTaskStatus[] = ["open", "in_progress", "blocked", "completed", "ignored"];
const CATEGORIES: ResearchTaskCategory[] = [
  "demand",
  "capacity",
  "operations",
  "quality",
  "broker",
  "compliance",
];

const PRIORITY_STYLES: Record<ResearchTaskPriority, { fg: string; bg: string; bd: string }> = {
  critical: { fg: "#7f1d1d", bg: "#fef2f2", bd: "#fecaca" },
  high: { fg: "#991b1b", bg: "#fff1f2", bd: "#fecdd3" },
  medium: { fg: "#92400e", bg: "#fffbeb", bd: "#fde68a" },
  low: { fg: "#166534", bg: "#f0fdf4", bd: "#bbf7d0" },
};

const STATUS_STYLES: Record<ResearchTaskStatus, { fg: string; bg: string }> = {
  open: { fg: "#1e40af", bg: "#dbeafe" },
  in_progress: { fg: "#92400e", bg: "#fef3c7" },
  blocked: { fg: "#991b1b", bg: "#fee2e2" },
  completed: { fg: "#166534", bg: "#dcfce7" },
  ignored: { fg: "#57534e", bg: "#f5f5f4" },
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

function TaskGroup({
  label,
  tasks,
  priority,
  onStatusChange,
}: {
  label: string;
  tasks: ResearchTask[];
  priority: ResearchTaskPriority;
  onStatusChange: (taskId: string, status: ResearchTaskStatus) => void;
}) {
  const style = PRIORITY_STYLES[priority];
  if (tasks.length === 0) return null;

  return (
    <div className="mb-3">
      <h4
        className="m-0 mb-2 text-[10px] font-extrabold uppercase tracking-wide"
        style={{ color: style.fg }}
      >
        {label} ({tasks.length})
      </h4>
      <ul className="m-0 list-none space-y-2 p-0">
        {tasks.map((task) => (
          <li
            key={task.taskId}
            className="rounded-lg border px-3 py-2"
            style={{ borderColor: style.bd, background: style.bg }}
          >
            <div className="text-xs font-semibold text-stone-900">{task.title}</div>
            <div className="mt-1 text-[10px] text-stone-600">{task.description}</div>
            <div className="mt-2 flex flex-wrap gap-1">
              {task.sourceHints.map((hint) => (
                <span
                  key={hint}
                  className="rounded bg-white px-1.5 py-0.5 text-[10px] text-stone-600 ring-1 ring-stone-200"
                >
                  {hint}
                </span>
              ))}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <select
                value={task.status}
                onChange={(e) => onStatusChange(task.taskId, e.target.value as ResearchTaskStatus)}
                className="h-7 rounded border border-stone-200 bg-white px-2 text-[10px]"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              {task.findings ? (
                <span className="text-[10px] text-stone-500">Findings recorded</span>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TranspoResearchQueueClient() {
  const searchParams = useSearchParams();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [tasks, setTasks] = useState<ResearchTask[]>([]);
  const [countySummary, setCountySummary] = useState<CountyResearchSummary | null>(null);
  const [counties, setCounties] = useState<string[]>([]);
  const [countyFilter, setCountyFilter] = useState(searchParams.get("county") ?? "");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (countyFilter) params.set("county", countyFilter);
      params.set("state", "CO");
      if (priorityFilter) params.set("priority", priorityFilter);
      if (statusFilter) params.set("status", statusFilter);
      if (categoryFilter) params.set("category", categoryFilter);

      const res = await fetch(
        `/api/admin/intelligence/transpo/research-queue?${params.toString()}`,
        { cache: "no-store" },
      );
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? data.detail ?? "Failed to load research queue");
        return;
      }

      setSummary(data.summary ?? null);
      setTasks(data.tasks ?? []);
      setCountySummary(data.countySummary ?? null);
      setCounties(data.counties ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [countyFilter, priorityFilter, statusFilter, categoryFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const updateStatus = useCallback(
    async (taskId: string, status: ResearchTaskStatus) => {
      setUpdating(taskId);
      try {
        const res = await fetch("/api/admin/intelligence/transpo/research-queue", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ taskId, status }),
        });
        const data = await res.json();
        if (!data.ok) {
          setError(data.error ?? "Update failed");
          return;
        }
        await load();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setUpdating("");
      }
    },
    [load],
  );

  const countyTasks = useMemo(() => {
    if (!countyFilter) return [];
    return tasks.filter(
      (t) => t.status !== "completed" && t.status !== "ignored",
    );
  }, [tasks, countyFilter]);

  const groupedCountyTasks = useMemo(() => {
    const groups: Record<ResearchTaskPriority, ResearchTask[]> = {
      critical: [],
      high: [],
      medium: [],
      low: [],
    };
    for (const task of countyTasks) {
      groups[task.priority].push(task);
    }
    return groups;
  }, [countyTasks]);

  const sortedTasks = useMemo(
    () =>
      [...tasks].sort((a, b) => {
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        if (a.county !== b.county) return a.county.localeCompare(b.county);
        return a.title.localeCompare(b.title);
      }),
    [tasks],
  );

  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 pb-12 pt-5 sm:px-6 lg:px-8">
      <TranspoIntelligenceNav currentTool="research-queue" />

      <header className="mb-4">
        <h1 className="m-0 text-xl font-extrabold text-stone-900 sm:text-[22px]">
          Evidence Collection Queue
        </h1>
        <p className="m-0 mt-1 max-w-2xl text-sm text-stone-500">
          Actionable research tasks to close missing evidence gaps.
        </p>
      </header>

      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ["Open Tasks", summary?.openTasks ?? "…"],
          ["Critical Tasks", summary?.criticalTasks ?? "…"],
          ["High Priority", summary?.highPriorityTasks ?? "…"],
          ["Completed", summary?.completedTasks ?? "…"],
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

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs font-semibold text-stone-600">
          County
          <select
            value={countyFilter}
            onChange={(e) => setCountyFilter(e.target.value)}
            className="h-8 min-w-[160px] rounded-md border border-stone-200 bg-white px-2 text-sm"
          >
            <option value="">All counties</option>
            {counties.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs font-semibold text-stone-600">
          Priority
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="h-8 min-w-[120px] rounded-md border border-stone-200 bg-white px-2 text-sm"
          >
            <option value="">All</option>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs font-semibold text-stone-600">
          Status
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-8 min-w-[120px] rounded-md border border-stone-200 bg-white px-2 text-sm"
          >
            <option value="">All</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs font-semibold text-stone-600">
          Category
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-8 min-w-[140px] rounded-md border border-stone-200 bg-white px-2 text-sm"
          >
            <option value="">All</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
      </div>

      {countyFilter && countySummary ? (
        <section className="mb-4 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
          <h2 className="m-0 text-sm font-extrabold text-stone-900">
            {countySummary.county} County — open research tasks
          </h2>
          <p className="m-0 mt-0.5 text-xs text-stone-500">
            {countySummary.openTasks} open · {countySummary.criticalTasks} critical ·{" "}
            {countySummary.progressPercent}% complete
          </p>

          <div className="mt-4">
            <TaskGroup
              label="Critical"
              tasks={groupedCountyTasks.critical}
              priority="critical"
              onStatusChange={updateStatus}
            />
            <TaskGroup
              label="High"
              tasks={groupedCountyTasks.high}
              priority="high"
              onStatusChange={updateStatus}
            />
            <TaskGroup
              label="Medium"
              tasks={groupedCountyTasks.medium}
              priority="medium"
              onStatusChange={updateStatus}
            />
            <TaskGroup
              label="Low"
              tasks={groupedCountyTasks.low}
              priority="low"
              onStatusChange={updateStatus}
            />
          </div>
          {updating ? (
            <p className="m-0 mt-2 text-[10px] text-stone-400">Updating {updating}…</p>
          ) : null}
        </section>
      ) : null}

      <section className="overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-sm">
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
          <thead>
            <tr>
              {["County", "Task", "Priority", "Status", "Category", "Source Hints"].map((h) => (
                <th key={h} style={th}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ ...td, textAlign: "center", color: "#a8a29e" }}>
                  Loading…
                </td>
              </tr>
            ) : sortedTasks.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ ...td, textAlign: "center", color: "#a8a29e" }}>
                  No research tasks match filters.
                </td>
              </tr>
            ) : (
              sortedTasks.map((task) => {
                const pStyle = PRIORITY_STYLES[task.priority];
                const sStyle = STATUS_STYLES[task.status];
                return (
                  <tr key={task.taskId}>
                    <td style={{ ...td, fontWeight: 600 }}>{task.county}</td>
                    <td style={td}>
                      <div className="font-semibold text-stone-900">{task.title}</div>
                      <div className="text-[10px] text-stone-500">{task.evidenceKey}</div>
                    </td>
                    <td style={td}>
                      <span
                        className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase"
                        style={{
                          color: pStyle.fg,
                          background: pStyle.bg,
                          border: `1px solid ${pStyle.bd}`,
                        }}
                      >
                        {task.priority}
                      </span>
                    </td>
                    <td style={td}>
                      <span
                        className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase"
                        style={{ color: sStyle.fg, background: sStyle.bg }}
                      >
                        {task.status}
                      </span>
                    </td>
                    <td style={td}>{task.category}</td>
                    <td style={{ ...td, maxWidth: 260 }}>
                      <div className="flex flex-wrap gap-1">
                        {task.sourceHints.slice(0, 3).map((hint) => (
                          <span
                            key={hint}
                            className="rounded bg-stone-100 px-1 py-0.5 text-[10px] text-stone-600"
                          >
                            {hint}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
