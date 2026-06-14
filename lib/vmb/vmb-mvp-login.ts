import { resolveActiveBook } from "@/lib/vmb/active-book-resolver";
import { buildVmbTodayHref } from "@/lib/vmb/bootstrap-vmb-demo";
import { createVmbTrialLead, getVmbTrialLead } from "@/lib/vmb/trial-store";
import { upsertWorkspaceForTrial } from "@/lib/vmb/workspace-store";

export const VMB_MVP_LOGIN_EMAIL = "test@test.com";
export const VMB_MVP_LOGIN_PASSWORD = "whisper";

export function validateVmbMvpLoginCredentials(email: string, password: string): boolean {
  return (
    email.trim().toLowerCase() === VMB_MVP_LOGIN_EMAIL &&
    password === VMB_MVP_LOGIN_PASSWORD
  );
}

export type VmbMvpLoginResult =
  | {
      ok: true;
      trialId: string;
      redirectTo: string;
      hasActiveBook: boolean;
      analysisId?: string;
      createdTrial: boolean;
    }
  | { ok: false; error: string };

export async function resolveVmbMvpLogin(input: {
  email: string;
  password: string;
  existingTrialId?: string;
}): Promise<VmbMvpLoginResult> {
  if (!validateVmbMvpLoginCredentials(input.email, input.password)) {
    return { ok: false, error: "Invalid email or password" };
  }

  let trialId = input.existingTrialId?.trim();
  let createdTrial = false;

  if (trialId) {
    const existing = await getVmbTrialLead(trialId);
    if (!existing || existing.id !== trialId) {
      trialId = undefined;
    }
  }

  if (!trialId) {
    const trialResult = await createVmbTrialLead({
      salonName: "Your Salon",
      ownerName: "Salon Owner",
      email: VMB_MVP_LOGIN_EMAIL,
      providerPlatform: "glossgenius",
    });
    if ("error" in trialResult) {
      return { ok: false, error: trialResult.error };
    }
    trialId = trialResult.lead.id;
    createdTrial = true;

    const workspaceResult = await upsertWorkspaceForTrial({
      trialId,
      salonName: trialResult.lead.salonName,
      ownerName: trialResult.lead.ownerName,
      email: trialResult.lead.email,
      providerPlatform: "glossgenius",
    });
    if ("error" in workspaceResult) {
      return { ok: false, error: workspaceResult.error };
    }
  }

  const resolved = await resolveActiveBook(trialId, {});
  if (resolved.hasActiveBook && resolved.analysisId) {
    return {
      ok: true,
      trialId,
      hasActiveBook: true,
      analysisId: resolved.analysisId,
      redirectTo: buildVmbTodayHref(resolved.analysisId),
      createdTrial,
    };
  }

  return {
    ok: true,
    trialId,
    hasActiveBook: false,
    redirectTo: "/vmb/start",
    createdTrial,
  };
}
