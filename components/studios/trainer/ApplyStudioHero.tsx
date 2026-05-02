"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Building2, Check, Mail, MapPin, Pencil, Phone, User, X } from "lucide-react";
import type { ApplyStudioHeroFields } from "@/lib/studios/applyPreview";
import { STUDIOS_INK, STUDIOS_LINE } from "@/lib/studios/visual";
import { TrainerPhoto } from "./TrainerPhoto";

const STORAGE_KEY = "amih_studios_apply_hero_v1";

type FieldKey = keyof ApplyStudioHeroFields;

const FIELD_META: Record<FieldKey, { label: string; icon: typeof User; inputType?: string; autoComplete?: string }> = {
  fullName: { label: "Name", icon: User, autoComplete: "name" },
  businessName: { label: "Business", icon: Building2, autoComplete: "organization" },
  email: { label: "Email", icon: Mail, inputType: "email", autoComplete: "email" },
  phone: { label: "Phone", icon: Phone, inputType: "tel", autoComplete: "tel" },
  physicalAddress: { label: "Address", icon: MapPin, autoComplete: "street-address" },
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
  /** Called whenever the user saves hero fields (e.g. sync offer modals with edited name). */
  onHeroCommit?: (next: ApplyStudioHeroFields) => void;
}) {
  const [hero, setHero] = useState<ApplyStudioHeroFields>(initialHero);
  const [editing, setEditing] = useState<FieldKey | null>(null);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<ApplyStudioHeroFields>;
      const merged = { ...initialHero, ...parsed };
      setHero(merged);
      onHeroCommit?.(merged);
    } catch {
      /* ignore */
    }
    // Restore draft from storage once on mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional single hydrate
  }, []);

  const persist = useCallback(
    (next: ApplyStudioHeroFields) => {
      setHero(next);
      onHeroCommit?.(next);
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
    },
    [onHeroCommit],
  );

  const startEdit = (key: FieldKey) => {
    setEditing(key);
    setDraft(hero[key]);
  };

  const saveEdit = () => {
    if (!editing) return;
    persist({ ...hero, [editing]: draft.trim() || hero[editing] });
    setEditing(null);
    setDraft("");
  };

  const cancelEdit = () => {
    setEditing(null);
    setDraft("");
  };

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
            {/* Photo — left */}
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
              <p className="mt-2 max-w-[260px] text-center text-xs text-stone-500">Profile photo uses your AMIHUMAN.NET account. Change it anytime in Settings.</p>
            </div>

            {/* Contact — right */}
            <div className="px-6 py-8 sm:px-9 sm:py-10">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-stone-500">Build your studio</p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-stone-900 sm:text-[1.65rem]">Hero & contact</h1>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-stone-600">
                Edit each field below. Preview-only changes are saved in this browser until your studio goes live.
              </p>

              <ul className="mt-8 divide-y divide-black/[0.06]" role="list">
                {(Object.keys(FIELD_META) as FieldKey[]).map((key) => {
                  const meta = FIELD_META[key];
                  const Icon = meta.icon;
                  const isEditing = editing === key;
                  const value = hero[key];

                  return (
                    <li key={key} className="flex gap-4 py-5 first:pt-0">
                      <div
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-[#b8956c]"
                        style={{ background: "rgba(201, 166, 107, 0.14)" }}
                      >
                        <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <span className="text-[11px] font-bold uppercase tracking-[0.07em] text-stone-500">{meta.label}</span>
                          {!isEditing ? (
                            <button
                              type="button"
                              onClick={() => startEdit(key)}
                              className="inline-flex shrink-0 items-center gap-1 rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-semibold text-stone-800 shadow-sm transition hover:border-stone-300 hover:bg-stone-50"
                            >
                              <Pencil className="h-3 w-3 opacity-70" />
                              Edit
                            </button>
                          ) : (
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={saveEdit}
                                className="inline-flex items-center gap-1 rounded-full bg-stone-900 px-3 py-1 text-xs font-semibold text-white hover:bg-stone-800"
                              >
                                <Check className="h-3 w-3" />
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={cancelEdit}
                                className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-semibold text-stone-700 hover:bg-stone-50"
                              >
                                <X className="h-3 w-3" />
                                Cancel
                              </button>
                            </div>
                          )}
                        </div>
                        {isEditing ? (
                          <input
                            type={meta.inputType ?? "text"}
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            autoComplete={meta.autoComplete}
                            className="mt-2 w-full rounded-xl border border-stone-200 px-3 py-2.5 text-[15px] font-medium text-stone-900 shadow-inner outline-none ring-stone-900/10 focus:ring-2"
                            style={{ color: STUDIOS_INK, borderColor: STUDIOS_LINE }}
                          />
                        ) : (
                          <p
                            className="mt-1.5 text-[17px] font-semibold leading-snug text-stone-900"
                            style={{ wordBreak: "break-word" }}
                          >
                            {value}
                          </p>
                        )}
                      </div>
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
