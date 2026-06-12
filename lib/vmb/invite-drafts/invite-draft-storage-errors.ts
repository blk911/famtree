export const INVITE_DRAFT_POSTGRES_REQUIRED = "POSTGRES_REQUIRED";

export const INVITE_DRAFT_POSTGRES_REQUIRED_MESSAGE =
  "VMB invite drafts require Postgres in production.";

export const INVITE_DRAFTS_UNAVAILABLE_UI =
  "Invite drafts are unavailable. Please refresh or try again.";

export function isInviteDraftStorageInternalError(error: string): boolean {
  const lower = error.toLowerCase();
  return (
    error === INVITE_DRAFT_POSTGRES_REQUIRED ||
    lower.includes("json filesystem storage") ||
    lower.includes("database_url") ||
    lower.includes("postgres backend unavailable") ||
    lower.includes("postgres tables unavailable")
  );
}

export function friendlyInviteDraftError(apiError?: string): string {
  if (!apiError || isInviteDraftStorageInternalError(apiError)) {
    return INVITE_DRAFTS_UNAVAILABLE_UI;
  }
  return apiError;
}

export function mapInviteDraftStoreErrorForApi(error: string): {
  error: string;
  message?: string;
  status: number;
} {
  if (error === INVITE_DRAFT_POSTGRES_REQUIRED) {
    return {
      error: INVITE_DRAFT_POSTGRES_REQUIRED,
      message: INVITE_DRAFT_POSTGRES_REQUIRED_MESSAGE,
      status: 503,
    };
  }
  if (isInviteDraftStorageInternalError(error)) {
    return {
      error: INVITE_DRAFT_POSTGRES_REQUIRED,
      message: INVITE_DRAFT_POSTGRES_REQUIRED_MESSAGE,
      status: 503,
    };
  }
  if (error.includes("not available")) {
    return { error, status: 403 };
  }
  if (error === "Draft not found") {
    return { error, status: 404 };
  }
  return { error, status: 500 };
}
