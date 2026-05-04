"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, CheckCircle2, Eye, Mail, MapPin, Pencil, Phone, User } from "lucide-react";
import type { ApplyStudioHeroFields } from "@/lib/studios/applyPreview";
import { sanitizeApplyStudioHeroFields } from "@/lib/studios/applyPreview";
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
  }
> = {
  fullName: {
    icon: User,
    placeholder: "Full name — from profile or type here",
    autoComplete: "name",
  },
  businessName: {
    icon: Building2,
    placeholder: "Business or studio name",
    autoComplete: "organization",
  },
  email: {
    icon: Mail,
    placeholder: "Email",
    inputType: "email",
    autoComplete: "email",
  },
  phone: {
    icon: Phone,
    placeholder: "Phone",
    /** Plain text field — avoids UA / `tel` normalization (e.g. +1) in the visible value */
    inputMode: "tel",
    autoComplete: "tel",
  },
  physicalAddress: {
    icon: MapPin,
    placeholder: "Street, city, state, ZIP",
    autoComplete: "street-address",
  },
};

function fieldFilled(value: string | null | undefined) {
  return typeof value === "string" && value.trim().length > 0;
}

function formatSavedAt(d: Date) {
  try {
    return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  } catch {
    return "";
  }
}

function normalizeHeroForSave(hero: ApplyStudioHeroFields): ApplyStudioHeroFields {
  const base = sanitizeApplyStudioHeroFields(hero);
  return (Object.keys(FIELD_ROW) as FieldKey[]).reduce((acc, k) => {
    acc[k] = k === "phone" ? base[k] : base[k].trim();
    return acc;
  }, {} as ApplyStudioHeroFields);
}

