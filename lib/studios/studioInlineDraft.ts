import type { Provider } from "@/types/studios";
import type { ApplyStudioIntro } from "@/lib/studios/applyPreview";

/** Browser-only overrides for `/studios/[slug]` quick edits (no API yet). */
export type StudioInlineDraft = {
  displayName?: string;
  subtitleOverride?: string;
  storyTitle?: string;
  storyBulletsText?: string;
  bio?: string;
  profileImageUrl?: string;
  locationLabel?: string;
  phoneRaw?: string;
  contactNote?: string;
};

export function studioInlineStorageKey(slug: string): string {
  return `amih_studio_inline_v1_${slug}`;
}

export function parseStudioInlineDraft(raw: string | null): StudioInlineDraft {
  if (!raw) return {};
  try {
    const o = JSON.parse(raw) as StudioInlineDraft;
    return o && typeof o === "object" ? o : {};
  } catch {
    return {};
  }
}

export function mergeProviderWithDraft(provider: Provider, draft: StudioInlineDraft): Provider {
  return {
    ...provider,
    displayName:
      draft.displayName !== undefined && draft.displayName.trim().length > 0
        ? draft.displayName.trim()
        : provider.displayName,
    locationLabel:
      draft.locationLabel !== undefined && draft.locationLabel.trim().length > 0
        ? draft.locationLabel.trim()
        : provider.locationLabel,
    bio:
      draft.bio !== undefined && draft.bio.trim().length > 0 ? draft.bio.trim() : provider.bio,
    imageUrl:
      draft.profileImageUrl !== undefined && draft.profileImageUrl.trim().length > 0
        ? draft.profileImageUrl.trim()
        : provider.imageUrl,
  };
}

export function mergeStoryWithDraft(
  base: ApplyStudioIntro | null | undefined,
  draft: StudioInlineDraft,
): ApplyStudioIntro {
  const titleBase = base?.title?.trim() ?? "";
  const bulletsBase = Array.isArray(base?.bullets) ? base!.bullets : [];

  const title =
    draft.storyTitle !== undefined && draft.storyTitle.trim().length > 0
      ? draft.storyTitle.trim()
      : titleBase || "Why book with us";

  let bullets = bulletsBase;
  if (draft.storyBulletsText !== undefined) {
    const parsed = draft.storyBulletsText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    if (parsed.length > 0) bullets = parsed;
  }

  return { title, bullets };
}

export function defaultSubtitleLine(provider: Provider, categoryLabel: string): string {
  return [provider.serviceType, categoryLabel, provider.locationLabel].filter(Boolean).join(" · ");
}
