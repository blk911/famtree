import { ensureVmbDemoSalon } from "@/lib/vmb/vmb-demo-salon";

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

  void input.existingTrialId;
  const demo = await ensureVmbDemoSalon();
  if (!demo.ok) return { ok: false, error: demo.error };
  return {
    ok: true,
    trialId: demo.trialId,
    hasActiveBook: true,
    analysisId: demo.analysisId,
    redirectTo: demo.redirectTo,
    createdTrial: false,
  };
}
