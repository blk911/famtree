"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { MapPin, Pencil, Play } from "lucide-react";
import type { Provider, ProviderCategory, StudioOffer } from "@/types/studios";
import { PROVIDER_CATEGORY_LABELS } from "@/types/studios";
import type { ApplyStudioHeroFields, ApplyStudioIntro } from "@/lib/studios/applyPreview";
import { STUDIOS_CARD_SHADOW, STUDIOS_INK, STUDIOS_LINE, STUDIOS_MUTED } from "@/lib/studios/visual";
import { StudioEditorTopNav } from "@/components/studios/StudioEditorTopNav";
import { TrainerPhoto } from "./TrainerPhoto";
import { TrainerOfferCards } from "./TrainerOfferCards";
import { ApplyStudiosStartFrame } from "./ApplyStudiosStartFrame";
import { StudioLiteStepRail } from "@/components/studios/StudioLiteStepRail";
import type { StudioInlineDraft } from "@/lib/studios/studioInlineDraft";
import {
  defaultSubtitleLine,
  mergeProviderWithDraft,
  mergeStoryWithDraft,
  parseStudioInlineDraft,
  studioInlineStorageKey,
} from "@/lib/studios/studioInlineDraft";

const ACCENT_BY_CATEGORY: Record<ProviderCategory, string> = {
  trainer: "#c9a66b",
  strength_coach: "#c9a66b",
  mobility: "#7aab9a",
  massage: "#d4897a",
  physical_therapy: "#d4897a",
  sports_medicine: "#8b9dc3",
  recovery: "#7aab9a",
  sauna_cryo: "#7aab9a",
  hydration_iv: "#8b9dc3",
  nutrition: "#c9a66b",
  performance_coach: "#c9a66b",
  beauty_salon: "#d4897a",
  nail_salon: "#d4897a",
};

const NAV_LIVE = [
  { href: "#about", label: "About" },
  { href: "#team", label: "Story" },
  { href: "#portfolio", label: "Profile" },
  { href: "#services", label: "Services" },
  { href: "#contact", label: "Contact" },
] as const;

type ShellVariant = "live" | "start";
type EditingSection = null | "about" | "story" | "portfolio" | "services" | "contact";

/** Ambient training photography — decorative backgrounds only (Unsplash). */
const TRAINING_HERO_IMG =
  "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1600&q=75";
const TRAINING_FOLD_IMG =
  "https://images.unsplash.com/photo-1574680096145-d05b474e2155?auto=format&fit=crop&w=1400&q=75";

/** OpenStreetMap embed (Denver area) — placeholder until studio address geocoding is wired. */
const STUDIO_PREVIEW_MAP_EMBED =
  "https://www.openstreetmap.org/export/embed.html?bbox=-105.15%2C39.68%2C-104.92%2C39.82&layer=mapnik";

const DEFAULT_LIVE_CONTACT_COPY =
  "Prefer to start through a service? Use a card above — requests go to this provider when backend routing is live.";

