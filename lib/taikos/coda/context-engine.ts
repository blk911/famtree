import type { AiosContextPacket } from "@/lib/taikos/types";
import type { VmbSalonWorkspace } from "@/types/vmb/workspace";
import type { TaikosContext, TaikosSalonPhase } from "./types";

function resolvePhase(input: {
  verified: boolean;
  importedClientCount: number;
  pcnMemberCount: number;
  reactivationCount: number;
}): TaikosSalonPhase {
  if (!input.verified || input.importedClientCount < 5) return "onboarding";
  if (input.pcnMemberCount >= 100) return "growth";
  if (input.reactivationCount >= 3 && input.pcnMemberCount >= 25) return "retention";
  if (input.pcnMemberCount < 25) return "activation";
  return "retention";
}

export function buildTaikosContext(
  ctx: AiosContextPacket,
  workspace?: VmbSalonWorkspace,
): TaikosContext {
  const verified = !!workspace?.firstIngestCompleted;
  const importedClientCount = ctx.clientSummary.totalClients || ctx.clientSummary.activeClients;
  const pcnMemberCount = ctx.pcnSummary.membersJoined;
  const reactivationCount = ctx.clientSummary.likelyReactivations;

  return {
    salonId: ctx.salonId,
    ownerName: ctx.operatorName?.trim() || workspace?.ownerName?.trim() || "Owner",
    currentPhase: resolvePhase({ verified, importedClientCount, pcnMemberCount, reactivationCount }),
    verified,
    importedClientCount,
    pcnMemberCount,
  };
}

export function phaseLabel(phase: TaikosSalonPhase): string {
  switch (phase) {
    case "onboarding":
      return "Getting started";
    case "growth":
      return "Growing your network";
    case "activation":
      return "Activating relationships";
    case "retention":
      return "Strengthening retention";
  }
}
