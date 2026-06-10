import type { VmbProviderPlatform } from "@/types/vmb/trial";

const LABELS: Record<VmbProviderPlatform, string> = {
  glossgenius: "GlossGenius",
  vagaro: "Vagaro",
  square: "Square",
  fresha: "Fresha",
  sola: "Sola",
  booksy: "Booksy",
  styleseat: "StyleSeat",
  acuity: "Acuity",
  schedulicity: "Schedulicity",
  boulevard: "Boulevard",
  mindbody: "Mindbody",
  mangomint: "Mangomint",
  phorest: "Phorest",
  other: "Other",
};

export function vmbProviderLabel(platform?: VmbProviderPlatform | string): string {
  if (!platform) return "Your booking platform";
  const key = platform.toLowerCase() as VmbProviderPlatform;
  return LABELS[key] ?? platform;
}
