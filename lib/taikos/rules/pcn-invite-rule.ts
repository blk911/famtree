import { buildNetworkLaunchSummary } from "@/lib/vmb/operating-system/network-launch";
import type { AiosRuleResult } from "@/lib/taikos/types";
import type { VmbBookAnalysisResult } from "@/types/vmb/book-analysis";

export function runPcnInviteRule(
  analysis: VmbBookAnalysisResult | undefined,
  inviteState?: { invited: number; joined: number },
): AiosRuleResult | null {
  if (!analysis) return null;
  const network = buildNetworkLaunchSummary(analysis, inviteState ?? { invited: 0, joined: 0 });
  if (network.readyThisWeek === 0) return null;

  const value =
    network.candidates.reduce((sum, c) => sum + c.candidateScore * 15, 0) || network.readyThisWeek * 120;

  return {
    ruleId: "pcn-invite",
    severity: "priority",
    value,
    recommendation: `${network.readyThisWeek} private client network invite${network.readyThisWeek === 1 ? "" : "s"} ready to preview.`,
    actions: [
      {
        id: "pcn-invites",
        label: "Preview network invites",
        kind: "open_invites",
        href: "/vmb/invites?section=private_client_network",
      },
      {
        id: "pcn-network",
        label: "Open network",
        kind: "open_network",
        href: "/vmb/network",
      },
    ],
    opportunity: {
      id: "pcn-invites",
      title: "Private Client Network",
      description: `${network.readyThisWeek} invites ready · ${inviteState?.joined ?? 0} joined`,
      estimatedValue: value,
      severity: "priority",
      sourceRule: "pcn-invite",
    },
  };
}
