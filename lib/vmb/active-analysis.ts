export const VMB_ACTIVE_ANALYSIS_KEY = "vmb_active_analysis_id";

export function readActiveAnalysisId(): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const id = sessionStorage.getItem(VMB_ACTIVE_ANALYSIS_KEY)?.trim();
    return id || undefined;
  } catch {
    return undefined;
  }
}

export function writeActiveAnalysisId(analysisId: string): void {
  if (typeof window === "undefined") return;
  const id = analysisId.trim();
  if (!id) return;
  try {
    sessionStorage.setItem(VMB_ACTIVE_ANALYSIS_KEY, id);
  } catch {
    // ignore quota / privacy mode
  }
}
