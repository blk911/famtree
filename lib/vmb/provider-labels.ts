import type { VmbProviderPlatform } from "@/types/vmb/trial";

const LABELS: Record<VmbProviderPlatform, string> = {
  glossgenius: "GlossGenius",
  vagaro: "Vagaro",
  square: "Square",
  fresha: "Fresha",
  sola: "Sola",
  other: "Other",
};

export function vmbProviderLabel(platform?: VmbProviderPlatform | string): string {
  if (!platform) return "Your booking platform";
  const key = platform.toLowerCase() as VmbProviderPlatform;
  return LABELS[key] ?? platform;
}
