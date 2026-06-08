export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import {
  readCountyResearchSummaryArtifact,
  readEvidenceCollectionQueueArtifact,
  readMergedResearchTasks,
  refreshCountyResearchSummaryFromState,
  updateResearchTaskState,
} from "@/lib/transpo/read-research-queue";
import type {
  ResearchTaskCategory,
  ResearchTaskPriority,
  ResearchTaskStatus,
} from "@/lib/transpo/research-types";

export async function GET(request: NextRequest) {
  try {
    const queue = await readEvidenceCollectionQueueArtifact();
    if (!queue) {
      return NextResponse.json(
        {
          ok: false,
          error: "research queue not built",
          detail: "Run npm run build:transpo:research",
        },
        { status: 404 },
      );
    }

    const county = request.nextUrl.searchParams.get("county");
    const state = (request.nextUrl.searchParams.get("state") ?? "CO").toUpperCase();
    const priority = request.nextUrl.searchParams.get("priority") as ResearchTaskPriority | null;
    const status = request.nextUrl.searchParams.get("status") as ResearchTaskStatus | null;
    const category = request.nextUrl.searchParams.get("category") as ResearchTaskCategory | null;

    let tasks = await readMergedResearchTasks();

    if (county) {
      const countyNorm = county.trim().replace(/\s+county$/i, "");
      tasks = tasks.filter(
        (t) =>
          t.county.toLowerCase() === countyNorm.toLowerCase() &&
          t.state.toUpperCase() === state,
      );
    }
    if (priority) tasks = tasks.filter((t) => t.priority === priority);
    if (status) tasks = tasks.filter((t) => t.status === status);
    if (category) tasks = tasks.filter((t) => t.category === category);

    const allTasks = await readMergedResearchTasks();
    const summaryArtifact = await readCountyResearchSummaryArtifact();

    const openTasks = allTasks.filter(
      (t) => t.status === "open" || t.status === "in_progress" || t.status === "blocked",
    ).length;
    const completedTasks = allTasks.filter(
      (t) => t.status === "completed" || t.status === "ignored",
    ).length;
    const criticalTasks = allTasks.filter(
      (t) => t.priority === "critical" && t.status !== "completed" && t.status !== "ignored",
    ).length;
    const highTasks = allTasks.filter(
      (t) => t.priority === "high" && t.status !== "completed" && t.status !== "ignored",
    ).length;

    const countyList = Array.from(new Set(allTasks.map((t) => t.county))).sort();
    const selectedCountySummary = county
      ? summaryArtifact?.counties.find((c) => {
          const countyNorm = county.trim().replace(/\s+county$/i, "");
          return (
            c.county.toLowerCase() === countyNorm.toLowerCase() &&
            c.state.toUpperCase() === state
          );
        }) ?? null
      : null;

    return NextResponse.json({
      ok: true,
      summary: {
        openTasks,
        criticalTasks,
        highPriorityTasks: highTasks,
        completedTasks,
        totalTasks: allTasks.length,
        generatedAt: queue.generatedAt,
      },
      counties: countyList,
      tasks,
      countySummary: selectedCountySummary,
      countySummaries: summaryArtifact?.counties ?? [],
    });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, error: "research queue failed", detail },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const taskId = body.taskId as string | undefined;
    if (!taskId) {
      return NextResponse.json(
        { ok: false, error: "taskId required" },
        { status: 400 },
      );
    }

    await updateResearchTaskState(taskId, {
      status: body.status,
      findings: body.findings,
      notes: body.notes,
      sourceLinks: body.sourceLinks,
      assignedTo: body.assignedTo,
    });

    const tasks = await readMergedResearchTasks();
    const task = tasks.find((t) => t.taskId === taskId) ?? null;
    const summary = await refreshCountyResearchSummaryFromState();

    return NextResponse.json({
      ok: true,
      task,
      countySummaries: summary?.counties ?? [],
    });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, error: "research task update failed", detail },
      { status: 500 },
    );
  }
}
