"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Building2, Mail, MapPin, Pencil, Phone, User } from "lucide-react";
import type { ApplyStudioHeroFields, ApplyStudioIntro } from "@/lib/studios/applyPreview";
import {
  STUDIO_EDITOR_SECTION_HERO_CONTACT,
  sanitizeApplyStudioHeroFields,
} from "@/lib/studios/applyPreview";
import { STUDIOS_INK, STUDIOS_LINE } from "@/lib/studios/visual";
import type { StudioBuilderNavMode } from "@/components/studios/StudioBuilderNavModeContext";
import { useStudioBuilderShellOptional } from "@/components/studios/StudioBuilderNavModeContext";
import { StudioTopNav } from "@/components/studios/StudioTopNav";
import { TrainerPhoto } from "./TrainerPhoto";
import { StudioHeroIntroColumn } from "./StudioHeroIntroColumn";

const DEFAULT_DRAFT_STORAGE_KEY = "amih_studios_apply_hero_v1";

type FieldKey = keyof ApplyStudioHeroFields;

/** Publish readiness checks these hero rows (maps to studio name + street address in UI). */
export const STUDIO_HERO_PUBLISH_REQUIRED_KEYS = [
  "fullName",
  "businessName",
  "email",
  "phone",
  "physicalAddress",
] as const satisfies readonly FieldKey[];

const FIELD_ROW: Record<
  FieldKey,
  {
    icon: typeof User;
    placeholder: string;
    inputType?: string;
    inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
    autoComplete?: string;
    maxLength: number;
  }
> = {
  fullName: {
    icon: User,
    placeholder: "Full name — from profile or type here",
    autoComplete: "name",
    maxLength: 120,
  },
  businessName: {
    icon: Building2,
    placeholder: "Business or studio name",
    autoComplete: "organization",
    maxLength: 120,
  },
  email: {
    icon: Mail,
    placeholder: "Email",
    inputType: "email",
    autoComplete: "email",
    maxLength: 254,
  },
  phone: {
    icon: Phone,
    placeholder: "Phone",
    inputMode: "tel",
    autoComplete: "tel",
    maxLength: 80,
  },
  physicalAddress: {
    icon: MapPin,
    placeholder: "Street, city, state, ZIP",
    autoComplete: "street-address",
    maxLength: 300,
  },
};

/** Edit / preview stack order: studio → owner → contact → location */
const HERO_STACK_ORDER = ["businessName", "fullName", "email", "phone", "physicalAddress"] as const satisfies readonly FieldKey[];

const HERO_ROW_SHORT_LABEL: Record<FieldKey, string> = {
  businessName: "Studio name",
  fullName: "Owner",
  email: "Email",
  phone: "Phone",
  physicalAddress: "Location",
};

function normalizeHeroForSave(hero: ApplyStudioHeroFields): ApplyStudioHeroFields {
  const base = sanitizeApplyStudioHeroFields(hero);
  return (Object.keys(FIELD_ROW) as FieldKey[]).reduce((acc, k) => {
    acc[k] = k === "phone" ? base[k] : base[k].trim();
    return acc;
  }, {} as ApplyStudioHeroFields);
}

function trimmedRow(hero: ApplyStudioHeroFields, k: FieldKey): string {
  return (hero[k] ?? "").trim();
}

/** Confirmed only when non-empty and user explicitly saved ✅ (`stored[field] === true`). Profile prefill never auto-confirms. */
function explicitConfirmedFromStorage(
  hero: ApplyStudioHeroFields,
  stored?: Partial<Record<FieldKey, boolean>> | null,
): Record<FieldKey, boolean> {
  const keys = Object.keys(FIELD_ROW) as FieldKey[];
  const acc = {} as Record<FieldKey, boolean>;
  for (const k of keys) {
    const hasValue = trimmedRow(hero, k).length > 0;
    acc[k] = hasValue && stored?.[k] === true;
  }
  return acc;
}

export function isHeroContactPublishReady(
  hero: ApplyStudioHeroFields,
  confirmedFields: Record<FieldKey, boolean>,
): boolean {
  return STUDIO_HERO_PUBLISH_REQUIRED_KEYS.every((key) => {
    const value = String(hero[key] ?? "").trim();
    return value.length > 0 && confirmedFields[key] === true;
  });
}

