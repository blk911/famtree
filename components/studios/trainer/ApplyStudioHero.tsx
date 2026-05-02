"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Building2, CheckCircle2, Mail, MapPin, Pencil, Phone, User } from "lucide-react";
import type { ApplyStudioHeroFields } from "@/lib/studios/applyPreview";
import { STUDIOS_INK, STUDIOS_LINE } from "@/lib/studios/visual";
import { TrainerPhoto } from "./TrainerPhoto";

const STORAGE_KEY = "amih_studios_apply_hero_v1";
const PUBLISH_INTENT_KEY = "amih_studios_apply_publish_intent_v1";

type FieldKey = keyof ApplyStudioHeroFields;

const FIELD_ROW: Record<
  FieldKey,
  { icon: typeof User; placeholder: string; inputType?: string; autoComplete?: string }
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
    inputType: "tel",
    autoComplete: "tel",
  },
  physicalAddress: {
    icon: MapPin,
    placeholder: "Street, city, state, ZIP",
    autoComplete: "street-address",
  },
};

function fieldFilled(value: string) {
  return value.trim().length > 0;
}

function formatSavedAt(d: Date) {
  try {
    return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  } catch {
    return "";
  }
}

export function ApplyStudioHero({
  initialHero,
  displayName,
  imageUrl,
  accent,
  onHeroCommit,
}: {
  initialHero: ApplyStudioHeroFields;
  displayName: string;
  imageUrl?: string | null;
  accent: string;
  onHeroCommit?: (next: ApplyStudioHeroFields) => void;
}) {
  const [hero, setHero] = useState<ApplyStudioHeroFields>(initialHero);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [publishNotice, setPublishNotice] = useState<string | null>(null);
  const [hasPublishIntent, setHasPublishIntent] = useState(false);
  const [heroReady, setHeroReady] = useState(false);
  const inputRefs = useRef<Partial<Record<FieldKey, HTMLInputElement | null>>>({});

  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
      const parsed = raw ? (JSON.parse(raw) as Partial<ApplyStudioHeroFields>) : null;
      const merged: ApplyStudioHeroFields = parsed ? { ...initialHero, ...parsed } : initialHero;
      setHero(merged);

      let intentFlag = false;
      try {
        const pi = window.localStorage.getItem(PUBLISH_INTENT_KEY);
        const complete = (Object.keys(FIELD_ROW) as FieldKey[]).every((k) => fieldFilled(merged[k]));
        if (complete && pi) intentFlag = true;
        if (!complete && pi) window.localStorage.removeItem(PUBLISH_INTENT_KEY);
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
      window.localStorage.removeItem(PUBLISH_INTENT_KEY);
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
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      setLastSavedAt(new Date());
    },
    [onHeroCommit],
  );

  const saveDraft = useCallback(() => {
    const trimmed = Object.fromEntries(
      (Object.keys(FIELD_ROW) as FieldKey[]).map((k) => [k, hero[k].trim()]),
    ) as ApplyStudioHeroFields;
    setHero(trimmed);
    writeThrough(trimmed);
  }, [hero, writeThrough]);

  const requestPublish = useCallback(() => {
    if (!allComplete) return;
    try {
      window.localStorage.setItem(PUBLISH_INTENT_KEY, new Date().toISOString());
    } catch {
      /* ignore */
    }
    setHasPublishIntent(true);
    setPublishNotice(
      "Thanks — your hero and contact are complete. Publishing still goes through our team; we will email you when your studio can go live.",
    );
  }, [allComplete]);

  return (
    <section className="relative overflow-hidden px-5 pb-10 pt-8 sm:px-8 sm:pb-12 sm:pt-10">
      <div
        className="pointer-events-none absolute -left-32 top-20 h-80 w-80 rounded-full blur-3xl"
        style={{ background: "rgba(255, 218, 230, 0.35)" }}
      />
      <div
        className="pointer-events-none absolute -right-24 top-0 h-72 w-72 rounded-full blur-3xl"
        style={{ background: "rgba(230, 240, 255, 0.4)" }}
      />

      <div className="relative z-10 mx-auto max-w-5xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3 border-b border-black/[0.06] pb-5">
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
          <Link
            href="/studios"
            className="text-sm font-semibold text-stone-800 underline decoration-stone-300 underline-offset-4 transition hover:decoration-stone-600"
          >
            ← Back
          </Link>
        </div>

        <div
          className="overflow-hidden rounded-3xl border border-black/[0.07] bg-white shadow-[0_24px_60px_-12px_rgba(0,0,0,0.12)] ring-1 ring-black/[0.03]"
          style={{ borderColor: STUDIOS_LINE }}
        >
          <div className="grid md:grid-cols-[1fr_1.15fr] md:items-stretch">
            <div className="relative flex flex-col items-center justify-center border-b border-black/[0.06] bg-gradient-to-b from-stone-50/90 to-white px-8 py-10 md:border-b-0 md:border-r">
              <div className="relative w-full max-w-[300px]">
                <TrainerPhoto displayName={displayName} imageUrl={imageUrl} accent={accent} />
                <div className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-inset ring-black/[0.06]" />
              </div>
              <Link
                href="/settings"
                className="mt-5 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-stone-800 shadow-sm transition hover:border-black/20 hover:bg-stone-50"
              >
                <Pencil className="h-3.5 w-3.5 opacity-70" />
                Edit photo
              </Link>
              <p className="mt-2 max-w-[260px] text-center text-xs text-stone-500">Uses your AMIHUMAN.NET profile photo. Change it in Settings.</p>
            </div>

            <div className="px-6 py-8 sm:px-9 sm:py-10">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-stone-500">Build your studio</p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-stone-900 sm:text-[1.65rem]">Hero & contact</h1>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-stone-600">
                Confirm what we pulled from your profile, or edit inline. Drafts autosave when you leave a field; use{" "}
                <span className="font-semibold text-stone-700">Save draft</span> anytime.{" "}
                <span className="font-semibold text-stone-700">Publish</span> signals you are ready once every line shows a green check.
              </p>

              <ul className="mt-8 divide-y divide-black/[0.06]" role="list">
                {(Object.keys(FIELD_ROW) as FieldKey[]).map((key) => {
                  const meta = FIELD_ROW[key];
                  const Icon = meta.icon;
                  const filled = fieldFilled(hero[key]);

                  return (
                    <li
                      key={key}
                      className="flex items-center gap-3 rounded-xl py-4 pl-2 pr-1 transition-colors first:pt-1 focus-within:bg-sky-50/55"
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
                        name={key}
                        aria-label={meta.placeholder}
                        value={hero[key]}
                        placeholder={meta.placeholder}
                        autoComplete={meta.autoComplete}
                        onChange={(e) => setHero((h) => ({ ...h, [key]: e.target.value }))}
                        onBlur={(e) => {
                          const v = e.target.value.trim();
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

              <div className="mt-8 flex flex-col gap-4 border-t border-black/[0.06] pt-7">
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                  <p className="text-xs leading-relaxed text-stone-500">
                    {lastSavedAt
                      ? `Last saved at ${formatSavedAt(lastSavedAt)} · stored in this browser only.`
                      : "Autosave runs when you tap out of a field."}
                  </p>
                  <div className="flex flex-wrap gap-2">
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
