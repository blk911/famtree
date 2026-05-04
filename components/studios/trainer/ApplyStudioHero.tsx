"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Building2, Mail, MapPin, Pencil, Phone, User } from "lucide-react";
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
  const [hero, setHero] = useState<ApplyStudioHeroFields>(() => sanitizeApplyStudioHeroFields(initialHero));
  const [heroReady, setHeroReady] = useState(false);
  const [modalKey, setModalKey] = useState<FieldKey | null>(null);
  const [modalDraft, setModalDraft] = useState("");

  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(heroStorageKey) : null;
      const parsed = raw ? (JSON.parse(raw) as Partial<ApplyStudioHeroFields>) : null;
      const merged = sanitizeApplyStudioHeroFields(parsed ? { ...initialHero, ...parsed } : initialHero);
      setHero(merged);
      queueMicrotask(() => onHeroCommit?.(merged));
    } catch {
      /* ignore */
    } finally {
      setHeroReady(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional single hydrate
  }, []);

  const writeThrough = useCallback(
    (next: ApplyStudioHeroFields) => {
      onHeroCommit?.(next);
      try {
        window.localStorage.setItem(heroStorageKey, JSON.stringify(next));
      } catch {
        /* ignore */
      }
    },
    [heroStorageKey, onHeroCommit],
  );

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
    const next = normalizeHeroForSave({ ...hero, [modalKey]: v });
    setHero(next);
    writeThrough(next);
    closeModal();
  }, [closeModal, hero, heroReady, modalDraft, modalKey, writeThrough]);

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

        <div
          id="about"
          className="mt-4 overflow-hidden rounded-3xl border border-black/[0.07] bg-white shadow-[0_24px_60px_-12px_rgba(0,0,0,0.12)] ring-1 ring-black/[0.03]"
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
                Tap the pencil on each row to edit in a simple dialog. Saves to this browser only.
              </p>

              <ul className="mt-5 divide-y divide-black/[0.06]" role="list">
                {(Object.keys(FIELD_ROW) as FieldKey[]).map((key) => {
                  const meta = FIELD_ROW[key];
                  const Icon = meta.icon;
                  const val = hero[key]?.trim() ?? "";
                  const display = val.length > 0 ? val : "—";

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
                      <button
                        type="button"
                        aria-label={`Edit ${meta.placeholder}`}
                        onClick={() => openModal(key)}
                        className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-black/[0.08] bg-white text-stone-700 shadow-sm ring-1 ring-black/[0.04] transition hover:bg-stone-50"
                      >
                        <Pencil className="h-[18px] w-[18px]" strokeWidth={2} />
                      </button>
                    </li>
                  );
                })}
              </ul>

              <p className="mt-4 text-xs text-stone-500">
                Preview / publish controls stay hidden for now — focus on content first.
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
