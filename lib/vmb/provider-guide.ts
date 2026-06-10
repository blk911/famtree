import type { VmbProviderPlatform } from "@/types/vmb/trial";
import { vmbProviderLabel } from "@/lib/vmb/provider-labels";

export type ProviderOption = {
  id: VmbProviderPlatform;
  label: string;
};

export const topProviders: ProviderOption[] = [
  { id: "glossgenius", label: "GlossGenius" },
  { id: "vagaro", label: "Vagaro" },
  { id: "square", label: "Square" },
  { id: "fresha", label: "Fresha" },
];

export const moreProviders: ProviderOption[] = [
  { id: "sola", label: "Sola" },
  { id: "booksy", label: "Booksy" },
  { id: "styleseat", label: "StyleSeat" },
  { id: "acuity", label: "Acuity" },
  { id: "schedulicity", label: "Schedulicity" },
  { id: "boulevard", label: "Boulevard" },
  { id: "mindbody", label: "Mindbody" },
  { id: "mangomint", label: "Mangomint" },
  { id: "phorest", label: "Phorest" },
  { id: "other", label: "Other" },
];

export const VMB_PROVIDER_PLATFORMS: VmbProviderPlatform[] = [
  ...topProviders.map((p) => p.id),
  ...moreProviders.map((p) => p.id),
];

const EXPORT_GUIDES: Partial<Record<VmbProviderPlatform, string>> = {
  glossgenius:
    "Download your client list or appointments export from GlossGenius, then upload it here.",
  vagaro: "Export your customer list or appointments report from Vagaro.",
  square: "Export customers or appointments from Square.",
  fresha: "Export clients or appointments from Fresha.",
  other: "Upload any CSV with client names, services, visit dates, or spending.",
};

export function getProviderExportGuide(
  provider: VmbProviderPlatform,
  customOtherLabel?: string,
): string {
  const guide = EXPORT_GUIDES[provider];
  if (guide) return guide;
  const label =
    provider === "other" && customOtherLabel?.trim()
      ? customOtherLabel.trim()
      : vmbProviderLabel(provider);
  return `Export your client list or appointments from ${label}.`;
}
