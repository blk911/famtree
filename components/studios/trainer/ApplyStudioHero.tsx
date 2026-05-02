"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Building2, Mail, MapPin, Pencil, Phone, User } from "lucide-react";
import type { ApplyStudioHeroFields } from "@/lib/studios/applyPreview";
import { STUDIOS_INK, STUDIOS_LINE } from "@/lib/studios/visual";
import { TrainerPhoto } from "./TrainerPhoto";

const STORAGE_KEY = "amih_studios_apply_hero_v1";

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

  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<ApplyStudioHeroFields>;
      const merged: ApplyStudioHeroFields = { ...initialHero, ...parsed };
      setHero(merged);
      queueMicrotask(() => onHeroCommit?.(merged));
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional single hydrate
  }, []);

  const writeThrough = useCallback(
    (next: ApplyStudioHeroFields) => {
      onHeroCommit?.(next);
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
    },
    [onHeroCommit],
  );

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
            <span className="rounded-full bg-amber-100/90 px-3 py-1 text-xs font-semibold text-stone-900 ring-1 ring-amber-200/80">
              Not published
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
                Confirm what we pulled from your profile, or edit inline. Everything saves in this browser until you publish.
              </p>

              <ul className="mt-8 divide-y divide-black/[0.06]" role="list">
                {(Object.keys(FIELD_ROW) as FieldKey[]).map((key) => {
                  const meta = FIELD_ROW[key];
                  const Icon = meta.icon;

                  return (
                    <li key={key} className="flex gap-4 py-4 first:pt-1">
                      <div
                        className="mt-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-[#b8956c]"
                        style={{ background: "rgba(201, 166, 107, 0.14)" }}
                        aria-hidden
                      >
                        <Icon className="h-[17px] w-[17px]" strokeWidth={2} />
                      </div>
                      <input
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
                        className="min-h-[48px] w-full border-0 border-b border-transparent bg-transparent px-0 py-2.5 text-[16px] font-medium text-stone-900 outline-none transition placeholder:font-normal placeholder:text-stone-400 focus:border-stone-300"
                        style={{ color: STUDIOS_INK }}
                      />
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
