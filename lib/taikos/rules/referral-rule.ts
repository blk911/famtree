import type { AiosRuleResult } from "@/lib/taikos/types";
import type { VmbBookAnalysisResult } from "@/types/vmb/book-analysis";

export function runReferralRule(analysis: VmbBookAnalysisResult | undefined): AiosRuleResult | null {
  if (!analysis) return null;
  const referrals = analysis.referralOpportunities ?? [];
  if (referrals.length === 0) return null;

  const value = referrals.reduce((sum, r) => sum + r.estimatedValue, 0);
  const named = referrals.slice(0, 2).map((r) => r.clientName.split(/\s+/)[0]);

  return {
    ruleId: "referral",
    severity: "notice",
    value,
    recommendation:
      referrals.length === 1
        ? `${referrals[0].clientName} is a strong referral candidate.`
        : `${named.join(" and ")}${referrals.length > 2 ? ` and ${referrals.length - 2} more` : ""} can refer new clients.`,
    actions: [
      {
        id: "referral-invites",
        label: "Review referral touches",
        kind: "open_invites",
        href: "/vmb/invites?section=new_client_welcome",
      },
    ],
    opportunity: {
      id: "referral-batch",
      title: "Referral opportunities",
      description: `${referrals.length} clients with referral potential.`,
      estimatedValue: value,
      severity: "notice",
      sourceRule: "referral",
    },
  };
}
