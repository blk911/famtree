import path from "path";

/**
 * Single VMB runtime root — local disk or Vercel /tmp.
 * TODO(vmb:storage): VMB runtime JSON is ephemeral on Vercel; move to durable storage before real salon use.
 */
export function getVmbDataDir(): string {
  return process.env.VERCEL
    ? path.join("/tmp", "vmb")
    : path.join(process.cwd(), "runtime-data", "vmb");
}

export function getVmbTrialsFile(): string {
  return path.join(getVmbDataDir(), "trials.json");
}

export function getVmbBookUploadsFile(): string {
  return path.join(getVmbDataDir(), "book-uploads.json");
}

export function getVmbBookAnalysisFile(): string {
  return path.join(getVmbDataDir(), "book-analysis-results.json");
}

export function getVmbTrustedIntroFile(): string {
  return path.join(getVmbDataDir(), "trusted-intro-requests.json");
}

export function getVmbInviteDraftsFile(): string {
  return path.join(getVmbDataDir(), "invite-drafts.json");
}

export function getVmbInviteEventsFile(): string {
  return path.join(getVmbDataDir(), "invite-events.json");
}

export function getVmbWorkspacesFile(): string {
  return path.join(getVmbDataDir(), "workspaces.json");
}

/** Canonical active book pointer — one row per salon (trialId). */
export function getVmbActiveBookFile(): string {
  return path.join(getVmbDataDir(), "active-book.json");
}

export function getVmbCardTemplatesFile(): string {
  return path.join(getVmbDataDir(), "card-templates.json");
}

export function getVmbOffersFile(): string {
  return path.join(getVmbDataDir(), "offers.json");
}

export function getVmbOutreachPresetsFile(): string {
  return path.join(getVmbDataDir(), "outreach-presets.json");
}

export function getVmbServicesFile(): string {
  return path.join(getVmbDataDir(), "services.json");
}

export function getVmbServiceOptionsFile(): string {
  return path.join(getVmbDataDir(), "service-options.json");
}

export function getVmbSalonServiceConfigsFile(): string {
  return path.join(getVmbDataDir(), "salon-service-configs.json");
}

export function getVmbServicePresetsFile(): string {
  return path.join(getVmbDataDir(), "service-presets.json");
}

export function getVmbSalonServiceSignoffsFile(): string {
  return path.join(getVmbDataDir(), "salon-service-signoffs.json");
}

export function getVmbSalonOfferCatalogFile(): string {
  return path.join(getVmbDataDir(), "salon-offer-catalog.json");
}

export function getVmbInviteTemplatesFile(): string {
  return path.join(getVmbDataDir(), "invite-templates.json");
}

export function getVmbSalonInviteCopiesFile(): string {
  return path.join(getVmbDataDir(), "salon-invite-copies.json");
}

/** Legacy file-upload imports (admin engine path) — kept separate from book paste flow. */
export function getVmbTrialImportsDir(): string {
  return path.join(getVmbDataDir(), "trial-imports");
}

export const VMB_TRIAL_COOKIE = "vmb_trial_id";
