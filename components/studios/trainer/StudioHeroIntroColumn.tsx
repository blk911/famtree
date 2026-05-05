"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Pencil, Play } from "lucide-react";
import type { ApplyStudioIntro } from "@/lib/studios/applyPreview";
import { STUDIOS_CARD_SHADOW, STUDIOS_INK, STUDIOS_LINE, STUDIOS_MUTED } from "@/lib/studios/visual";

const MAX_STORY_WORDS = 500;

function countWords(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

/** Intro video stub + condensed story copy in the hero (no separate marketing fold). */
export function StudioHeroIntroColumn({
  initialIntro,
  draftStorageKey,
  foldImageUrl,
  showEditChrome,
}: {
  initialIntro: ApplyStudioIntro;
  draftStorageKey: string;
  foldImageUrl: string;
  showEditChrome: boolean;
}) {
  /** Bump suffix when default intro copy changes so stale drafts don’t mask server placeholders. */
  const storageKey = `${draftStorageKey}_intro_v4`;
  const [intro, setIntro] = useState<ApplyStudioIntro>(initialIntro);
  const [modalOpen, setModalOpen] = useState(false);
  const [titleDraft, setTitleDraft] = useState(initialIntro.title);
  const [bodyDraft, setBodyDraft] = useState(initialIntro.bullets.join("\n"));
  const [videoBusy, setVideoBusy] = useState(false);

  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(storageKey) : null;
      if (!raw) return;
      const p = JSON.parse(raw) as { title?: string; bullets?: string[] };
      const bullets =
        Array.isArray(p.bullets) && p.bullets.length > 0 ? p.bullets.map(String) : initialIntro.bullets;
      setIntro({
        title: typeof p.title === "string" && p.title.trim() ? p.title.trim() : initialIntro.title,
        bullets,
      });
    } catch {
      /* ignore */
    }
  }, [storageKey, initialIntro.title, initialIntro.bullets]);

  const openModal = useCallback(() => {
    setTitleDraft(intro.title);
    setBodyDraft(intro.bullets.join("\n"));
    setModalOpen(true);
  }, [intro]);

  const saveModal = useCallback(() => {
    if (countWords(bodyDraft) > MAX_STORY_WORDS) return;
    const bullets = bodyDraft
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    const next: ApplyStudioIntro = {
      title: titleDraft.trim() || intro.title,
      bullets: bullets.length > 0 ? bullets : intro.bullets,
    };
    setIntro(next);
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      /* ignore */
    }
    setModalOpen(false);
  }, [bodyDraft, intro.bullets, intro.title, storageKey, titleDraft]);

  const onVideoStub = useCallback(() => {
    setVideoBusy(true);
    window.setTimeout(() => setVideoBusy(false), 2000);
  }, []);

  const wordsUsed = countWords(bodyDraft);
  const bullets = Array.isArray(intro.bullets) ? intro.bullets : [];

  return (
    <>
      <div
        id={showEditChrome ? "marketing" : undefined}
        className="relative flex min-h-0 w-full max-w-[280px] flex-col scroll-mt-24"
      >
        {showEditChrome ? (
          <button
            type="button"
            aria-label="Edit intro story"
            onClick={openModal}
            className="absolute -right-1 -top-1 z-[2] flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-white text-stone-700 shadow-md ring-1 ring-black/[0.04] transition hover:bg-stone-50"
          >
            <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        ) : null}

        <div
          className="relative w-full max-w-[280px] overflow-hidden rounded-3xl border bg-gradient-to-br from-[#fafaf8] via-white to-[#f3f0eb]"
          style={{
            aspectRatio: "16 / 15",
            borderColor: STUDIOS_LINE,
            boxShadow: STUDIOS_CARD_SHADOW,
          }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-[0.18]"
            style={{ backgroundImage: `url(${foldImageUrl})` }}
          />
          <div className="relative z-[1] flex h-full flex-col items-center justify-center gap-1 px-3 py-4">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-full bg-[rgba(38,38,38,0.88)] text-white"
              aria-hidden
            >
              <Play className="ml-0.5 h-5 w-5" fill="currentColor" />
            </div>
            <span className="text-center text-[11px] font-semibold text-stone-500">Intro video</span>
            <span className="text-center text-[10px] leading-snug text-stone-500/90">Placeholder — upload when ready</span>
          </div>
          {showEditChrome ? (
            <button
              type="button"
              disabled={videoBusy}
              onClick={onVideoStub}
              className="absolute bottom-2 right-2 z-[2] inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-stone-800 shadow-md ring-1 ring-black/[0.04] transition hover:bg-stone-50 disabled:opacity-70"
            >
              {videoBusy ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  Working…
                </>
              ) : (
                "Upload video"
              )}
            </button>
          ) : null}
          <div className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-inset ring-black/[0.06]" />
        </div>

        <div className="mt-3 max-w-[280px] space-y-1">
          {bullets.length > 0 ? (
            bullets.map((line) => (
              <p key={line} className="text-base leading-snug text-stone-600">
                {line}
              </p>
            ))
          ) : (
            <p className="text-base italic leading-snug text-stone-400">Add story lines in edit.</p>
          )}
        </div>

        <span className="sr-only">{intro.title}</span>
      </div>

      {modalOpen ? (
        <div
          className="fixed inset-0 z-[220] flex items-center justify-center bg-black/45 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="studio-intro-modal-title"
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-black/[0.08] bg-white p-6 shadow-2xl ring-1 ring-black/[0.04]">
            <h3 id="studio-intro-modal-title" className="text-lg font-bold text-stone-900">
              Edit intro story
            </h3>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-stone-500">Title — reference (not shown on card)</p>
            <p className="mt-1 rounded-lg bg-stone-50 px-3 py-2 text-sm text-stone-700">{intro.title}</p>
            <label className="mt-4 block text-xs font-bold uppercase tracking-wide text-stone-500">
              New title
              <input
                className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-base font-semibold text-stone-900 outline-none focus:ring-2 focus:ring-stone-300"
                style={{ color: STUDIOS_INK }}
                value={titleDraft}
                maxLength={200}
                onChange={(e) => setTitleDraft(e.target.value)}
              />
            </label>
            <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-stone-500">
              Story — one line per paragraph · max {MAX_STORY_WORDS} words
            </p>
            <textarea
              className="mt-1 min-h-[160px] w-full rounded-lg border border-stone-200 px-3 py-2 text-sm leading-relaxed text-stone-800 outline-none focus:ring-2 focus:ring-stone-300"
              value={bodyDraft}
              onChange={(e) => setBodyDraft(e.target.value)}
              aria-invalid={wordsUsed > MAX_STORY_WORDS}
            />
            <p className={`mt-1 text-xs font-medium ${wordsUsed > MAX_STORY_WORDS ? "text-red-600" : "text-stone-500"}`}>
              {wordsUsed} / {MAX_STORY_WORDS} words
            </p>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-800 hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={wordsUsed > MAX_STORY_WORDS}
                onClick={saveModal}
                className="rounded-full bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
