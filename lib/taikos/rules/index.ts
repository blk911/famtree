import type { AiosRuleResult } from "@/lib/taikos/types";
import type { VmbBookAnalysisResult } from "@/types/vmb/book-analysis";
import { runBirthdayRule } from "./birthday-rule";
import { runOpenSlotRule } from "./open-slot-rule";
import { runPcnInviteRule } from "./pcn-invite-rule";
import { runReactivationRule } from "./reactivation-rule";
import { runReferralRule } from "./referral-rule";

export function runAllAiosRules(
  analysis: VmbBookAnalysisResult | undefined,
  options?: { inviteState?: { invited: number; joined: number } },
): AiosRuleResult[] {
  const rules = [
    runPcnInviteRule(analysis, options?.inviteState),
    runReferralRule(analysis),
    runBirthdayRule(analysis),
    runReactivationRule(analysis),
    runOpenSlotRule(analysis),
  ];
  return rules.filter((r): r is AiosRuleResult => r !== null);
}

export { runBirthdayRule } from "./birthday-rule";
export { runReactivationRule } from "./reactivation-rule";
export { runOpenSlotRule } from "./open-slot-rule";
export { runPcnInviteRule } from "./pcn-invite-rule";
export { runReferralRule } from "./referral-rule";