function clampConfirmedForEmptyHero(
  hero: ApplyStudioHeroFields,
  confirmed: Record<FieldKey, boolean>,
): Record<FieldKey, boolean> {
  const keys = Object.keys(FIELD_ROW) as FieldKey[];
  const next = { ...confirmed };
  for (const k of keys) {
    if (!trimmedRow(hero, k)) next[k] = false;
  }
  return next;
}

type HeroDraftBundleV2 = {
  v: 2;
  hero: ApplyStudioHeroFields;
  confirmed: Record<FieldKey, boolean>;
  heroContactHiddenOnPublish?: boolean;
};

function parseHeroDraftStorage(
  raw: string | null,
  initialHero: ApplyStudioHeroFields,
): {
  hero: ApplyStudioHeroFields;
  storedConfirmed?: Partial<Record<FieldKey, boolean>>;
  heroContactHiddenOnPublish: boolean;
} {
  if (!raw) {
    return {
      hero: normalizeHeroForSave(sanitizeApplyStudioHeroFields(initialHero)),
      storedConfirmed: undefined,
      heroContactHiddenOnPublish: false,
    };
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (
      parsed &&
      typeof parsed === "object" &&
      "v" in parsed &&
      (parsed as { v?: unknown }).v === 2 &&
      "hero" in parsed &&
      typeof (parsed as { hero?: unknown }).hero === "object"
    ) {
      const b = parsed as HeroDraftBundleV2;
      const mergedHero = normalizeHeroForSave(
        sanitizeApplyStudioHeroFields({ ...initialHero, ...(b.hero as Partial<ApplyStudioHeroFields>) }),
      );
      return {
        hero: mergedHero,
        storedConfirmed: b.confirmed,
        heroContactHiddenOnPublish: Boolean(b.heroContactHiddenOnPublish),
      };
    }
    const flat = parsed as Partial<ApplyStudioHeroFields> | null;
    const mergedHero = normalizeHeroForSave(sanitizeApplyStudioHeroFields({ ...initialHero, ...flat }));
    return {
      hero: mergedHero,
      storedConfirmed: undefined,
      heroContactHiddenOnPublish: false,
    };
  } catch {
    return {
      hero: normalizeHeroForSave(sanitizeApplyStudioHeroFields(initialHero)),
      storedConfirmed: undefined,
      heroContactHiddenOnPublish: false,
    };
  }
}

