/** Slugs for member-facing video slots (admin repository). */
export const MEMBER_VIDEO_SLUGS = [
  { value: "dashboard-intro", label: "Dashboard intro (members)" },
] as const;

export type MemberVideoSlug = (typeof MEMBER_VIDEO_SLUGS)[number]["value"];

export const DEFAULT_MEMBER_VIDEO_SLUG: MemberVideoSlug = "dashboard-intro";

/** Master kill switch — must be "true" for any DB-enabled message to show members. */
export function isMemberVideoGateEnvEnabled(): boolean {
  return process.env.MEMBER_VIDEO_GATE_ENABLED === "true";
}
