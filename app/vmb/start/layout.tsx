import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { VmbStartLayoutBranch } from "@/components/vmb/VmbStartLayoutBranch";
import { VMB_TRIAL_COOKIE } from "@/lib/vmb/paths";

export default async function VmbStartLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const hasTrialSession = !!cookieStore.get(VMB_TRIAL_COOKIE)?.value?.trim();

  return <VmbStartLayoutBranch hasTrialSession={hasTrialSession}>{children}</VmbStartLayoutBranch>;
}
