import { promises as fs } from "fs";
import { getActiveBookPointer } from "@/lib/vmb/active-book-pointer";
import { getActiveVmbAnalysis } from "@/lib/vmb/active-analysis-resolver";
import {
  getVmbBookAnalysis,
  getVmbBookAnalysisForTrial,
  listVmbBookAnalyses,
} from "@/lib/vmb/book-analysis/analysis-store";
import { listVmbBookUploads } from "@/lib/vmb/book-upload-store";
import { countGgenNormalized } from "@/lib/vmb/ggen-to-book-records";
import type { VmbPageContext } from "@/lib/vmb/load-vmb-page-context";
import {
  getVmbActiveBookFile,
  getVmbBookAnalysisFile,
  getVmbBookUploadsFile,
  getVmbDataDir,
  getVmbTrialImportsDir,
  getVmbWorkspacesFile,
} from "@/lib/vmb/paths";
import { logVmbFlow } from "@/lib/vmb/flow-log";
import { isVmbProcessComplete } from "@/lib/vmb/process-complete";
import { readTrialImportRuns } from "@/lib/vmb/trial-import-store";
import { getWorkspaceForTrial } from "@/lib/vmb/workspace-store";
import type { VmbBookAnalysisResult } from "@/types/vmb/book-analysis";

export type VmbFullFlowDebug = {
  runtimeRoot: string;
  currentWorkspace: {
    workspaceId: string | null;
    salonId: string | null;
    trialId: string | null;
    firstIngestCompleted: boolean;
    latestAnalysisId: string | null;
    analysisIds: string[];
  };
  uploadStore: {
    exists: boolean;
    latestUploadId: string | null;
    fileName: string | null;
    rowCount: number;
    parsedClientCount: number;
    parsedAppointmentCount: number;
    updatedAt: string | null;
  };
  ggenConversion: {
    exists: boolean;
    sourceUploadId: string | null;
    convertedRecordCount: number;
    convertedClientCount: number;
    convertedAppointmentCount: number;
    sampleClientNames: string[];
    sampleServices: string[];
  };
  analysisStore: {
    exists: boolean;
    latestAnalysisId: string | null;
    analysisCount: number;
    recordCount: number;
    clientCount: number;
    opportunityCount: number;
    path: string;
    updatedAt: string | null;
  };
  activeBookPointer: {
    exists: boolean;
    salonId: string | null;
    analysisId: string | null;
    clientCount: number;
    recordCount: number;
    path: string;
    updatedAt: string | null;
  };
  findTheMoney: {
    completed: boolean;
    completedAt: string | null;
    analysisId: string | null;
    recordCount: number;
    clientCount: number;
    reason: string | null;
  };
  todayLoader: {
    usesAnalysisId: string | null;
    resolvedAnalysisFound: boolean;
    recordCount: number;
    clientCount: number;
    hasCompletedFirstIngest: boolean;
    wouldUnlockToday: boolean;
    lockReason: string | null;
  };
};

async function fileMeta(filePath: string): Promise<{ exists: boolean; updatedAt: string | null }> {
  try {
    const stat = await fs.stat(filePath);
    return { exists: true, updatedAt: stat.mtime.toISOString() };
  } catch {
    return { exists: false, updatedAt: null };
  }
}

function opportunityCount(analysis?: VmbBookAnalysisResult): number {
  if (!analysis) return 0;
  return (
    analysis.reactivationTargets.length +
    analysis.referralOpportunities.length +
    analysis.giftOpportunities.length +
    analysis.trustedProviderIntroOpportunities.length
  );
}

function sampleClientNamesFromGgen(
  records: { type: string; fullName?: string; firstName?: string; lastName?: string; clientName?: string }[],
): string[] {
  const names: string[] = [];
  for (const r of records) {
    let name = "";
    if (r.type === "client") {
      name = r.fullName?.trim() || [r.firstName, r.lastName].filter(Boolean).join(" ").trim();
    } else {
      name = r.clientName?.trim() ?? "";
    }
    if (name && !names.includes(name)) names.push(name);
    if (names.length >= 5) break;
  }
  return names;
}

