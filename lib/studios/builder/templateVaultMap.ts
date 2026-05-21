import type { StudioTemplateType } from "@/types/studios/builder";
import type { VaultSpaceType } from "@/lib/aihsafe/vault-space";
import type { TrustUnitKind } from "@/types/aihsafe/trust-units";

export function vaultSpaceTypeForTemplate(templateType: StudioTemplateType): VaultSpaceType {
  switch (templateType) {
    case "private-client-network":
      return "BUSINESS";
    case "family-learning":
      return "FAMILY";
    case "executive-work":
      return "PRIVATE";
    case "local-community":
      return "CHURCH";
    case "gap-u-learning-lab":
      return "CLUB";
    case "private-studio-network":
    default:
      return "CUSTOM";
  }
}

export function trustKindForVault(vault: VaultSpaceType): TrustUnitKind {
  switch (vault) {
    case "FAMILY":
      return "family";
    case "PRIVATE":
      return "guardian";
    case "BUSINESS":
    case "CHURCH":
    case "CLUB":
      return "peer";
    default:
      return "peer";
  }
}
