"use client";

import { Mail, MapPin, Phone, User } from "lucide-react";
import type { ApplyStudioHeroFields } from "@/lib/studios/applyPreview";
import { COMMUNITY_PLATFORM_EYEBROW } from "@/lib/studios/communityPlatformCopy";
import { STUDIOS_INK } from "@/lib/studios/visual";

/** Left hero column — community identity anchor (name, story, location, tags, contact). */
export function StudioCommunityIdentityBlock({
  hero,
  communityDescription,
  categoryLabel,
  serviceType,
  showContact = true,
}: {
  hero: ApplyStudioHeroFields;
  communityDescription?: string;
  categoryLabel?: string;
  serviceType?: string;
  showContact?: boolean;
}) {
  const name = hero.businessName?.trim() || "Your community";
  const location = hero.physicalAddress?.trim();
  const description =
    communityDescription?.trim() ||
    "Short description of who you serve and what your private community is for.";
  const tags = [categoryLabel, serviceType].filter((t): t is string => Boolean(t?.trim()));

  return (
    <div className="mt-4 flex w-full max-w-[280px] flex-col gap-3 text-left">
      <p className="m-0 text-[10px] font-bold uppercase tracking-[0.2em] text-stone-500">{COMMUNITY_PLATFORM_EYEBROW}</p>
      <h1
        id="studio-public-heading"
        className="text-[1.5rem] font-bold leading-tight tracking-tight text-stone-900 md:text-[1.85rem]"
        style={{ color: STUDIOS_INK }}
      >
        {name}
      </h1>
      <p className="m-0 text-[15px] leading-snug text-stone-600">{description}</p>
      {location ? (
        <div className="flex items-start gap-2.5 text-[15px] leading-snug text-stone-600">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-stone-400" strokeWidth={2} aria-hidden />
          <span className="min-w-0">{location}</span>
        </div>
      ) : null}
      {tags.length > 0 ? (
        <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
          {tags.map((tag) => (
            <li
              key={tag}
              className="rounded-full border border-stone-200/90 bg-stone-50 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-stone-600"
            >
              {tag}
            </li>
          ))}
        </ul>
      ) : null}
      {showContact ? (
        <div className="mt-1 flex flex-col gap-2 border-t border-black/[0.06] pt-3">
          {hero.fullName?.trim() ? (
            <div className="flex items-start gap-2.5 text-[14px] leading-snug text-stone-600">
              <User className="mt-0.5 h-3.5 w-3.5 shrink-0 text-stone-400" strokeWidth={2} aria-hidden />
              <span>{hero.fullName.trim()}</span>
            </div>
          ) : null}
          <div className="flex items-start gap-2.5 text-[14px] leading-snug text-stone-600">
            <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0 text-stone-400" strokeWidth={2} aria-hidden />
            <span className="min-w-0 break-words">{hero.email?.trim() || "—"}</span>
          </div>
          <div className="flex items-start gap-2.5 text-[14px] leading-snug text-stone-600">
            <Phone className="mt-0.5 h-3.5 w-3.5 shrink-0 text-stone-400" strokeWidth={2} aria-hidden />
            <span className="min-w-0">{hero.phone?.trim() || "—"}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
