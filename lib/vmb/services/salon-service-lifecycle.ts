import type { SalonServiceConfig } from "./canonical-catalog-types";
import { hasSalonSavedConfig } from "./merge-salon-service-offers";

export type SalonServiceLifecycleStatus = "draft" | "configured" | "active";

export type SalonServiceLifecycleAction = "save" | "activate" | "deactivate";

export const SALON_SERVICE_STATUS_LABELS: Record<SalonServiceLifecycleStatus, string> = {
  draft: "Draft",
  configured: "Configured",
  active: "Active",
};

export function salonServiceStatusLabel(status: SalonServiceLifecycleStatus): string {
  return SALON_SERVICE_STATUS_LABELS[status].toUpperCase();
}

export function resolveSalonServiceStatus(
  stored: SalonServiceConfig | undefined,
): SalonServiceLifecycleStatus {
  if (!hasSalonSavedConfig(stored)) return "draft";
  if (stored!.status === "active" || stored!.status === "configured") {
    return stored!.status;
  }
  return stored!.enabled ? "active" : "configured";
}

export function isSalonServiceActive(status: SalonServiceLifecycleStatus): boolean {
  return status === "active";
}

export function isSalonServiceClientVisible(status: SalonServiceLifecycleStatus): boolean {
  return status === "active";
}

export function isSalonServiceEligibleForInvitations(status: SalonServiceLifecycleStatus): boolean {
  return status === "active";
}

export function enabledFromSalonServiceStatus(status: SalonServiceLifecycleStatus): boolean {
  return status === "active";
}

export function normalizeSalonServiceConfig(config: SalonServiceConfig): SalonServiceConfig {
  const status = resolveSalonServiceStatus(config);
  return {
    ...config,
    status,
    enabled: enabledFromSalonServiceStatus(status),
  };
}

export function resolveStatusAfterLifecycleAction(
  current: SalonServiceLifecycleStatus,
  action: SalonServiceLifecycleAction,
): SalonServiceLifecycleStatus | { error: string } {
  if (action === "activate") {
    if (current === "draft") {
      return { error: "Save configuration before activating this service" };
    }
    return "active";
  }
  if (action === "deactivate") {
    if (current === "draft") return "draft";
    return "configured";
  }
  if (current === "active") return "active";
  return "configured";
}

export function activeSalonServiceIdSet(serviceIds: readonly string[]): Set<string> {
  return new Set(serviceIds.map((id) => id.trim()).filter(Boolean));
}

/** Invitation templates with explicit services require at least one active salon service. */
export function publishedCopyEligibleForActiveServices(
  serviceIds: readonly string[],
  activeServiceIds: ReadonlySet<string>,
): boolean {
  const normalized = serviceIds.map((id) => id.trim()).filter(Boolean);
  if (normalized.length === 0) return true;
  return normalized.some((id) => activeServiceIds.has(id));
}

export function filterServiceIdsToActive(
  serviceIds: readonly string[],
  activeServiceIds: ReadonlySet<string>,
): string[] {
  return serviceIds.map((id) => id.trim()).filter((id) => id && activeServiceIds.has(id));
}
