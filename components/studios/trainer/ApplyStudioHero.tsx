"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Building2, Mail, MapPin, Pencil, Phone, User } from "lucide-react";
import type { ApplyStudioHeroFields } from "@/lib/studios/applyPreview";
import {
  STUDIO_EDITOR_SECTION_HERO_CONTACT,
  sanitizeApplyStudioHeroFields,
} from "@/lib/studios/applyPreview";
import { STUDIOS_INK, STUDIOS_LINE } from "@/lib/studios/visual";
import { StudioEditorTopNav } from "@/components/studios/StudioEditorTopNav";
import type { StudioEditorNavItem } from "@/components/studios/StudioEditorTopNav";
import { TrainerPhoto } from "./TrainerPhoto";

const DEFAULT_DRAFT_STORAGE_KEY = "amih_studios_apply_hero_v1";

type FieldKey = keyof ApplyStudioHeroFields;

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

/**
 * Empty → never confirmed (❎).
 * Value exactly matches profile baseline → confirmed unless user explicitly chose ❎ (`stored === false`).
 * Any other filled value → confirmed only after explicit ✅ (`stored === true`).
 */
function resolveRowConfirmedState(
  hero: ApplyStudioHeroFields,
  profileBaseline: ApplyStudioHeroFields,
  stored?: Partial<Record<FieldKey, boolean>> | null,
): Record<FieldKey, boolean> {
  const keys = Object.keys(FIELD_ROW) as FieldKey[];
  const acc = {} as Record<FieldKey, boolean>;
  for (const k of keys) {
    const v = trimmedRow(hero, k);
    if (!v.length) {
      acc[k] = false;
      continue;
    }
    const base = trimmedRow(profileBaseline, k);
    const matchesProfile = v === base;
    const flag = stored?.[k];
    if (matchesProfile) {
      acc[k] = flag !== false;
    } else {
      acc[k] = flag === true;
    }
  }
  return acc;
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
  editorNavItems,
}: {
  initialHero: ApplyStudioHeroFields;
  displayName: string;
  imageUrl?: string | null;
  accent: string;
  previewSlug?: string | null;
  onHeroCommit?: (next: ApplyStudioHeroFields) => void;
  draftStorageKey?: string;
  editorNavItems?: readonly StudioEditorNavItem[];
}) {
  void _previewSlug;
  const heroStorageKey = draftStorageKey;
  const [profileBaseline] = useState(() =>
    normalizeHeroForSave(sanitizeApplyStudioHeroFields(initialHero)),
  );
  const [hero, setHero] = useState<ApplyStudioHeroFields>(() =>
    normalizeHeroForSave(sanitizeApplyStudioHeroFields(initialHero)),
  );
  const [rowConfirmed, setRowConfirmed] = useState<Record<FieldKey, boolean>>(() =>
    resolveRowConfirmedState(
      normalizeHeroForSave(sanitizeApplyStudioHeroFields(initialHero)),
      profileBaseline,
      undefined,
    ),
  );
  const [heroContactHiddenOnPublish, setHeroContactHiddenOnPublish] = useState(false);
  const [heroReady, setHeroReady] = useState(false);
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
      setRowConfirmed(confirmed);
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
      const confirmed = resolveRowConfirmedState(parsed.hero, profileBaseline, parsed.storedConfirmed);
      setHero(parsed.hero);
      setRowConfirmed(confirmed);
      setHeroContactHiddenOnPublish(parsed.heroContactHiddenOnPublish);
      queueMicrotask(() => onHeroCommit?.(parsed.hero));
    } catch {
      /* ignore */
    } finally {
      setHeroReady(true);
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
    if (!modalKey || !heroReady) return;
    const meta = FIELD_ROW[modalKey];
    let v = modalDraft;
    if (modalKey !== "phone") v = v.trim();
    if (v.length > meta.maxLength) v = v.slice(0, meta.maxLength);
    const nextHero = normalizeHeroForSave({ ...hero, [modalKey]: v });
    /** Editing clears confirmation until the creator taps ✅ again. */
    const nextConfirmed = { ...rowConfirmed, [modalKey]: false };
    commitDraft({
      hero: nextHero,
      confirmed: nextConfirmed,
      heroContactHiddenOnPublish,
    });
    closeModal();
  }, [
    closeModal,
    commitDraft,
    hero,
    heroContactHiddenOnPublish,
    heroReady,
    modalDraft,
    modalKey,
    rowConfirmed,
  ]);

  const allConfirmed = (Object.keys(FIELD_ROW) as FieldKey[]).every((k) => rowConfirmed[k]);

  return (
    <section
      className="relative overflow-hidden px-5 pb-6 pt-5 sm:px-8 sm:pb-8 sm:pt-6"
      data-studio-editor-section={STUDIO_EDITOR_SECTION_HERO_CONTACT}
      data-hero-contact-hidden-on-publish={heroContactHiddenOnPublish ? "true" : "false"}
      aria-labelledby="hero-contact-heading"
    >
      <div
        className="pointer-events-none absolute -left-32 top-14 h-72 w-72 rounded-full blur-3xl"
        style={{ background: "rgba(255, 218, 230, 0.35)" }}
      />
      <div
        className="pointer-events-none absolute -right-24 top-0 h-64 w-64 rounded-full blur-3xl"
        style={{ background: "rgba(230, 240, 255, 0.4)" }}
      />

      <div className="relative z-10 mx-auto max-w-5xl">
        <StudioEditorTopNav items={editorNavItems} />

        <div
          id="about"
          className="mt-4 overflow-hidden rounded-3xl border border-black/[0.07] bg-white shadow-[0_24px_60px_-12px_rgba(0,0,0,0.12)] ring-1 ring-black/[0.03]"
          style={{ borderColor: STUDIOS_LINE }}
        >
          <div className="grid md:grid-cols-[1fr_1.15fr] md:items-stretch">
            <div className="relative flex flex-col items-center justify-center border-b border-black/[0.06] bg-gradient-to-b from-stone-50/90 to-white px-6 py-6 md:border-b-0 md:border-r md:px-7 md:py-6">
              <div className="mb-4 w-full max-w-[300px] text-center">
                <p className="text-[11px] font-bold uppercase tracking-wide text-stone-500">Studio name</p>
                <p
                  id="studio-name-display"
                  className="mt-1 break-words text-lg font-bold leading-snug tracking-tight text-stone-900 sm:text-xl"
                  style={{ color: STUDIOS_INK }}
                >
                  {hero.businessName?.trim() ? hero.businessName.trim() : "—"}
                </p>
                <p className="mt-1 text-[10px] leading-snug text-stone-500">
                  Pulled from business or studio name — edit that row on the right.
                </p>
              </div>
              <div className="relative w-full max-w-[300px]">
                <TrainerPhoto displayName={displayName} imageUrl={imageUrl} accent={accent} />
                <div className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-inset ring-black/[0.06]" />
                <Link
                  href="/settings"
                  aria-label="Edit photo"
                  title="Edit photo"
                  className="absolute bottom-2 right-2 flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white text-stone-800 shadow-md ring-1 ring-black/[0.04] transition hover:bg-stone-50"
                >
                  <Pencil className="h-4 w-4 opacity-80" strokeWidth={2} />
                </Link>
              </div>
              <p className="mt-2 max-w-[260px] text-center text-[11px] leading-snug text-stone-500">
                Uses your AMIHUMAN.NET profile photo. Change it in Settings.
              </p>
            </div>

            <div className="px-5 py-5 sm:px-7 sm:py-6">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-stone-500">Build your studio</p>
              <h1 id="hero-contact-heading" className="mt-1.5 text-xl font-bold tracking-tight text-stone-900 sm:text-[1.45rem]">
                Hero & contact
              </h1>
              <p className="mt-1.5 max-w-md text-sm leading-relaxed text-stone-600">
                Empty fields stay on ❎ until you add a value. Values that still match your AMIH profile count as confirmed
                unless you mark ❎. Anything you change yourself needs ✅. Pencil edits clear manual confirmation until you ✅
                again. Saves to this browser only.
              </p>

              <ul className="mt-5 divide-y divide-black/[0.06]" role="list">
                {(Object.keys(FIELD_ROW) as FieldKey[]).map((key) => {
                  const meta = FIELD_ROW[key];
                  const Icon = meta.icon;
                  const val = trimmedRow(hero, key);
                  const empty = val.length === 0;
                  const display = empty ? "—" : val;

                  return (
                    <li
                      key={key}
                      className="flex items-start gap-3 rounded-xl py-3 pl-2 pr-1 sm:py-3.5"
                    >
                      <div
                        className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-[#b8956c]"
                        style={{ background: "rgba(201, 166, 107, 0.14)" }}
                        aria-hidden
                      >
                        <Icon className="h-[17px] w-[17px]" strokeWidth={2} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-stone-500">{meta.placeholder}</p>
                        <p className="mt-0.5 break-words text-[15px] font-semibold leading-snug" style={{ color: STUDIOS_INK }}>
                          {display}
                        </p>
                      </div>
                      <div className="mt-0.5 flex shrink-0 flex-wrap items-center justify-end gap-1 sm:gap-1.5">
                        <button
                          type="button"
                          aria-label={
                            empty
                              ? `${meta.placeholder}: add a value before confirming`
                              : `${meta.placeholder}: confirmed`
                          }
                          aria-pressed={rowConfirmed[key]}
                          disabled={empty}
                          title={empty ? "Add a value (profile or pencil) before you can confirm." : undefined}
                          onClick={() =>
                            commitDraft({
                              hero,
                              confirmed: { ...rowConfirmed, [key]: true },
                              heroContactHiddenOnPublish,
                            })
                          }
                          className={`flex h-10 w-10 items-center justify-center rounded-xl border text-lg leading-none transition ${
                            empty
                              ? "cursor-not-allowed border-transparent bg-stone-100 text-stone-300 opacity-50"
                              : rowConfirmed[key]
                                ? "border-green-200 bg-green-50 text-green-700 shadow-sm ring-1 ring-green-100"
                                : "border-transparent bg-transparent text-stone-300 hover:bg-stone-50 hover:text-stone-500"
                          }`}
                        >
                          <span aria-hidden>✅</span>
                        </button>
                        <button
                          type="button"
                          aria-label={`${meta.placeholder}: not confirmed`}
                          aria-pressed={!rowConfirmed[key]}
                          onClick={() =>
                            commitDraft({
                              hero,
                              confirmed: { ...rowConfirmed, [key]: false },
                              heroContactHiddenOnPublish,
                            })
                          }
                          className={`flex h-10 w-10 items-center justify-center rounded-xl border text-lg leading-none transition ${
                            !rowConfirmed[key]
                              ? "border-red-200 bg-red-50 text-red-700 shadow-sm ring-1 ring-red-100"
                              : "border-transparent bg-transparent text-stone-300 hover:bg-stone-50 hover:text-stone-500"
                          }`}
                        >
                          <span aria-hidden>❎</span>
                        </button>
                        <button
                          type="button"
                          aria-label={`Edit ${meta.placeholder}`}
                          onClick={() => openModal(key)}
                          className="flex h-10 w-10 items-center justify-center rounded-xl border border-black/[0.08] bg-white text-stone-700 shadow-sm ring-1 ring-black/[0.04] transition hover:bg-stone-50"
                        >
                          <Pencil className="h-[18px] w-[18px]" strokeWidth={2} />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>

              {!allConfirmed ? (
                <p className="mt-3 rounded-lg border border-amber-200/80 bg-amber-50/90 px-3 py-2 text-xs font-medium text-amber-900">
                  Rows with “—” stay on ❎ until filled. Custom values need ✅; profile matches stay ✅ unless you tap ❎. Publish
                  will expect every filled row confirmed.
                </p>
              ) : (
                <p className="mt-3 text-xs font-medium text-green-800">All rows confirmed.</p>
              )}

              <p className="mt-4 text-xs text-stone-500">
                This block is separate from your public studio — we can hide it on publish when you&apos;re ready.
              </p>
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
