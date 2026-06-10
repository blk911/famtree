import path from "path";

export function getVmbTrialsDir(): string {
  return process.env.VERCEL
    ? path.join("/tmp", "vmb-trials")
    : path.join(process.cwd(), "runtime-data", "vmb", "trials");
}

export function getVmbTrialImportsDir(): string {
  return process.env.VERCEL
    ? path.join("/tmp", "vmb-trial-imports")
    : path.join(process.cwd(), "runtime-data", "vmb", "trial-imports");
}

export const VMB_TRIAL_COOKIE = "vmb_trial_id";