function LocationContactSection({
  provider,
  description,
  showMap,
  phoneRaw,
}: {
  provider: Provider;
  description: string;
  showMap?: boolean;
  /** Shown exactly as typed — no normalization. */
  phoneRaw?: string | null;
}) {
  const infoCard = (
    <div
      style={{
        padding: "22px",
        borderRadius: "20px",
        background: "#fff",
        border: `1px solid ${STUDIOS_LINE}`,
        boxShadow: STUDIOS_CARD_SHADOW,
        display: "flex",
        gap: "12px",
        alignItems: "flex-start",
        height: showMap ? "100%" : undefined,
      }}
    >
      <div
        style={{
          width: "40px",
          height: "40px",
          borderRadius: "12px",
          background: "rgba(201, 166, 107, 0.15)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <MapPin style={{ width: "18px", height: "18px", color: "#b8956c" }} />
      </div>
      <div>
        <p style={{ margin: 0, fontWeight: 600, color: STUDIOS_INK }}>{provider.locationLabel ?? "Denver metro"}</p>
        {(provider.city || provider.state) && (
          <p style={{ margin: "6px 0 0", fontSize: "14px", color: STUDIOS_MUTED }}>
            {[provider.city, provider.state].filter(Boolean).join(", ")}
          </p>
        )}
        <p style={{ margin: "12px 0 0", fontSize: "14px", lineHeight: 1.5, color: STUDIOS_MUTED }}>{description}</p>
        {phoneRaw != null && phoneRaw.trim().length > 0 ? (
          <p style={{ margin: "10px 0 0", fontSize: "15px", fontWeight: 600, color: STUDIOS_INK, whiteSpace: "pre-wrap" }}>
            {phoneRaw}
          </p>
        ) : null}
      </div>
    </div>
  );

  if (!showMap) {
    return infoCard;
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:items-stretch lg:gap-6">
      {infoCard}
      <div
        className="flex min-h-[260px] flex-col overflow-hidden rounded-[20px] border bg-white lg:min-h-[300px]"
        style={{ borderColor: STUDIOS_LINE, boxShadow: STUDIOS_CARD_SHADOW }}
      >
        <iframe
          title="Studio location map preview"
          src={STUDIO_PREVIEW_MAP_EMBED}
          className="h-[240px] w-full shrink-0 border-0 lg:h-auto lg:min-h-0 lg:flex-1"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
        <p className="m-0 border-t border-black/[0.06] bg-stone-50/80 px-3 py-2 text-center text-[11px] leading-snug text-stone-500">
          Preview map — your published address will center here.
        </p>
      </div>
    </div>
  );
}

function StudioPageMainColumns({
  nav,
  variant,
  provider,
  offers,
  liveInlineEdit,
}: {
  nav?: readonly { readonly href: string; readonly label: string }[];
  variant: ShellVariant;
  provider: Provider;
  offers: StudioOffer[];
  liveInlineEdit?: {
    editing: null | "services" | "contact";
    onEditServices: () => void;
    onEditContact: () => void;
    servicesPanel: ReactNode;
    contactPanel: ReactNode;
    contactDescription: string;
    phoneRaw?: string;
  };
}) {
  if (variant === "start") {
    return (
      <div
        style={{
          borderTop: "1px solid rgba(0,0,0,0.06)",
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.72) 0%, rgba(250,247,241,0.92) 35%, rgba(243,238,228,0.55) 100%)",
        }}
      >
        <div className="mx-auto max-w-[1200px] px-6 pb-[72px] pt-10 md:pt-12">
          <div style={{ minWidth: 0 }}>
            <section id="services" style={{ marginBottom: "48px" }}>
              <div id="book" className="scroll-mt-24" />
              <h2
                style={{
                  fontSize: "clamp(22px, 3vw, 28px)",
                  fontWeight: 700,
                  color: STUDIOS_INK,
                  margin: "0 0 8px",
                  letterSpacing: "-0.3px",
                }}
              >
                Services & offers (preview)
              </h2>
              <p style={{ fontSize: "15px", color: STUDIOS_MUTED, margin: "0 0 24px", lineHeight: 1.5 }}>
                These sample cards match what clients will see. Open one to try the request flow — nothing is sent yet.
              </p>
              <TrainerOfferCards providerName={provider.displayName ?? ""} offers={offers} previewMode gridColumns="four" />
            </section>
            <section id="contact">
              <h2
                style={{
                  fontSize: "clamp(22px, 3vw, 28px)",
                  fontWeight: 700,
                  color: STUDIOS_INK,
                  margin: "0 0 16px",
                  letterSpacing: "-0.3px",
                }}
              >
                Location & contact
              </h2>
              <LocationContactSection
                provider={provider}
                description="Your real service area and contact options appear here after your studio is approved and published."
                showMap
              />
            </section>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-[1100px] grid-cols-1 gap-8 px-6 pb-[72px] md:grid-cols-[minmax(0,200px)_minmax(0,1fr)] md:items-start md:gap-8">
      <nav
        aria-label="Page sections"
        className="relative top-0 flex flex-row flex-wrap gap-1 rounded-[18px] border bg-white p-4 md:sticky md:top-5 md:flex-col md:gap-1.5"
        style={{ borderColor: STUDIOS_LINE, boxShadow: STUDIOS_CARD_SHADOW }}
      >
        {(nav ?? NAV_LIVE).map(({ href, label }) => (
          <a
            key={href}
            href={href}
            className="rounded-xl px-3.5 py-2.5 text-sm font-semibold text-[#262626] transition hover:bg-black/[0.04]"
            style={{ color: STUDIOS_INK }}
          >
            {label}
          </a>
        ))}
      </nav>

      <div style={{ minWidth: 0 }}>
        <section id="services" style={{ marginBottom: "48px", position: "relative" }}>
          {liveInlineEdit ? (
            <button
              type="button"
              aria-label="Edit services section"
              className="absolute right-0 top-0 z-10 rounded-full border border-stone-200 bg-white p-2 shadow-sm hover:bg-stone-50 md:right-1"
              onClick={liveInlineEdit.onEditServices}
            >
              <Pencil className="h-4 w-4 text-stone-600" aria-hidden />
            </button>
          ) : null}
          <h2
            style={{
              fontSize: "clamp(22px, 3vw, 28px)",
              fontWeight: 700,
              color: STUDIOS_INK,
              margin: "0 0 8px",
              letterSpacing: "-0.3px",
            }}
          >
            Services & offers
          </h2>
          <p style={{ fontSize: "15px", color: STUDIOS_MUTED, margin: "0 0 24px", lineHeight: 1.5 }}>
            Tap a card to request — you'll share your email and a short note. No payment on this step.
          </p>
          {liveInlineEdit?.editing === "services" ? liveInlineEdit.servicesPanel : null}
          <TrainerOfferCards providerName={provider.displayName ?? ""} offers={offers} previewMode={false} />
        </section>

        <section id="contact" style={{ position: "relative" }}>
          {liveInlineEdit ? (
            <button
              type="button"
              aria-label="Edit contact section"
              className="absolute right-0 top-0 z-10 rounded-full border border-stone-200 bg-white p-2 shadow-sm hover:bg-stone-50 md:right-1"
              onClick={liveInlineEdit.onEditContact}
            >
              <Pencil className="h-4 w-4 text-stone-600" aria-hidden />
            </button>
          ) : null}
          <h2
            style={{
              fontSize: "clamp(22px, 3vw, 28px)",
              fontWeight: 700,
              color: STUDIOS_INK,
              margin: "0 0 16px",
              letterSpacing: "-0.3px",
            }}
          >
            Location & contact
          </h2>
          {liveInlineEdit?.editing === "contact" ? liveInlineEdit.contactPanel : null}
          <LocationContactSection
            provider={provider}
            description={liveInlineEdit?.contactDescription ?? DEFAULT_LIVE_CONTACT_COPY}
            showMap
            phoneRaw={liveInlineEdit?.phoneRaw}
          />
        </section>
      </div>
    </div>
  );
}

export function TrainerStudioShell({
  provider,
  offers,
  variant = "live",
  applyTemplate,
  editorPreviewSlug = null,
  accentHex,
  draftStorageKey,
  editorNavItems,
  liveStoryIntro,
  publicNav,
  inlineEdit = false,
  studioSlug = null,
}: {
  provider: Provider;
  offers: StudioOffer[];
  variant?: ShellVariant;
  applyTemplate?: { hero: ApplyStudioHeroFields; intro: ApplyStudioIntro };
  editorPreviewSlug?: string | null;
  accentHex?: string | null;
  draftStorageKey?: string;
  editorNavItems?: readonly { readonly href: string; readonly label: string }[];
  liveStoryIntro?: ApplyStudioIntro | null;
  publicNav?: readonly { readonly href: string; readonly label: string }[] | null;
  /** Owner/admin — section pencils + lite step bar (browser-local draft). */
  inlineEdit?: boolean;
  studioSlug?: string | null;
}) {
  const safeOffers = Array.isArray(offers) ? offers : [];
  const slugKey = studioSlug?.trim() ?? "";
  const draftActive = variant === "live" && Boolean(inlineEdit && slugKey.length > 0);

  const [draft, setDraft] = useState<StudioInlineDraft>({});
  const [editingSection, setEditingSection] = useState<EditingSection>(null);

  const [heroName, setHeroName] = useState("");
  const [heroSub, setHeroSub] = useState("");
  const [storyTitle, setStoryTitle] = useState("");
  const [storyBullets, setStoryBullets] = useState("");
  const [profBio, setProfBio] = useState("");
  const [profImg, setProfImg] = useState("");
  const [contactLoc, setContactLoc] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactNote, setContactNote] = useState("");

  useEffect(() => {
    if (!draftActive || !slugKey) return;
    setDraft(parseStudioInlineDraft(localStorage.getItem(studioInlineStorageKey(slugKey))));
  }, [draftActive, slugKey]);

  const persistDraft = useCallback(
    (next: StudioInlineDraft) => {
      setDraft(next);
      if (!slugKey || !draftActive) return;
      try {
        localStorage.setItem(studioInlineStorageKey(slugKey), JSON.stringify(next));
      } catch {
        /* ignore quota */
      }
    },
    [draftActive, slugKey],
  );

  const mergedProvider = useMemo(() => {
    if (!draftActive) return provider;
    return mergeProviderWithDraft(provider, draft);
  }, [draftActive, provider, draft]);

  const mergedStory = useMemo(() => {
    if (!draftActive) return liveStoryIntro;
    return mergeStoryWithDraft(liveStoryIntro, draft);
  }, [draftActive, liveStoryIntro, draft]);

  const mergedCategoryLabel =
    PROVIDER_CATEGORY_LABELS[mergedProvider.category] ?? String(mergedProvider.category ?? "Studio");

  useEffect(() => {
    if (!draftActive) return;
    if (editingSection === "about") {
      setHeroName(mergedProvider.displayName);
      setHeroSub(
        draft.subtitleOverride?.trim()
          ? draft.subtitleOverride.trim()
          : defaultSubtitleLine(mergedProvider, mergedCategoryLabel),
      );
    }
    if (editingSection === "story") {
      const st = mergeStoryWithDraft(liveStoryIntro, draft);
      setStoryTitle(st.title);
      setStoryBullets(st.bullets.join("\n"));
    }
    if (editingSection === "portfolio") {
      setProfBio(mergedProvider.bio ?? "");
      setProfImg(mergedProvider.imageUrl ?? "");
    }
    if (editingSection === "contact") {
      setContactLoc(mergedProvider.locationLabel ?? "");
      setContactPhone(draft.phoneRaw ?? "");
      setContactNote(draft.contactNote ?? "");
    }
  }, [editingSection, draftActive, mergedProvider, mergedCategoryLabel, draft, liveStoryIntro]);

  const trimmedAccent = accentHex?.trim();
  const accent = useMemo(() => {
    const catSource = variant === "live" ? mergedProvider : provider;
    return trimmedAccent && trimmedAccent.length > 0
      ? trimmedAccent
      : ACCENT_BY_CATEGORY[catSource.category] ?? "#c9a66b";
  }, [variant, mergedProvider, provider, trimmedAccent]);

  const categoryLabel =
    PROVIDER_CATEGORY_LABELS[provider.category] ?? String(provider.category ?? "Studio");
  const subtitle = useMemo(() => {
    if (variant !== "live") {
      return [provider.serviceType, categoryLabel, provider.locationLabel].filter(Boolean).join(" · ");
    }
    if (draftActive && draft.subtitleOverride !== undefined && draft.subtitleOverride.trim().length > 0) {
      return draft.subtitleOverride.trim();
    }
    return defaultSubtitleLine(mergedProvider, mergedCategoryLabel);
  }, [variant, provider, categoryLabel, draftActive, draft.subtitleOverride, mergedProvider, mergedCategoryLabel]);

  const contactDescription =
    draftActive && draft.contactNote !== undefined && draft.contactNote.trim().length > 0
      ? draft.contactNote.trim()
      : DEFAULT_LIVE_CONTACT_COPY;

  const phoneLine =
    draftActive && draft.phoneRaw != null && draft.phoneRaw.trim().length > 0 ? draft.phoneRaw : undefined;

  const scrollToHash = useCallback((href: string) => {
    setEditingSection(null);
    const id = href.startsWith("#") ? href.slice(1) : href;
    requestAnimationFrame(() =>
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  }, []);

  const steps = useMemo(() => {
    if (!draftActive) return [];
    const ms = mergedStory ?? mergeStoryWithDraft(liveStoryIntro, draft);
    const introOk = mergedProvider.displayName.trim().length > 0;
    const storyOk =
      ms.title.trim().length > 0 &&
      Array.isArray(ms.bullets) &&
      ms.bullets.some((b) => b.trim().length > 0);
    const profileOk = (mergedProvider.bio?.trim().length ?? 0) >= 8;
    const servOk = safeOffers.length > 0;
    const contactOk = (mergedProvider.locationLabel?.trim().length ?? 0) > 0;
    return [
      { id: "intro", label: "Intro", href: "#about", complete: introOk },
      { id: "story", label: "Story", href: "#team", complete: storyOk },
      { id: "profile", label: "Profile", href: "#portfolio", complete: profileOk },
      { id: "services", label: "Services", href: "#services", complete: servOk },
      { id: "contact", label: "Contact", href: "#contact", complete: contactOk },
    ];
  }, [draftActive, mergedProvider, mergedStory, liveStoryIntro, draft, safeOffers]);

  const servicesPanel = draftActive ? (
    <div className="mb-4 rounded-xl border border-teal-200/90 bg-teal-50/80 p-4">
      <p className="text-sm leading-relaxed text-stone-700">
        Offer cards mirror your published tiers. Changing titles or prices will hook into studio settings next.
      </p>
      <button
        type="button"
        className="mt-3 rounded-full bg-stone-900 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white hover:bg-stone-800"
        onClick={() => setEditingSection(null)}
      >
        Done
      </button>
    </div>
  ) : null;

  const contactPanel = draftActive ? (
    <div className="mb-4 space-y-3 rounded-xl border border-teal-200/90 bg-teal-50/80 p-4">
      <label className="block text-[11px] font-bold uppercase tracking-wide text-stone-500">
        Location label
        <input
          className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm"
          value={contactLoc}
          onChange={(e) => setContactLoc(e.target.value)}
        />
      </label>
      <label className="block text-[11px] font-bold uppercase tracking-wide text-stone-500">
        Phone (exactly as shown)
        <input
          className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm"
          value={contactPhone}
          onChange={(e) => setContactPhone(e.target.value)}
          inputMode="tel"
        />
      </label>
      <label className="block text-[11px] font-bold uppercase tracking-wide text-stone-500">
        Contact blurb
        <textarea
          className="mt-1 min-h-[72px] w-full rounded-lg border border-stone-200 px-3 py-2 text-sm"
          value={contactNote}
          onChange={(e) => setContactNote(e.target.value)}
        />
      </label>
      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="button"
          className="rounded-full bg-stone-900 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white hover:bg-stone-800"
          onClick={() => {
            persistDraft({
              ...draft,
              locationLabel: contactLoc,
              phoneRaw: contactPhone,
              contactNote,
            });
            setEditingSection(null);
          }}
        >
          Save
        </button>
        <button
          type="button"
          className="rounded-full border border-stone-300 bg-white px-4 py-2 text-xs font-bold uppercase tracking-wide text-stone-800 hover:bg-stone-50"
          onClick={() => setEditingSection(null)}
        >
          Cancel
        </button>
      </div>
    </div>
  ) : null;

  const liveInlineEdit =
    draftActive
      ? {
          editing:
            editingSection === "services" ? ("services" as const) : editingSection === "contact" ? ("contact" as const) : null,
          onEditServices: () => setEditingSection("services"),
          onEditContact: () => setEditingSection("contact"),
          servicesPanel,
          contactPanel,
          contactDescription,
          phoneRaw: phoneLine,
        }
      : undefined;

  const eyebrow = variant === "start" ? "Start your studio" : "AIH Studios provider";

  const applyHero = variant === "start" && applyTemplate ? applyTemplate.hero : null;
  const applyIntro = variant === "start" && applyTemplate ? applyTemplate.intro : null;

  const showStory =
    draftActive ||
    Boolean(
      mergedStory &&
        (mergedStory.title.trim().length > 0 ||
          (Array.isArray(mergedStory.bullets) && mergedStory.bullets.some((b) => b.trim().length > 0))),
    );

  return (
    <>
      {applyHero && applyIntro ? (
        <ApplyStudiosStartFrame
          initialHero={applyHero}
          provider={{ displayName: provider.displayName ?? "Studio", imageUrl: provider.imageUrl }}
          accent={accent}
          editorPreviewSlug={editorPreviewSlug}
          draftStorageKey={draftStorageKey}
          editorNavItems={editorNavItems}
        >
          <section
            id="team"
            style={{
              position: "relative",
              margin: "0 auto",
              maxWidth: "1100px",
              padding: "48px 24px 56px",
              borderBottom: "1px solid rgba(0,0,0,0.06)",
              overflow: "hidden",
              background: "linear-gradient(120deg, rgba(255,255,255,0.96) 0%, rgba(247,245,238,0.94) 45%, rgba(235,243,252,0.55) 100%)",
            }}
          >
            <div
              aria-hidden
              style={{
                position: "absolute",
                inset: 0,
                backgroundImage: `url(${TRAINING_HERO_IMG})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                opacity: 0.13,
                pointerEvents: "none",
              }}
            />
            <div style={{ position: "relative", zIndex: 1 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
                  gap: "40px",
                  alignItems: "center",
                }}
              >
                <div
                  id="portfolio"
                  style={{
                    borderRadius: "22px",
                    overflow: "hidden",
                    border: `1px solid ${STUDIOS_LINE}`,
                    boxShadow: STUDIOS_CARD_SHADOW,
                    background: "linear-gradient(160deg, rgba(250,248,245,0.95) 0%, #fff 45%, #f3f0eb 100%)",
                    aspectRatio: "16 / 9",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "10px",
                    position: "relative",
                  }}
                >
                  <div
                    aria-hidden
                    style={{
                      position: "absolute",
                      inset: 0,
                      backgroundImage: `url(${TRAINING_FOLD_IMG})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      opacity: 0.18,
                    }}
                  />
                  <div
                    style={{
                      width: "64px",
                      height: "64px",
                      borderRadius: "50%",
                      background: "rgba(38, 38, 38, 0.88)",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      position: "relative",
                      zIndex: 1,
                    }}
                  >
                    <Play style={{ width: "26px", height: "26px", marginLeft: "4px" }} fill="currentColor" />
                  </div>
                  <span
                    style={{
                      fontSize: "14px",
                      fontWeight: 600,
                      color: STUDIOS_MUTED,
                      position: "relative",
                      zIndex: 1,
                    }}
                  >
                    Intro video
                  </span>
                  <span
                    style={{
                      fontSize: "12px",
                      color: STUDIOS_MUTED,
                      opacity: 0.85,
                      position: "relative",
                      zIndex: 1,
                    }}
                  >
                    Placeholder — upload after approval
                  </span>
                  {/* TODO(studios:video): embed or signed URL */}
                </div>

                <div>
                  <h2
                    style={{
                      fontSize: "clamp(22px, 3vw, 28px)",
                      fontWeight: 700,
                      color: STUDIOS_INK,
                      margin: "0 0 20px",
                      letterSpacing: "-0.3px",
                      lineHeight: 1.2,
                    }}
                  >
                    {applyIntro.title}
                  </h2>
                  <ul style={{ margin: 0, paddingLeft: "22px", display: "flex", flexDirection: "column", gap: "14px" }}>
                    {(Array.isArray(applyIntro.bullets) ? applyIntro.bullets : []).map((line) => (
                      <li key={line} style={{ fontSize: "16px", lineHeight: 1.55, color: "#404040" }}>
                        {line}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </section>
          <StudioPageMainColumns variant="start" provider={provider} offers={safeOffers} />
        </ApplyStudiosStartFrame>
      ) : (
        <>
          {publicNav && publicNav.length > 0 ? (
            <div
              className="sticky top-0 z-40 border-b border-black/[0.06] bg-[#fafaf8]/95 backdrop-blur-md"
              style={{ marginBottom: 0 }}
            >
              <div className="mx-auto max-w-[1100px] px-4 pt-3 pb-2">
                <StudioEditorTopNav items={[...publicNav]} />
              </div>
              {draftActive ? (
                <>
                  <StudioLiteStepRail steps={steps} onStepClick={scrollToHash} />
                  <p className="mx-auto max-w-[1100px] px-4 pb-2 text-center text-[10px] text-stone-500">
                    Quick edits save in this browser only — visitors never see pencils or this bar.
                  </p>
                </>
              ) : null}
            </div>
          ) : draftActive ? (
            <div className="sticky top-0 z-40 border-b border-black/[0.06] bg-[#fafaf8]/95 backdrop-blur-md">
              <StudioLiteStepRail steps={steps} onStepClick={scrollToHash} />
              <p className="mx-auto max-w-[1100px] px-4 pb-2 text-center text-[10px] text-stone-500">
                Quick edits save in this browser only — visitors never see pencils or this bar.
              </p>
            </div>
          ) : null}
          <section
            id="about"
            className="scroll-mt-28"
            style={{
              position: "relative",
              padding: "56px 24px 48px",
              overflow: "hidden",
              textAlign: "center",
            }}
          >
            {draftActive && editingSection !== "about" ? (
              <button
                type="button"
                aria-label="Edit intro section"
                className="absolute right-4 top-6 z-10 rounded-full border border-stone-200 bg-white p-2.5 shadow-sm hover:bg-stone-50 md:right-8"
                onClick={() => setEditingSection("about")}
              >
                <Pencil className="h-4 w-4 text-stone-600" aria-hidden />
              </button>
            ) : null}
            <div
              style={{
                position: "absolute",
                top: "-60px",
                left: "50%",
                transform: "translateX(-50%)",
                width: "min(640px, 92vw)",
                height: "220px",
                background: "radial-gradient(circle, rgba(255, 218, 230, 0.45) 0%, transparent 70%)",
                filter: "blur(18px)",
                pointerEvents: "none",
              }}
            />
            {draftActive && editingSection === "about" ? (
              <div style={{ position: "relative", zIndex: 1, maxWidth: "560px", margin: "0 auto", textAlign: "left" }}>
                <div className="rounded-2xl border border-teal-200/90 bg-white p-5 shadow-sm">
                  <p className="mb-3 text-[11px] font-bold uppercase tracking-wide text-stone-500">Edit intro</p>
                  <label className="mb-3 block text-[11px] font-bold uppercase text-stone-500">
                    Studio name
                    <input
                      className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-base font-semibold text-stone-900"
                      value={heroName}
                      onChange={(e) => setHeroName(e.target.value)}
                    />
                  </label>
                  <label className="mb-4 block text-[11px] font-bold uppercase text-stone-500">
                    Subtitle line
                    <input
                      className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800"
                      value={heroSub}
                      onChange={(e) => setHeroSub(e.target.value)}
                    />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded-full bg-stone-900 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white hover:bg-stone-800"
                      onClick={() => {
                        persistDraft({
                          ...draft,
                          displayName: heroName,
                          subtitleOverride: heroSub,
                        });
                        setEditingSection(null);
                      }}
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      className="rounded-full border border-stone-300 bg-white px-4 py-2 text-xs font-bold uppercase tracking-wide text-stone-800 hover:bg-stone-50"
                      onClick={() => setEditingSection(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ position: "relative", zIndex: 1, maxWidth: "800px", margin: "0 auto" }}>
                <p
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: STUDIOS_MUTED,
                    marginBottom: "12px",
                  }}
                >
                  {eyebrow}
                </p>
                <h1
                  style={{
                    fontSize: "clamp(32px, 5vw, 48px)",
                    fontWeight: 700,
                    letterSpacing: "-1.2px",
                    lineHeight: 1.08,
                    margin: "0 0 16px",
                    color: STUDIOS_INK,
                  }}
                >
                  {mergedProvider.displayName ?? "Studio"}
                </h1>
                <p style={{ fontSize: "17px", lineHeight: 1.55, color: STUDIOS_MUTED, margin: 0 }}>{subtitle}</p>
                <div style={{ marginTop: "28px", display: "flex", justifyContent: "center", gap: "12px", flexWrap: "wrap" }}>
                  <Link
                    href="/studios"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      padding: "12px 22px",
                      borderRadius: "999px",
                      background: "#fff",
                      color: STUDIOS_INK,
                      fontSize: "14px",
                      fontWeight: 600,
                      textDecoration: "none",
                      border: `1px solid ${STUDIOS_LINE}`,
                    }}
                  >
                    ← All studios
                  </Link>
                </div>
              </div>
            )}
          </section>

          {showStory && mergedStory ? (
            <section
              id="team"
              className="scroll-mt-28"
              style={{
                position: "relative",
                padding: "48px 24px 36px",
                borderBottom: "1px solid rgba(0,0,0,0.06)",
                background: "linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(250,247,241,0.9) 100%)",
              }}
            >
              {draftActive && editingSection !== "story" ? (
                <button
                  type="button"
                  aria-label="Edit story section"
                  className="absolute right-4 top-8 z-10 rounded-full border border-stone-200 bg-white p-2.5 shadow-sm hover:bg-stone-50 md:right-10"
                  onClick={() => setEditingSection("story")}
                >
                  <Pencil className="h-4 w-4 text-stone-600" aria-hidden />
                </button>
              ) : null}
              <div style={{ maxWidth: "900px", margin: "0 auto" }}>
                {draftActive && editingSection === "story" ? (
                  <div className="rounded-2xl border border-teal-200/90 bg-white p-5 shadow-sm">
                    <p className="mb-3 text-[11px] font-bold uppercase tracking-wide text-stone-500">Edit story</p>
                    <label className="mb-3 block text-[11px] font-bold uppercase text-stone-500">
                      Headline
                      <input
                        className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-lg font-semibold text-stone-900"
                        value={storyTitle}
                        onChange={(e) => setStoryTitle(e.target.value)}
                      />
                    </label>
                    <label className="mb-4 block text-[11px] font-bold uppercase text-stone-500">
                      Bullets (one per line)
                      <textarea
                        className="mt-1 min-h-[120px] w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800"
                        value={storyBullets}
                        onChange={(e) => setStoryBullets(e.target.value)}
                      />
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="rounded-full bg-stone-900 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white hover:bg-stone-800"
                        onClick={() => {
                          persistDraft({
                            ...draft,
                            storyTitle,
                            storyBulletsText: storyBullets,
                          });
                          setEditingSection(null);
                        }}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        className="rounded-full border border-stone-300 bg-white px-4 py-2 text-xs font-bold uppercase tracking-wide text-stone-800 hover:bg-stone-50"
                        onClick={() => setEditingSection(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h2
                      style={{
                        fontSize: "clamp(22px, 3vw, 28px)",
                        fontWeight: 700,
                        color: STUDIOS_INK,
                        margin: "0 0 18px",
                        letterSpacing: "-0.3px",
                      }}
                    >
                      {mergedStory.title}
                    </h2>
                    <ul style={{ margin: 0, paddingLeft: "22px", display: "flex", flexDirection: "column", gap: "12px" }}>
                      {(Array.isArray(mergedStory.bullets) ? mergedStory.bullets : []).map((line) => (
                        <li key={line} style={{ fontSize: "16px", lineHeight: 1.55, color: "#404040" }}>
                          {line}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </section>
          ) : null}

          <section
            id="portfolio"
            className="scroll-mt-28"
            style={{
              position: "relative",
              padding: "0 24px 40px",
              maxWidth: "1100px",
              margin: "0 auto",
            }}
          >
            {draftActive && editingSection !== "portfolio" ? (
              <button
                type="button"
                aria-label="Edit profile section"
                className="absolute right-4 top-2 z-10 rounded-full border border-stone-200 bg-white p-2.5 shadow-sm hover:bg-stone-50 md:right-8"
                onClick={() => setEditingSection("portfolio")}
              >
                <Pencil className="h-4 w-4 text-stone-600" aria-hidden />
              </button>
            ) : null}
            {draftActive && editingSection === "portfolio" ? (
              <div className="mx-auto max-w-[640px] rounded-2xl border border-teal-200/90 bg-white p-5 shadow-sm">
                <p className="mb-3 text-[11px] font-bold uppercase tracking-wide text-stone-500">Edit profile</p>
                <label className="mb-3 block text-[11px] font-bold uppercase text-stone-500">
                  Bio
                  <textarea
                    className="mt-1 min-h-[100px] w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800"
                    value={profBio}
                    onChange={(e) => setProfBio(e.target.value)}
                  />
                </label>
                <label className="mb-4 block text-[11px] font-bold uppercase text-stone-500">
                  Profile image URL
                  <input
                    className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800"
                    value={profImg}
                    onChange={(e) => setProfImg(e.target.value)}
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-full bg-stone-900 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white hover:bg-stone-800"
                    onClick={() => {
                      persistDraft({
                        ...draft,
                        bio: profBio,
                        profileImageUrl: profImg,
                      });
                      setEditingSection(null);
                    }}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-stone-300 bg-white px-4 py-2 text-xs font-bold uppercase tracking-wide text-stone-800 hover:bg-stone-50"
                    onClick={() => setEditingSection(null)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
                  gap: "40px",
                  alignItems: "center",
                }}
              >
                <TrainerPhoto displayName={mergedProvider.displayName ?? "Studio"} imageUrl={mergedProvider.imageUrl} accent={accent} />
                <div>
                  <h2
                    style={{
                      fontSize: "13px",
                      fontWeight: 700,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: STUDIOS_MUTED,
                      margin: "0 0 10px",
                    }}
                  >
                    Profile
                  </h2>
                  <p style={{ fontSize: "clamp(18px, 2.5vw, 22px)", lineHeight: 1.55, color: "#404040", margin: 0 }}>
                    {mergedProvider.bio ??
                      `${mergedProvider.displayName ?? "This studio"} offers ${mergedCategoryLabel.toLowerCase()} services through AIH Studios.`}
                  </p>
                </div>
              </div>
            )}
          </section>

          <StudioPageMainColumns
            nav={publicNav && publicNav.length > 0 ? publicNav : NAV_LIVE}
            variant="live"
            provider={mergedProvider}
            offers={safeOffers}
            liveInlineEdit={liveInlineEdit}
          />
          {publicNav && publicNav.length > 0 ? (
            <div id="vmb-salons" className="scroll-mt-28 mx-auto max-w-[1100px] px-6 pb-10 pt-4">
              <p style={{ fontSize: "14px", color: STUDIOS_MUTED, margin: 0 }}>
                VMB Salons — network placement and partner links will appear here when enabled.
              </p>
            </div>
          ) : null}
        </>
      )}
    </>
  );
}
