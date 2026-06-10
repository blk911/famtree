import type { Metadata } from "next";
import { cookies } from "next/headers";
import { VmbTrialDashboardClient } from "@/components/studios/salon/VmbTrialDashboardClient";
import { VMB_TRIAL_COOKIE } from "@/lib/vmb/paths";

export const metadata: Metadata = {
  title: "VMB Trial Dashboard | Find the gold in your book",
  description: "Upload your salon export and view your hidden money report.",
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<{ trialId?: string }>;
};

export default async function VmbTrialDashboardPage({ searchParams }: Props) {
  const params = await searchParams;
  const cookieStore = await cookies();
  const trialId = params.trialId?.trim() || cookieStore.get(VMB_TRIAL_COOKIE)?.value || "";

  if (!trialId) {
    return (
      <div style={{ padding: 48, textAlign: "center", fontSize: 15, color: "#78716c" }}>
        <p style={{ marginBottom: 16 }}>Start your free trial to access the revenue dashboard.</p>
        <a href="/vmb#vmb-trial" style={{ color: "#9d174d", fontWeight: 800 }}>
          Start My 30-Day Trial →
        </a>
      </div>
    );
  }

  return <VmbTrialDashboardClient trialId={trialId} />;
}
