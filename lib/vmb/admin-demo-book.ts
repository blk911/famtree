import { resolveActiveBook } from "@/lib/vmb/active-book-resolver";
import { clearActiveBookBindingForSalon } from "@/lib/vmb/active-book-clear";
import {
  restoreActiveBookForSalon,
  type RestoreActiveBookResult,
} from "@/lib/vmb/active-book-restore";
import { getActiveBookPointer } from "@/lib/vmb/active-book-pointer";
import { isVmbDevOperatorApiEnabled } from "@/lib/vmb/dev-operator-api-guard";

export type AdminDemoBookConfig = {
  analysisId: string;
  restrictToSalonId?: string;
};

export function resolveAdminDemoBookConfig(): AdminDemoBookConfig | null {
  if (!isVmbDevOperatorApiEnabled()) return null;
  const analysisId = process.env.VMB_ADMIN_DEMO_ANALYSIS_ID?.trim();
  if (!analysisId) return null;
  const restrictToSalonId = process.env.VMB_ADMIN_DEMO_SALON_ID?.trim() || undefined;
  return { analysisId, restrictToSalonId };
}

export function isAdminDemoBookConfigured(): boolean {
  return resolveAdminDemoBookConfig() !== null;
}

export function isAdminDemoBookEnabledForSalon(salonId: string): boolean {
  const config = resolveAdminDemoBookConfig();
  if (!config) return false;
  const trimmedSalon = salonId.trim();
  if (!trimmedSalon) return false;
  if (config.restrictToSalonId && config.restrictToSalonId !== trimmedSalon) return false;
  return true;
}

export function isBoundToAdminDemoBook(analysisId: string | undefined): boolean {
  const config = resolveAdminDemoBookConfig();
  if (!config || !analysisId?.trim()) return false;
  return config.analysisId === analysisId.trim();
}

export async function bindAdminDemoBookToSalon(salonId: string): Promise<RestoreActiveBookResult> {
  const config = resolveAdminDemoBookConfig();
  if (!config) {
    return { ok: false, error: "Admin demo book not configured", status: 404 };
  }
  if (!isAdminDemoBookEnabledForSalon(salonId)) {
    return { ok: false, error: "Admin demo book not enabled for this salon", status: 404 };
  }
  return restoreActiveBookForSalon(salonId, config.analysisId);
}

export async function maybeAutoBindAdminDemoBook(
  salonId: string,
): Promise<{ bound: boolean; analysisId?: string }> {
  if (!isAdminDemoBookEnabledForSalon(salonId)) {
    return { bound: false };
  }

  const resolved = await resolveActiveBook(salonId, {});
  if (resolved.hasActiveBook) {
    return { bound: false };
  }

  const outcome = await bindAdminDemoBookToSalon(salonId);
  if (!outcome.ok) {
    return { bound: false };
  }

  return { bound: true, analysisId: outcome.analysisId };
}

export async function clearAdminDemoBookBindingForSalon(
  salonId: string,
): Promise<{ ok: true } | { ok: false; error: string; status: 400 | 404 }> {
  const trimmedSalon = salonId.trim();
  if (!trimmedSalon) {
    return { ok: false, error: "salonId is required", status: 400 };
  }

  const activePointer = await getActiveBookPointer(trimmedSalon);
  const config = resolveAdminDemoBookConfig();

  if (config && activePointer?.analysisId && activePointer.analysisId !== config.analysisId) {
    return { ok: false, error: "Current salon is not bound to the admin demo book", status: 404 };
  }

  const cleared = await clearActiveBookBindingForSalon(trimmedSalon);
  if ("error" in cleared) {
    return { ok: false, error: cleared.error, status: 404 };
  }

  return { ok: true };
}
