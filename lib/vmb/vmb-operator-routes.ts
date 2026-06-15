import { VMB_BOOK_LOAD_ROUTE } from "./book-load-cta";

/** Core salon operator shell pages (product-side, not admin). */
export const VMB_OPERATOR_SHELL_ROUTES = [
  "/vmb",
  "/vmb/today",
  "/vmb/queue",
  "/vmb/clients",
  "/vmb/campaigns",
  "/vmb/invites",
  "/vmb/opportunities",
  "/vmb/network",
  "/vmb/activity",
] as const;

/** Book import / analysis chain (product-side). */
export const VMB_BOOK_IMPORT_CHAIN = {
  loadUiRoute: VMB_BOOK_LOAD_ROUTE,
  analyzeApi: "/api/vmb/analyze-book",
  trialApi: "/api/vmb/trial",
  workspaceApi: "/api/vmb/workspace",
  activeBookApi: "/api/vmb/active-book",
  inviteDraftsApi: "/api/vmb/invite-drafts",
  queueApi: "/api/taikos/queue",
  recipientInvitePattern: "/vmb/invite/[inviteId]",
  claimApi: "/api/vmb/invite-claims",
  inviteEventsApi: "/api/vmb/invite-events",
} as const;

/** GGen / back-office handoff stays in intelligence layer — not duplicated on /vmb. */
export const VMB_GGEN_BRIDGE_MODULE = "lib/vmb/ggen-conversion-bridge.ts";
