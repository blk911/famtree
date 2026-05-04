import type { Provider } from "@/types/studios";
import type { ApplyStudioIntro } from "@/lib/studios/applyPreview";

/** Live `/studios/[slug]` nav — matches shell section ids (no admin-only chrome). */
export const STUDIO_PUBLIC_DEFAULT_NAV: { href: string; label: string }[] = [
  { href: "#about", label: "ABOUT" },
  { href: "#team", label: "TEAM" },
  { href: "#portfolio", label: "PORTFOLIO" },
  { href: "#services", label: "SERVICES" },
  { href: "#book", label: "BOOK" },
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