export function ApplyStudioHero({
  initialHero,
  displayName,
  imageUrl,
  accent,
  previewSlug = null,
  onHeroCommit,
  draftStorageKey = DEFAULT_DRAFT_STORAGE_KEY,
  editorNavItems,
}: {
  initialHero: ApplyStudioHeroFields;
  displayName: string;
  imageUrl?: string | null;
  accent: string;
  /** Studio slug for Preview navigation; when missing, Preview is disabled */
  previewSlug?: string | null;
  onHeroCommit?: (next: ApplyStudioHeroFields) => void;
  /** Isolated localStorage namespace — canonical template uses its own key so drafts never collide with `/studios/apply`. */
  draftStorageKey?: string;
  /** Template-driven nav; defaults to standard studio anchors. */
  editorNavItems?: readonly StudioEditorNavItem[];
}) {
  const router = useRouter();
  const heroStorageKey = draftStorageKey;
  /** Separate publish intent per draft scope — never touches live studios or template source files. */
  const publishIntentKey = `${draftStorageKey}_publish_intent`;
  const [hero, setHero] = useState<ApplyStudioHeroFields>(() => sanitizeApplyStudioHeroFields(initialHero));
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [publishNotice, setPublishNotice] = useState<string | null>(null);
  const [hasPublishIntent, setHasPublishIntent] = useState(false);
  const [heroReady, setHeroReady] = useState(false);
  const inputRefs = useRef<Partial<Record<FieldKey, HTMLInputElement | null>>>({});

  const canPreview = Boolean(previewSlug?.trim());

  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(heroStorageKey) : null;
      const parsed = raw ? (JSON.parse(raw) as Partial<ApplyStudioHeroFields>) : null;
      const merged = sanitizeApplyStudioHeroFields(
        parsed ? { ...initialHero, ...parsed } : initialHero,
      );
      setHero(merged);

      let intentFlag = false;
      try {
        const pi = window.localStorage.getItem(publishIntentKey);
        const complete = (Object.keys(FIELD_ROW) as FieldKey[]).every((k) => fieldFilled(merged[k]));
        if (complete && pi) intentFlag = true;
        if (!complete && pi) window.localStorage.removeItem(publishIntentKey);
      } catch {
        /* ignore */
      }
      setHasPublishIntent(intentFlag);

      queueMicrotask(() => onHeroCommit?.(merged));
    } catch {
      /* ignore */
    } finally {
      setHeroReady(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional single hydrate
  }, []);

  const allComplete = useMemo(
    () => (Object.keys(FIELD_ROW) as FieldKey[]).every((k) => fieldFilled(hero[k])),
    [hero],
  );

  useEffect(() => {
    if (!heroReady || allComplete) return;
    try {
      window.localStorage.removeItem(publishIntentKey);
    } catch {
      /* ignore */
    }
    setHasPublishIntent(false);
    setPublishNotice(null);
  }, [allComplete, heroReady]);

  const writeThrough = useCallback(
    (next: ApplyStudioHeroFields) => {
      onHeroCommit?.(next);
      try {
        window.localStorage.setItem(heroStorageKey, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      setLastSavedAt(new Date());
    },
    [onHeroCommit],
  );

  const saveDraft = useCallback(() => {
    // Writes browser localStorage only (namespaced by `draftStorageKey`).
    // Does not mutate `DEB_DAZZLE_STUDIO_TEMPLATE`, Prisma studios, or the live deb-dazzle row.
    const trimmed = normalizeHeroForSave(hero);
    setHero(trimmed);
    writeThrough(trimmed);
  }, [hero, writeThrough]);

  const requestPublish = useCallback(() => {
    if (!allComplete) return;
    // Client-only intent flag for UX — no server publish yet; never touches template files or DB studios.
    try {
      window.localStorage.setItem(publishIntentKey, new Date().toISOString());
    } catch {
      /* ignore */
    }
    setHasPublishIntent(true);
    setPublishNotice(
      "Thanks — your hero and contact are complete. Publishing still goes through our team; we will email you when your studio can go live.",
    );
  }, [allComplete]);

  const goPreview = useCallback(() => {
    const s = previewSlug?.trim();
    if (!s) return;
    router.push(`/studios/${s}`);
  }, [previewSlug, router]);

  const previewBtnClass = canPreview
    ? "inline-flex items-center justify-center rounded-full border border-black/12 bg-white px-4 py-2 text-sm font-semibold text-stone-800 shadow-sm transition hover:border-black/20 hover:bg-stone-50"
    : "inline-flex cursor-not-allowed items-center justify-center rounded-full border border-black/8 bg-stone-100 px-4 py-2 text-sm font-semibold text-stone-400";

  const publishBtnPrimary =
    allComplete
      ? "inline-flex items-center justify-center rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
      : "inline-flex cursor-not-allowed items-center justify-center rounded-full bg-stone-200 px-4 py-2 text-sm font-semibold text-stone-400";

  return (
    <section className="relative overflow-hidden px-5 pb-6 pt-5 sm:px-8 sm:pb-8 sm:pt-6">
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

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-black/[0.06] pb-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-stone-500">Studio page · preview</span>
            <span
              className={
                hasPublishIntent
                  ? "rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-900 ring-1 ring-emerald-200/90"
                  : "rounded-full bg-amber-100/90 px-3 py-1 text-xs font-semibold text-stone-900 ring-1 ring-amber-200/80"
              }
            >
              {hasPublishIntent ? "Ready for review" : "Not published"}
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button type="button" disabled={!canPreview} onClick={goPreview} className={previewBtnClass} title={canPreview ? "Open live studio preview" : "Publish a studio slug first"}>
              <Eye className="mr-1.5 h-4 w-4 opacity-80" aria-hidden />
              Preview
            </button>
            <button
              type="button"
              disabled={!allComplete}
              onClick={requestPublish}
              title={allComplete ? undefined : "Fill every line to unlock publish"}
              className={publishBtnPrimary}
            >
              Publish
            </button>
            <Link
              href="/studios"
              className="text-sm font-semibold text-stone-800 underline decoration-stone-300 underline-offset-4 transition hover:decoration-stone-600"
            >
              ← Back
            </Link>
          </div>
        </div>

        <div
          id="about"
          className="overflow-hidden rounded-3xl border border-black/[0.07] bg-white shadow-[0_24px_60px_-12px_rgba(0,0,0,0.12)] ring-1 ring-black/[0.03]"
          style={{ borderColor: STUDIOS_LINE }}
        >
          <div className="grid md:grid-cols-[1fr_1.15fr] md:items-stretch">
            <div className="relative flex flex-col items-center justify-center border-b border-black/[0.06] bg-gradient-to-b from-stone-50/90 to-white px-6 py-6 md:border-b-0 md:border-r md:px-7 md:py-6">
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
              <h1 className="mt-1.5 text-xl font-bold tracking-tight text-stone-900 sm:text-[1.45rem]">Hero & contact</h1>
              <p className="mt-1.5 max-w-md text-sm leading-relaxed text-stone-600">
                Confirm what we pulled from your profile, or edit inline. Drafts autosave when you leave a field; use{" "}
                <span className="font-semibold text-stone-700">Save draft</span> anytime.{" "}
                <span className="font-semibold text-stone-700">Publish</span> signals you are ready once every line shows a green check.
              </p>

              <ul className="mt-5 divide-y divide-black/[0.06]" role="list">
                {(Object.keys(FIELD_ROW) as FieldKey[]).map((key) => {
                  const meta = FIELD_ROW[key];
                  const Icon = meta.icon;
                  const filled = fieldFilled(hero[key]);

                  return (
                    <li
                      key={key}
                      className="flex items-center gap-3 rounded-xl py-2.5 pl-2 pr-1 transition-colors first:pt-1 focus-within:bg-sky-50/55 sm:py-3"
                    >
                      <div
                        className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-[#b8956c]"
                        style={{ background: "rgba(201, 166, 107, 0.14)" }}
                        aria-hidden
                      >
                        <Icon className="h-[17px] w-[17px]" strokeWidth={2} />
                      </div>
                      <input
                        ref={(el) => {
                          inputRefs.current[key] = el;
                        }}
                        type={meta.inputType ?? "text"}
                        inputMode={meta.inputMode}
                        name={key}
                        aria-label={meta.placeholder}
                        value={hero[key] ?? ""}
                        placeholder={meta.placeholder}
                        autoComplete={meta.autoComplete}
                        onChange={(e) => setHero((h) => ({ ...h, [key]: e.target.value }))}
                        onBlur={(e) => {
                          const v = key === "phone" ? e.target.value : e.target.value.trim();
                          setHero((prev) => {
                            const next = { ...prev, [key]: v };
                            queueMicrotask(() => writeThrough(next));
                            return next;
                          });
                        }}
                        className="min-h-[44px] min-w-0 flex-1 border-0 border-b border-transparent bg-transparent py-2 text-[16px] font-medium text-stone-900 outline-none transition placeholder:font-normal placeholder:text-stone-400 focus:border-stone-300"
                        style={{ color: STUDIOS_INK }}
                      />
                      <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
                        <button
                          type="button"
                          aria-label={`Edit ${meta.placeholder}`}
                          onClick={() => inputRefs.current[key]?.focus()}
                          className={
                            filled
                              ? "flex h-10 w-10 items-center justify-center rounded-xl text-stone-400 opacity-55 transition hover:bg-black/[0.04] hover:opacity-90"
                              : "flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100/90 text-amber-900 shadow-sm ring-1 ring-amber-200/80 transition hover:bg-amber-100"
                          }
                        >
                          <Pencil className="h-[18px] w-[18px]" strokeWidth={2} />
                        </button>
                        <span
                          className={
                            filled
                              ? "flex h-10 w-10 items-center justify-center text-emerald-600"
                              : "flex h-10 w-10 items-center justify-center text-stone-300 opacity-40"
                          }
                          title={filled ? "Looks good" : "Still needed"}
                        >
                          <CheckCircle2 className="h-[22px] w-[22px]" strokeWidth={2} fill={filled ? "rgba(16, 185, 129, 0.12)" : "none"} />
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>

              <div className="mt-5 flex flex-col gap-3 border-t border-black/[0.06] pt-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                  <p className="text-xs leading-relaxed text-stone-500">
                    {lastSavedAt
                      ? `Last saved at ${formatSavedAt(lastSavedAt)} · stored in this browser only.`
                      : "Autosave runs when you tap out of a field."}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={!canPreview}
                      onClick={goPreview}
                      className={previewBtnClass}
                      title={canPreview ? "Open live studio preview" : "Publish a studio slug first"}
                    >
                      <Eye className="mr-1.5 h-4 w-4 opacity-80" aria-hidden />
                      Preview
                    </button>
                    <button
                      type="button"
                      onClick={saveDraft}
                      className="inline-flex items-center justify-center rounded-full border border-black/12 bg-white px-5 py-2.5 text-sm font-semibold text-stone-800 shadow-sm transition hover:border-black/20 hover:bg-stone-50"
                    >
                      Save draft
                    </button>
                    <button
                      type="button"
                      disabled={!allComplete}
                      onClick={requestPublish}
                      title={allComplete ? undefined : "Fill every line to unlock publish"}
                      className={
                        allComplete
                          ? "inline-flex items-center justify-center rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                          : "inline-flex cursor-not-allowed items-center justify-center rounded-full bg-stone-200 px-5 py-2.5 text-sm font-semibold text-stone-400"
                      }
                    >
                      Publish studio
                    </button>
                  </div>
                </div>
                {publishNotice && (
                  <p className="rounded-2xl border border-emerald-200/80 bg-emerald-50/80 px-4 py-3 text-sm leading-relaxed text-emerald-950">
                    {publishNotice}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
