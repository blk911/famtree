import { ensureVmbDemoSalon } from "@/lib/vmb/vmb-demo-salon";

export const VMB_MVP_LOGIN_EMAIL = "test@test.com";
export const VMB_MVP_LOGIN_PASSWORD = "whisper";
export const VMB_MVP_LOGIN_EMAIL_ALIASES = [
  VMB_MVP_LOGIN_EMAIL,
  "jenny@test.com",
  "deb@test.com",
] as const;
const VMB_MVP_LOGIN_EMAIL_ALIAS_SET = new Set<string>(VMB_MVP_LOGIN_EMAIL_ALIASES);

export function validateVmbMvpLoginCredentials(email: string, password: string): boolean {
  return VMB_MVP_LOGIN_EMAIL_ALIAS_SET.has(email.trim().toLowerCase()) && password === VMB_MVP_LOGIN_PASSWORD;
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