export function ApplyStudioHero({
  initialHero,
  displayName,
  imageUrl,
  accent,
  previewSlug: _previewSlug = null,
  onHeroCommit,
  draftStorageKey = DEFAULT_DRAFT_STORAGE_KEY,
  studioViewMode,
  initialIntro,
  foldImageUrl,
}: {
  initialHero: ApplyStudioHeroFields;
  displayName: string;
  imageUrl?: string | null;
  accent: string;
  previewSlug?: string | null;
  onHeroCommit?: (next: ApplyStudioHeroFields) => void;
  draftStorageKey?: string;
  studioViewMode: StudioBuilderNavMode;
  initialIntro: ApplyStudioIntro;
  foldImageUrl: string;
}) {
  void _previewSlug;
  const heroStorageKey = draftStorageKey;
  const [hero, setHero] = useState<ApplyStudioHeroFields>(() =>
    normalizeHeroForSave(sanitizeApplyStudioHeroFields(initialHero)),
  );
  const [confirmedFields, setConfirmedFields] = useState<Record<FieldKey, boolean>>(() =>
    explicitConfirmedFromStorage(normalizeHeroForSave(sanitizeApplyStudioHeroFields(initialHero)), undefined),
  );
  const [heroContactHiddenOnPublish, setHeroContactHiddenOnPublish] = useState(false);
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [modalKey, setModalKey] = useState<FieldKey | null>(null);
  const [modalDraft, setModalDraft] = useState("");

  const commitDraft = useCallback(
    (bundle: {
      hero: ApplyStudioHeroFields;
      confirmed: Record<FieldKey, boolean>;
      heroContactHiddenOnPublish: boolean;
    }) => {
      const confirmed = clampConfirmedForEmptyHero(bundle.hero, bundle.confirmed);
      setHero(bundle.hero);
      setConfirmedFields(confirmed);
      setHeroContactHiddenOnPublish(bundle.heroContactHiddenOnPublish);
      onHeroCommit?.(bundle.hero);
      try {
        const payload: HeroDraftBundleV2 = {
          v: 2,
          hero: bundle.hero,
          confirmed,
          heroContactHiddenOnPublish: bundle.heroContactHiddenOnPublish,
        };
        window.localStorage.setItem(heroStorageKey, JSON.stringify(payload));
      } catch {
        /* ignore */
      }
    },
    [heroStorageKey, onHeroCommit],
  );

  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(heroStorageKey) : null;
      const parsed = parseHeroDraftStorage(raw, initialHero);
      const confirmed = explicitConfirmedFromStorage(parsed.hero, parsed.storedConfirmed);
      setHero(parsed.hero);
      setConfirmedFields(confirmed);
      setHeroContactHiddenOnPublish(parsed.heroContactHiddenOnPublish);
      queueMicrotask(() => onHeroCommit?.(parsed.hero));
    } catch {
      /* ignore */
    } finally {
      setDraftHydrated(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional single hydrate
  }, []);

  const openModal = useCallback((key: FieldKey) => {
    setModalKey(key);
    setModalDraft(hero[key] ?? "");
  }, [hero]);

  const closeModal = useCallback(() => {
    setModalKey(null);
    setModalDraft("");
  }, []);

  const saveModal = useCallback(() => {
    if (!modalKey || !draftHydrated) return;
    const meta = FIELD_ROW[modalKey];
    let v = modalDraft;
    if (modalKey !== "phone") v = v.trim();
    if (v.length > meta.maxLength) v = v.slice(0, meta.maxLength);
    const nextHero = normalizeHeroForSave({ ...hero, [modalKey]: v });
    /** Pencil save clears confirmation for that row until the creator taps ✅ again. */
    const nextConfirmed = { ...confirmedFields, [modalKey]: false };
    commitDraft({
      hero: nextHero,
      confirmed: nextConfirmed,
      heroContactHiddenOnPublish,
    });
    closeModal();
  }, [
    closeModal,
    commitDraft,
    confirmedFields,
    hero,
    heroContactHiddenOnPublish,
    draftHydrated,
    modalDraft,
    modalKey,
  ]);

  const heroContactPublishReady = isHeroContactPublishReady(hero, confirmedFields);
  const shell = useStudioBuilderShellOptional();

  useEffect(() => {
    if (studioViewMode !== "edit") {
      setModalKey(null);
      setModalDraft("");
    }
  }, [studioViewMode]);

  const listingMode = studioViewMode !== "edit";

  if (listingMode) {
    const topNavMode = studioViewMode === "published" ? "published" : "preview";
    return (
      <section
        className="relative w-full overflow-hidden pb-5 pt-0 sm:pb-6"
        data-studio-editor-section={STUDIO_EDITOR_SECTION_HERO_CONTACT}
        data-hero-contact-hidden-on-publish={heroContactHiddenOnPublish ? "true" : "false"}
        data-hero-contact-publish-ready={heroContactPublishReady ? "true" : "false"}
        aria-labelledby="studio-public-heading"
      >
        <div className="sticky top-0 z-[80] w-full border-b border-white/10 bg-stone-950 shadow-[0_6px_24px_rgba(0,0,0,0.2)]">
          <button
            type="button"
            onClick={() => shell?.setMode("edit")}
            className="flex w-full items-center justify-center px-4 py-3.5 text-center text-[11px] font-bold uppercase tracking-[0.26em] text-white transition hover:bg-stone-900 sm:text-xs sm:tracking-[0.28em]"
          >
            RETURN TO STUDIO EDIT
          </button>
        </div>

        <div
          className="pointer-events-none absolute left-0 top-24 h-72 w-72 rounded-full blur-3xl sm:top-28"
          style={{ background: "rgba(255, 218, 230, 0.35)" }}
        />
        <div
          className="pointer-events-none absolute right-0 top-16 h-64 w-64 rounded-full blur-3xl"
          style={{ background: "rgba(230, 240, 255, 0.4)" }}
        />

        <div className="relative z-10 mx-auto max-w-6xl px-4 pt-4 sm:px-6 sm:pt-5">
          <StudioTopNav mode={topNavMode} omitAnchors={["#services"]} />

          <div className="mb-3 flex justify-center sm:mb-4">
            <span
              className={`rounded-full px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.22em] shadow-sm ${
                studioViewMode === "published"
                  ? "bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200/90"
                  : "bg-amber-100 text-amber-950 ring-1 ring-amber-200/80"
              }`}
            >
              {studioViewMode === "published" ? "Published listing" : "Preview"}
            </span>
          </div>

          <section id="about" className="scroll-mt-24">
            <div
              className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-[0_8px_30px_-10px_rgba(0,0,0,0.08)] ring-1 ring-black/[0.02]"
              style={{ borderColor: STUDIOS_LINE }}
            >
              <div className="grid grid-cols-1 md:grid-cols-[35%_30%_35%] md:items-start">
                <div className="flex flex-col items-start justify-start border-b border-black/[0.06] px-5 pb-5 pt-5 md:border-b-0 md:border-r md:px-6 md:py-6 md:pb-6 md:pr-6 md:pt-6">
                  <div className="relative w-full max-w-[280px]">
                    <TrainerPhoto
                      displayName={displayName}
                      imageUrl={imageUrl}
                      accent={accent}
                      compact
                    />
                    <div className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-inset ring-black/[0.06]" />
                  </div>
                </div>

                <div className="flex min-h-0 min-w-0 flex-col items-start gap-2.5 border-b border-black/[0.06] px-5 pb-5 pt-5 text-left md:gap-3 md:border-b-0 md:border-r md:border-black/[0.06] md:px-6 md:py-6 md:pb-6 md:pt-6">
                  <h1
                    id="studio-public-heading"
                    className="text-[1.5rem] font-bold leading-tight tracking-tight text-stone-900 md:text-[1.85rem]"
                    style={{ color: STUDIOS_INK }}
                  >
                    {hero.businessName?.trim() || "Studio"}
                  </h1>

                  {hero.fullName?.trim() ? (
                    <div className="flex items-start gap-2.5 text-[15px] leading-snug text-stone-600">
                      <User className="mt-0.5 h-4 w-4 shrink-0 text-stone-400" strokeWidth={2} aria-hidden />
                      <span>{hero.fullName.trim()}</span>
                    </div>
                  ) : null}

                  <div className="flex items-start gap-2.5 text-[15px] leading-snug text-stone-600">
                    <Mail className="mt-0.5 h-4 w-4 shrink-0 text-stone-400" strokeWidth={2} aria-hidden />
                    <span className="min-w-0 break-words">{hero.email?.trim() || "—"}</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-[15px] leading-snug text-stone-600">
                    <Phone className="mt-0.5 h-4 w-4 shrink-0 text-stone-400" strokeWidth={2} aria-hidden />
                    <span className="min-w-0">{hero.phone?.trim() || "—"}</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-[15px] leading-snug text-stone-600">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-stone-400" strokeWidth={2} aria-hidden />
                    <span className="min-w-0">{hero.physicalAddress?.trim() || "—"}</span>
                  </div>
                </div>

                <div className="min-w-0 border-t border-black/[0.06] bg-stone-50/80 px-4 py-4 sm:px-5 sm:py-5 md:border-t-0 md:border-l md:border-black/[0.06] md:px-5 md:py-6 lg:px-6">
                  <StudioHeroIntroColumn
                    initialIntro={initialIntro}
                    draftStorageKey={draftStorageKey ?? DEFAULT_DRAFT_STORAGE_KEY}
                    foldImageUrl={foldImageUrl}
                    showEditChrome={false}
                  />
                </div>
              </div>
            </div>
          </section>
        </div>
      </section>
    );
  }

  return (
    <section
      className="relative overflow-hidden px-4 pb-4 pt-4 sm:px-6 sm:pb-5 sm:pt-5"
      data-studio-editor-section={STUDIO_EDITOR_SECTION_HERO_CONTACT}
      data-hero-contact-hidden-on-publish={heroContactHiddenOnPublish ? "true" : "false"}
      data-hero-contact-publish-ready={heroContactPublishReady ? "true" : "false"}
      aria-labelledby="studio-name-display"
    >
      <div
        className="pointer-events-none absolute -left-32 top-14 h-72 w-72 rounded-full blur-3xl"
        style={{ background: "rgba(255, 218, 230, 0.35)" }}
      />
      <div
        className="pointer-events-none absolute -right-24 top-0 h-64 w-64 rounded-full blur-3xl"
        style={{ background: "rgba(230, 240, 255, 0.4)" }}
      />

      <div className="relative z-10 mx-auto max-w-6xl">
        <StudioTopNav mode="edit" omitAnchors={["#services"]} />

        <div
          id={studioViewMode === "edit" ? "contact-info" : undefined}
          className={`mt-3 overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-[0_10px_36px_-12px_rgba(0,0,0,0.1)] ring-1 ring-black/[0.02] ${studioViewMode === "edit" ? "scroll-mt-24" : ""}`}
          style={{ borderColor: STUDIOS_LINE }}
        >
          <div className="grid grid-cols-1 md:grid-cols-[35%_30%_35%] md:items-start">
            <div className="flex flex-col items-start justify-start border-b border-black/[0.06] bg-gradient-to-b from-stone-50/80 to-white px-5 pb-5 pt-5 md:border-b-0 md:border-r md:px-6 md:py-6 md:pb-6 md:pr-6 md:pt-6">
              <div className="relative w-full max-w-[280px]">
                <TrainerPhoto displayName={displayName} imageUrl={imageUrl} accent={accent} compact />
                <div className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-inset ring-black/[0.06]" />
                <Link
                  href="/settings"
                  aria-label="Edit photo"
                  title="Edit photo"
                  className="absolute bottom-2 right-2 flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-white text-stone-800 shadow-md ring-1 ring-black/[0.04] transition hover:bg-stone-50"
                >
                  <Pencil className="h-3.5 w-3.5 opacity-80" strokeWidth={2} />
                </Link>
              </div>
              <p className="mt-2 max-w-[280px] text-[10px] leading-snug text-stone-500">
                Profile photo from Settings.
              </p>
            </div>

            <div className="flex min-h-0 min-w-0 flex-col items-stretch border-b border-black/[0.06] px-5 pb-5 pt-5 md:border-b-0 md:border-r md:border-black/[0.06] md:px-6 md:py-6 md:pb-6 md:pt-6">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-stone-500">Studio profile</p>
              <span id="hero-contact-heading" className="sr-only">
                Hero and contact — edit each field and confirm to publish
              </span>

              <p className="mt-1 text-xs leading-snug text-stone-600">
                Saves in this browser. Confirm each field with{" "}
                <span className="whitespace-nowrap font-semibold text-stone-800" aria-hidden>
                  ✅
                </span>{" "}
                before preview or publish.
              </p>

              <ul className="mt-3 flex flex-col gap-2" role="list">
                {HERO_STACK_ORDER.map((key) => {
                  const meta = FIELD_ROW[key];
                  const Icon = meta.icon;
                  const val = trimmedRow(hero, key);
                  const empty = val.length === 0;
                  const display = empty ? "—" : val;
                  const hasValue = !empty;
                  const isConfirmed = hasValue && confirmedFields[key] === true;
                  const isStudioTitle = key === "businessName";

                  return (
                    <li
                      key={key}
                      className={`rounded-xl px-0 py-1.5 transition-colors ${isConfirmed ? "bg-green-50/45 ring-1 ring-green-100/70" : ""}`}
                    >
                      <div className="flex items-start gap-2.5">
                        <Icon className="mt-1 h-4 w-4 shrink-0 text-stone-400" strokeWidth={2} aria-hidden />
                        <div className="flex min-w-0 flex-1 items-start justify-between gap-2">
                          <div className="min-w-0">
                            {!isStudioTitle ? (
                              <p className="text-[11px] font-medium text-stone-500">{HERO_ROW_SHORT_LABEL[key]}</p>
                            ) : null}
                            {isStudioTitle ? (
                              <h1
                                id="studio-name-display"
                                className="break-words text-xl font-bold leading-tight tracking-tight text-stone-900 md:text-2xl"
                                style={{ color: STUDIOS_INK }}
                              >
                                {display}
                              </h1>
                            ) : (
                              <p
                                className={`mt-0.5 break-words font-medium leading-snug text-stone-800 ${key === "physicalAddress" ? "text-[14px]" : "text-[15px]"}`}
                                style={{ color: STUDIOS_INK }}
                              >
                                {display}
                              </p>
                            )}
                          </div>
                          <div className="flex shrink-0 items-center gap-1.5">
                            <button
                              type="button"
                              aria-label={`Edit ${meta.placeholder}`}
                              title={empty ? "Add a value for this row." : undefined}
                              onClick={() => openModal(key)}
                              className={`rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] shadow-sm transition ${
                                empty
                                  ? "bg-orange-500 text-white hover:bg-orange-600"
                                  : "border border-black/[0.08] bg-white text-stone-800 hover:bg-stone-50"
                              }`}
                            >
                              Edit
                            </button>
                            {hasValue ? (
                              <button
                                type="button"
                                aria-label={
                                  isConfirmed ? `${meta.placeholder}: confirmed` : `${meta.placeholder}: tap to confirm`
                                }
                                aria-pressed={isConfirmed}
                                onClick={() =>
                                  commitDraft({
                                    hero,
                                    confirmed: { ...confirmedFields, [key]: true },
                                    heroContactHiddenOnPublish,
                                  })
                                }
                                className={`flex min-h-9 min-w-9 items-center justify-center rounded-lg text-[1.35rem] leading-none transition ${
                                  isConfirmed
                                    ? "text-green-700 hover:bg-green-50/90"
                                    : "text-green-600 hover:bg-green-50/70"
                                }`}
                              >
                                <span aria-hidden>✅</span>
                              </button>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>

              {heroContactPublishReady ? (
                <p className="mt-2 text-xs font-medium text-green-800">All required fields confirmed.</p>
              ) : null}

              <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-black/[0.06] pt-4">
                <button
                  type="button"
                  disabled={!heroContactPublishReady}
                  onClick={() => shell?.setMode("preview")}
                  className={`rounded-full border-2 px-6 py-2 text-[10px] font-bold uppercase tracking-[0.14em] transition ${
                    heroContactPublishReady
                      ? "border-stone-900 bg-white text-stone-900 hover:bg-stone-50"
                      : "cursor-not-allowed border-stone-200 bg-stone-50 text-stone-400 opacity-75"
                  }`}
                >
                  Preview
                </button>
                <button
                  type="button"
                  disabled={!heroContactPublishReady}
                  onClick={() => shell?.setMode("published")}
                  className={`rounded-full px-6 py-2 text-[10px] font-bold uppercase tracking-[0.14em] shadow-sm transition ${
                    heroContactPublishReady
                      ? "bg-stone-900 text-white hover:bg-stone-800"
                      : "cursor-not-allowed bg-stone-200 text-stone-400 opacity-75"
                  }`}
                >
                  Publish
                </button>
              </div>
            </div>

            <div className="min-w-0 border-t border-black/[0.06] bg-stone-50/80 px-4 py-4 sm:px-5 sm:py-5 md:border-t-0 md:border-l md:border-black/[0.06] md:px-5 md:py-6 lg:px-6">
              <StudioHeroIntroColumn
                initialIntro={initialIntro}
                draftStorageKey={draftStorageKey ?? DEFAULT_DRAFT_STORAGE_KEY}
                foldImageUrl={foldImageUrl}
                showEditChrome={studioViewMode === "edit"}
              />
            </div>
          </div>
        </div>
      </div>

      {modalKey ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/45 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="hero-field-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-black/[0.08] bg-white p-6 shadow-2xl ring-1 ring-black/[0.04]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="hero-field-modal-title" className="text-lg font-bold text-stone-900">
              Edit {FIELD_ROW[modalKey].placeholder}
            </h3>
            <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-stone-500">Current</p>
            <p className="mt-1 rounded-lg bg-stone-50 px-3 py-2 text-sm text-stone-700">{hero[modalKey]?.trim() || "—"}</p>
            <label className="mt-4 block text-xs font-bold uppercase tracking-wide text-stone-500">
              New value
              <input
                type={FIELD_ROW[modalKey].inputType ?? "text"}
                inputMode={FIELD_ROW[modalKey].inputMode}
                autoComplete={FIELD_ROW[modalKey].autoComplete}
                maxLength={FIELD_ROW[modalKey].maxLength}
                value={modalDraft}
                onChange={(e) => setModalDraft(e.target.value)}
                className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2.5 text-base font-medium text-stone-900 outline-none focus:ring-2 focus:ring-stone-300"
                style={{ color: STUDIOS_INK }}
              />
            </label>
            <p className="mt-1 text-[11px] text-stone-500">
              {modalDraft.length} / {FIELD_ROW[modalKey].maxLength} characters
            </p>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-800 hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveModal}
                className="rounded-full bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-800"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
