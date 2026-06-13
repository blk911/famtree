export const VMB_ACTIVE_ANALYSIS_KEY = "vmb_active_analysis_id";
export const VMB_LATEST_ANALYSIS_KEY = "vmb_latest_analysis_id";
export const VMB_TRIAL_ID_KEY = "vmb_trial_id";

export function readActiveAnalysisId(): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const sessionId = sessionStorage.getItem(VMB_ACTIVE_ANALYSIS_KEY)?.trim();
    if (sessionId) return sessionId;
    return localStorage.getItem(VMB_LATEST_ANALYSIS_KEY)?.trim() || undefined;
  } catch {
    return undefined;
  }
}

export function readLatestAnalysisId(): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    return (
      localStorage.getItem(VMB_LATEST_ANALYSIS_KEY)?.trim() ||
      sessionStorage.getItem(VMB_ACTIVE_ANALYSIS_KEY)?.trim() ||
      undefined
    );
  } catch {
    return undefined;
  }
}

export function readStoredTrialId(): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    return localStorage.getItem(VMB_TRIAL_ID_KEY)?.trim() || undefined;
  } catch {
    return undefined;
  }
}

export function writeActiveAnalysisId(analysisId: string): void {
  writeActiveBookSession({ analysisId });
}

export function writeActiveBookSession(input: {
  analysisId: string;
  trialId?: string;
}): void {
  if (typeof window === "undefined") return;
  const analysisId = input.analysisId.trim();
  if (!analysisId) return;
  try {
    sessionStorage.setItem(VMB_ACTIVE_ANALYSIS_KEY, analysisId);
    localStorage.setItem(VMB_LATEST_ANALYSIS_KEY, analysisId);
    if (input.trialId?.trim()) {
      localStorage.setItem(VMB_TRIAL_ID_KEY, input.trialId.trim());
    }
  } catch {
    // ignore quota / privacy mode
  }
}
