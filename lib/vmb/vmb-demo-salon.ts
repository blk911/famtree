import { resolveActiveBook } from "@/lib/vmb/active-book-resolver";
import { buildVmbTodayHref } from "@/lib/vmb/bootstrap-vmb-demo";
import { loadVmbDemoSeedBookText, resolveVmbDemoSeedBookPath } from "@/lib/vmb/demo-seed-book";
import { syncLibraryTemplatesToSalon, updateSalonInviteLocalCopy } from "@/lib/vmb/invites/salon-invite-local-copy-store";
import { runVmbBookAnalysis } from "@/lib/vmb/run-book-analysis";
import { listServicePresetCards } from "@/lib/vmb/services/service-preset-store";
import { getSalonServiceConfig, upsertSalonServiceConfig } from "@/lib/vmb/services/salon-service-config-store";
import { upsertVmbTrialLead } from "@/lib/vmb/trial-store";
import { setLatestAnalysis, upsertWorkspaceForTrial } from "@/lib/vmb/workspace-store";

export const VMB_DEMO_SALON_ID = "vmb-demo-test123";
export const VMB_DEMO_SALON_NAME = "test123 Nails";
export const VMB_DEMO_OWNER_NAME = "Spencer";
export const VMB_DEMO_EMAIL = "test@test.com";
const UNSAVED_SALON_CONFIG_UPDATED_AT = new Date(0).toISOString();

export type EnsureVmbDemoSalonResult =
  | {
      ok: true;
      trialId: string;
      analysisId: string;
      redirectTo: string;
      clientCount: number;
      serviceCount: number;
      inviteTypeCount: number;
      seedPath?: string;
    }
  | { ok: false; error: string };

async function ensureDemoLeadAndWorkspace(): Promise<{ ok: true } | { ok: false; error: string }> {
  const lead = await upsertVmbTrialLead({
    id: VMB_DEMO_SALON_ID,
    salonName: VMB_DEMO_SALON_NAME,
    ownerName: VMB_DEMO_OWNER_NAME,
    email: VMB_DEMO_EMAIL,
    providerPlatform: "glossgenius",
    createdAt: "2026-06-23T00:00:00.000Z",
  });
  if ("error" in lead) return { ok: false, error: lead.error };

  const workspace = await upsertWorkspaceForTrial({
    trialId: VMB_DEMO_SALON_ID,
    salonName: VMB_DEMO_SALON_NAME,
    ownerName: VMB_DEMO_OWNER_NAME,
    email: VMB_DEMO_EMAIL,
    providerPlatform: "glossgenius",
  });
  if ("error" in workspace) return { ok: false, error: workspace.error };
  return { ok: true };
}

async function ensureDemoActiveBook(): Promise<
  { ok: true; analysisId: string; clientCount: number; seedPath?: string } | { ok: false; error: string }
> {
  const existing = await resolveActiveBook(VMB_DEMO_SALON_ID, {});
  if (existing.hasActiveBook && existing.analysisId) {
    return {
      ok: true,
      analysisId: existing.analysisId,
      clientCount: existing.analysis?.recordCount ?? 0,
    };
  }

  const seedPath = await resolveVmbDemoSeedBookPath();
  const rawText = await loadVmbDemoSeedBookText();
  const outcome = await runVmbBookAnalysis({
    trialId: VMB_DEMO_SALON_ID,
    salonName: VMB_DEMO_SALON_NAME,
    providerPlatform: "glossgenius",
    rawText,
    sourceType: "sample",
    fileName: "book.csv",
  });
  if (!outcome.ok) return { ok: false, error: outcome.error };

  const analysisId = outcome.data.analysis.analysisId;
  const latest = await setLatestAnalysis(VMB_DEMO_SALON_ID, analysisId);
  if ("error" in latest) return { ok: false, error: latest.error };
  return {
    ok: true,
    analysisId,
    clientCount: outcome.data.parse.parsedRecordCount,
    seedPath,
  };
}

async function ensureDemoServices(): Promise<{ ok: true; serviceCount: number } | { ok: false; error: string }> {
  const presets = await listServicePresetCards("nails");
  let serviceCount = 0;
  for (const preset of presets.filter((row) => row.active)) {
    const existing = await getSalonServiceConfig(VMB_DEMO_SALON_ID, preset.serviceOfferId);
    if (existing && existing.updatedAt !== UNSAVED_SALON_CONFIG_UPDATED_AT) {
      if (existing.status !== "active") {
        const activated = await upsertSalonServiceConfig(VMB_DEMO_SALON_ID, {
          catalogServiceId: preset.serviceOfferId,
          lifecycleAction: "activate",
          priceCents: existing.priceCents,
          durationMinutes: existing.durationMinutes,
          enabledAddonIds: existing.enabledAddonIds,
          addonPriceCentsById: existing.addonPriceCentsById ?? {},
        });
        if ("error" in activated) return { ok: false, error: activated.error };
      }
      serviceCount += 1;
      continue;
    }

    const activeAddons = preset.addonPresets.filter((addon) => addon.active);
    const addonPriceCentsById = Object.fromEntries(
      activeAddons.map((addon) => [addon.addonId, addon.priceCents]),
    );
    const enabledAddonIds = activeAddons
      .filter((addon) => addon.defaultSelected)
      .map((addon) => addon.addonId);

    const saved = await upsertSalonServiceConfig(VMB_DEMO_SALON_ID, {
      catalogServiceId: preset.serviceOfferId,
      lifecycleAction: "save",
      priceCents: preset.basePriceCents,
      durationMinutes: preset.durationMinutes,
      enabledAddonIds,
      addonPriceCentsById,
    });
    if ("error" in saved) return { ok: false, error: saved.error };

    const activated = await upsertSalonServiceConfig(VMB_DEMO_SALON_ID, {
      catalogServiceId: preset.serviceOfferId,
      lifecycleAction: "activate",
      priceCents: preset.basePriceCents,
      durationMinutes: preset.durationMinutes,
      enabledAddonIds,
      addonPriceCentsById,
    });
    if ("error" in activated) return { ok: false, error: activated.error };
    serviceCount += 1;
  }
  return { ok: true, serviceCount };
}

async function ensureDemoInviteTypes(): Promise<{ ok: true; inviteTypeCount: number } | { ok: false; error: string }> {
  const synced = await syncLibraryTemplatesToSalon(VMB_DEMO_SALON_ID);
  if ("error" in synced) return { ok: false, error: synced.error };

  let inviteTypeCount = 0;
  for (const copy of synced.copies) {
    const approved = await updateSalonInviteLocalCopy(VMB_DEMO_SALON_ID, copy.id, {
      inventoryStatus: "approved",
    });
    if ("error" in approved) return { ok: false, error: approved.error };
    inviteTypeCount += 1;
  }
  return { ok: true, inviteTypeCount };
}

export async function ensureVmbDemoSalon(): Promise<EnsureVmbDemoSalonResult> {
  const base = await ensureDemoLeadAndWorkspace();
  if (!base.ok) return base;

  const book = await ensureDemoActiveBook();
  if (!book.ok) return book;
  const services = await ensureDemoServices();
  if (!services.ok) return services;
  const invites = await ensureDemoInviteTypes();
  if (!invites.ok) return invites;

  return {
    ok: true,
    trialId: VMB_DEMO_SALON_ID,
    analysisId: book.analysisId,
    redirectTo: buildVmbTodayHref(book.analysisId),
    clientCount: book.clientCount,
    serviceCount: services.serviceCount,
    inviteTypeCount: invites.inviteTypeCount,
    seedPath: book.seedPath,
  };
}
