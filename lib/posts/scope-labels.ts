import type { DashboardPostScope } from "@prisma/client";

const LABELS: Record<DashboardPostScope, string> = {
  FAMILY: "Shared with Family",
  BUSINESS: "Shared with Business",
  CLUB: "Shared with Club",
  CHURCH: "Shared with Church",
  PRIVATE: "Shared with Private",
};

export function postScopeShareLabel(scope: DashboardPostScope | string): string {
  return LABELS[scope as DashboardPostScope] ?? "Shared";
}
