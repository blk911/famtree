/** Site-wide label for founder / admin accounts in the app shell and public-facing chrome. */
export const SITE_ADMIN_DISPLAY_NAME = "J. S. Wendt";

export type UserNameFields = {
  firstName: string;
  lastName: string;
  role?: string;
};

export function isSiteAdmin(role?: string): boolean {
  return role === "founder" || role === "admin";
}

export function formatDisplayName(user: UserNameFields): string {
  if (isSiteAdmin(user.role)) return SITE_ADMIN_DISPLAY_NAME;
  return `${user.firstName} ${user.lastName}`.trim();
}

export function formatDisplayInitials(user: UserNameFields): string {
  if (isSiteAdmin(user.role)) return "JW";
  return `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase();
}

export function formatAdminTopBarLabel(user: UserNameFields): string {
  if (isSiteAdmin(user.role)) return `ADMIN: ${SITE_ADMIN_DISPLAY_NAME}`;
  return formatDisplayName(user);
}
