import type { Provider } from "@/types/studios";
import type { ApplyStudioIntro } from "@/lib/studios/applyPreview";

/** Legacy sidebar / helpers — top bar uses `StudioTopNav` business anchors + logout on `/studios/[slug]`. */
export const STUDIO_PUBLIC_DEFAULT_NAV: { href: string; label: string }[] = [
  { href: "#about", label: "ABOUT" },
  { href: "#services", label: "SERVICES" },
  { href: "#lessons", label: "LESSONS" },
  { href: "#location", label: "LOCATION" },
  { href: "#contact", label: "CONTACT" },
];

/** Minimal story block for DB-backed studios (tagline/bio only until CMS fields exist). */
export function liveStoryFromProvider(provider: Provider): ApplyStudioIntro {
  const bio = provider.bio?.trim();
  return {
    title: "Why book with us",
    bullets: bio ? [bio] : ["Tell clients why they should book with you."],
  };
}
