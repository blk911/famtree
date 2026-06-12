/** Temporary QA counters — dev only. */
export function countDraftFetch(): void {
  if (process.env.NODE_ENV === "development") {
    console.count("[drafts-fetch]");
  }
}

export function countCampaignDebug(label: "render" | "load" | "fetch"): void {
  if (process.env.NODE_ENV === "development") {
    console.count(`[campaign-${label}]`);
  }
}