export async function buildVmbFullFlowDebug(
  trialId?: string,
  pageContext?: VmbPageContext,
): Promise<VmbFullFlowDebug> {
  const id = trialId?.trim() || pageContext?.trialId?.trim() || null;
  const workspace = id ? await getWorkspaceForTrial(id) : pageContext?.workspace;
  const activeBookPointer = id ? await getActiveBookPointer(id) : undefined;
  const resolved = id ? await getActiveVmbAnalysis(id) : { source: "none" as const };
  const usesAnalysisId =
    pageContext?.activeAnalysisId ??
    resolved.analysisId ??
    workspace?.latestAnalysisId ??
    activeBookPointer?.analysisId ??
    null;

  let activeAnalysis = pageContext?.activeAnalysis;
  if (!activeAnalysis && usesAnalysisId && id) {
    activeAnalysis = await getVmbBookAnalysisForTrial(usesAnalysisId, id);
  }
  if (!activeAnalysis && usesAnalysisId) {
    const loose = await getVmbBookAnalysis(usesAnalysisId);
    if (loose && (!loose.trialId || loose.trialId === id)) activeAnalysis = loose;
  }

  const uploads = await listVmbBookUploads();
  const trialUploads = id ? uploads.filter((u) => u.trialId === id) : uploads;
  const latestUpload = trialUploads[0] ?? uploads[0];

  const ggenRuns = id ? await readTrialImportRuns(id) : [];
  const latestGgen = ggenRuns[0];
  const ggenCounts = latestGgen ? countGgenNormalized(latestGgen.normalizedPreview) : null;

  const analyses = await listVmbBookAnalyses();
  const trialAnalyses = id ? analyses.filter((a) => a.trialId === id) : analyses;
  const latestAnalysis = trialAnalyses[0] ?? analyses[0];

  const uploadMeta = await fileMeta(getVmbBookUploadsFile());
  const analysisMeta = await fileMeta(getVmbBookAnalysisFile());
  const pointerMeta = await fileMeta(getVmbActiveBookFile());
  const ggenPath = id ? `${getVmbTrialImportsDir()}/${id}.json` : null;
  const ggenMeta = ggenPath ? await fileMeta(ggenPath) : { exists: false, updatedAt: null };

  const hasCompletedFirstIngest =
    pageContext?.hasCompletedFirstIngest ??
    isVmbProcessComplete({
      workspace,
      activeAnalysis,
      activeAnalysisId: usesAnalysisId ?? undefined,
      activeBookPointer,
      trialId: id ?? undefined,
    });

  const wouldUnlockToday = pageContext?.wouldUnlockToday ?? hasCompletedFirstIngest;

  let lockReason: string | null = pageContext?.lockReason ?? null;
  if (lockReason === null && !id) {
    lockReason = "NO_TRIAL_SESSION";
  } else if (lockReason === null && !workspace) {
    lockReason = latestAnalysis || latestGgen ? "WORKSPACE_MISSING_BUT_DATA_EXISTS" : "WORKSPACE_MISSING";
  } else if (lockReason === null && !hasCompletedFirstIngest) {
    if (latestGgen && !latestAnalysis) lockReason = "GGEN_CONVERTED_NO_ANALYSIS";
    else if (latestAnalysis && !workspace?.latestAnalysisId) lockReason = "ANALYSIS_NOT_LINKED_IN_WORKSPACE";
    else if (latestAnalysis && workspace?.latestAnalysisId !== latestAnalysis.analysisId) {
      lockReason = "WORKSPACE_ANALYSIS_ID_MISMATCH";
    } else if (activeBookPointer && usesAnalysisId && activeBookPointer.analysisId !== usesAnalysisId) {
      lockReason = "ACTIVE_POINTER_STALE";
    } else lockReason = "PROCESS_NOT_COMPLETE";
  }

  const findTheMoneyCompleted = !!(
    workspace?.firstIngestCompleted &&
    workspace.latestAnalysisId &&
    latestAnalysis
  );

  let findTheMoneyReason: string | null = null;
  if (!findTheMoneyCompleted) {
    if (latestGgen && !latestAnalysis) findTheMoneyReason = "GGEN_EXISTS_ANALYSIS_MISSING";
    else if (latestAnalysis && !workspace?.latestAnalysisId) findTheMoneyReason = "ANALYSIS_EXISTS_WORKSPACE_NOT_UPDATED";
    else if (!latestUpload && !latestGgen) findTheMoneyReason = "NO_UPLOAD_OR_GGEN";
    else findTheMoneyReason = "FIND_THE_MONEY_INCOMPLETE";
  }

  const sampleServices = (latestGgen?.normalizedPreview ?? [])
    .map((r) => ("serviceName" in r ? r.serviceName?.trim() : undefined))
    .filter((s): s is string => !!s)
    .slice(0, 5);

  logVmbFlowFromDebug(id, usesAnalysisId, hasCompletedFirstIngest, activeAnalysis);

  return {
    runtimeRoot: getVmbDataDir(),
    currentWorkspace: {
      workspaceId: id,
      salonId: id,
      trialId: id,
      firstIngestCompleted: !!workspace?.firstIngestCompleted,
      latestAnalysisId: workspace?.latestAnalysisId ?? null,
      analysisIds: workspace?.analysisIds ?? [],
    },
    uploadStore: {
      exists: uploadMeta.exists,
      latestUploadId: latestUpload?.uploadId ?? null,
      fileName: latestUpload?.fileName ?? null,
      rowCount: latestUpload?.recordCount ?? 0,
      parsedClientCount: latestUpload?.recordCount ?? 0,
      parsedAppointmentCount: 0,
      updatedAt: uploadMeta.updatedAt,
    },
    ggenConversion: {
      exists: ggenMeta.exists && !!latestGgen,
      sourceUploadId: latestGgen?.id ?? null,
      convertedRecordCount: ggenCounts?.convertedRecordCount ?? 0,
      convertedClientCount: ggenCounts?.convertedClientCount ?? 0,
      convertedAppointmentCount: ggenCounts?.convertedAppointmentCount ?? 0,
      sampleClientNames: latestGgen ? sampleClientNamesFromGgen(latestGgen.normalizedPreview) : [],
      sampleServices,
    },
    analysisStore: {
      exists: analysisMeta.exists,
      latestAnalysisId: latestAnalysis?.analysisId ?? null,
      analysisCount: trialAnalyses.length,
      recordCount: latestAnalysis?.recordCount ?? 0,
      clientCount: latestAnalysis?.recordCount ?? 0,
      opportunityCount: opportunityCount(latestAnalysis),
      path: getVmbBookAnalysisFile(),
      updatedAt: analysisMeta.updatedAt,
    },
    activeBookPointer: {
      exists: pointerMeta.exists && !!activeBookPointer,
      salonId: activeBookPointer?.salonId ?? null,
      analysisId: activeBookPointer?.analysisId ?? null,
      clientCount: activeBookPointer?.clientCount ?? 0,
      recordCount: activeBookPointer?.recordCount ?? 0,
      path: getVmbActiveBookFile(),
      updatedAt: activeBookPointer?.updatedAt ?? pointerMeta.updatedAt,
    },
    findTheMoney: {
      completed: findTheMoneyCompleted,
      completedAt: workspace?.lastIngestAt ?? latestAnalysis?.generatedAt ?? null,
      analysisId: workspace?.latestAnalysisId ?? latestAnalysis?.analysisId ?? null,
      recordCount: latestAnalysis?.recordCount ?? 0,
      clientCount: latestAnalysis?.recordCount ?? 0,
      reason: findTheMoneyReason,
    },
    todayLoader: {
      usesAnalysisId,
      resolvedAnalysisFound: !!activeAnalysis,
      recordCount: activeAnalysis?.recordCount ?? 0,
      clientCount: activeAnalysis?.recordCount ?? 0,
      hasCompletedFirstIngest,
      wouldUnlockToday,
      lockReason,
    },
  };
}

function logVmbFlowFromDebug(
  trialId: string | null,
  analysisId: string | null,
  hasCompletedFirstIngest: boolean,
  activeAnalysis?: VmbBookAnalysisResult,
): void {
  logVmbFlow("today loader resolved", {
    trialId: trialId ?? undefined,
    salonId: trialId ?? undefined,
    workspaceId: trialId ?? undefined,
    analysisId: analysisId ?? undefined,
    recordCount: activeAnalysis?.recordCount ?? 0,
    clientCount: activeAnalysis?.recordCount ?? 0,
    hasCompletedFirstIngest,
    wouldUnlockToday: hasCompletedFirstIngest,
  });
}
