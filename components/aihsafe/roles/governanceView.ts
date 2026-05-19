import type { FamilySafeShellMode } from "@/components/aihsafe/roles/shellMode";

/** Tab label — visible to all Family Safe roles. */
export function settingsTabLabel(shellMode: FamilySafeShellMode): string {
  return settingsPanelTitle(shellMode);
}

/** Panel heading (matches tab label). */
export function settingsPanelTitle(shellMode: FamilySafeShellMode): string {
  if (shellMode === "child") return "Boundaries";
  return "Msg Rules";
}

/** Introductory subcopy under the panel heading (founder editor + legacy). */
export function settingsPanelSubcopy(shellMode: FamilySafeShellMode): string {
  if (shellMode === "child") {
    return "These boundaries help keep your trusted spaces safe and comfortable. Managed by your family steward.";
  }
  return "Set how trusted spaces, posts, private threads, and visibility work.";
}

/** Read-only FamilySettingsView intro — audience-aware, not founder editor. */
export function settingsPanelIntroCopy(
  shellMode: FamilySafeShellMode,
  audience: GovernanceAudience,
): string {
  if (shellMode === "child" || audience === "minor") {
    return settingsPanelSubcopy("child");
  }
  if (audience === "guardian") {
    return "View your family's Msg Rules. Pending posts and invites appear under Approvals.";
  }
  return "View shared rules for family circles you're in. Friend and work connections do not make you a household manager.";
}

/** Optional second line under the intro banner. */
export function settingsPanelFootnote(audience: GovernanceAudience): string | null {
  if (audience === "minor") return null;
  if (audience === "guardian") {
    return "Only the person who manages Msg Rules for your household can edit these.";
  }
  if (audience === "member") {
    return "Ask the person who invited you if a rule looks wrong for your situation.";
  }
  return null;
}

/** Lock row above read-only governance rows. */
export function settingsViewOnlyLabel(audience: GovernanceAudience): string {
  if (audience === "member") {
    return "View only — family Msg Rules are managed by your household; you cannot edit them here.";
  }
  if (audience === "guardian") {
    return "View only — household Msg Rules are edited by your family steward.";
  }
  return "View only — managed by your family steward. These rules cannot be changed here.";
}

export function settingsInterestCategoriesNote(audience: GovernanceAudience): string {
  if (audience === "member") {
    return "Approved interest categories for family circles are configured separately and are not listed here.";
  }
  return "Approved interest categories are configured by your family steward and are not listed here yet.";
}

/** Only founders/admins in the founder shell may edit network settings via PATCH. */
export function canEditFamilyGovernance(shellMode: FamilySafeShellMode, systemRole: string): boolean {
  return shellMode === "founder" && (systemRole === "founder" || systemRole === "admin");
}

export type GovernanceAudience = "founder" | "guardian" | "member" | "minor";

export function governanceAudience(
  shellMode: FamilySafeShellMode,
  isGuardian: boolean,
): GovernanceAudience {
  if (shellMode === "founder") return "founder";
  if (shellMode === "child") return "minor";
  if (isGuardian) return "guardian";
  return "member";
}
