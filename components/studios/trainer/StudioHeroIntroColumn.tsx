"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Pencil, Play, X } from "lucide-react";
import type { ApplyStudioIntro } from "@/lib/studios/applyPreview";
import { STUDIO_INTRO_VIDEO_SRC } from "@/lib/studios/studioIntroVideo";
import { STUDIOS_CARD_SHADOW, STUDIOS_INK, STUDIOS_LINE } from "@/lib/studios/visual";

const MAX_STORY_WORDS = 500;

function countWords(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

/** Intro video + condensed story copy in the hero (no separate marketing fold). */
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
  const [editStoryModalOpen, setEditStoryModalOpen] = useState(false);
  const [introVideoModalOpen, setIntroVideoModalOpen] = useState(false);
  const [titleDraft, setTitleDraft] = useState(initialIntro.title);
  const [bodyDraft, setBodyDraft] = useState(initialIntro.bullets.join("\n"));
  const cinemaVideoRef = useRef<HTMLVideoElement>(null);

  const closeIntroVideoModal = useCallback(() => {
    cinemaVideoRef.current?.pause();
    setIntroVideoModalOpen(false);
  }, []);

  const openIntroVideoModal = useCallback(() => {
    setIntroVideoModalOpen(true);
  }, []);

  useEffect(() => {
    setIntroVideoModalOpen(true);
  }, []);

  useEffect(() => {
    if (!introVideoModalOpen) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [introVideoModalOpen]);

  useEffect(() => {
    if (!introVideoModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeIntroVideoModal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [introVideoModalOpen, closeIntroVideoModal]);

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

  const openEditStoryModal = useCallback(() => {
    setTitleDraft(intro.title);
    setBodyDraft(intro.bullets.join("\n"));
    setEditStoryModalOpen(true);
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
    setEditStoryModalOpen(false);
  }, [bodyDraft, intro.bullets, intro.title, storageKey, titleDraft]);

  useEffect(() => {
    if (!introVideoModalOpen || !cinemaVideoRef.current) return;
    void cinemaVideoRef.current.play().catch(() => {
      /* muted autoplay policy varies */
    });
  }, [introVideoModalOpen]);

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
            onClick={openEditStoryModal}
            className="absolute -right-1 -top-1 z-[2] flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-white text-stone-700 shadow-md ring-1 ring-black/[0.04] transition hover:bg-stone-50"
          >
            <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        ) : null}

        <div
          className="relative w-full max-w-[280px] overflow-hidden rounded-3xl border bg-black"
          style={{
            aspectRatio: "16 / 15",
            borderColor: STUDIOS_LINE,
            boxShadow: STUDIOS_CARD_SHADOW,
          }}
        >
          <video
            src={STUDIO_INTRO_VIDEO_SRC}
            controls
            playsInline
            preload="metadata"
            className="absolute inset-0 z-[1] h-full w-full object-cover"
            aria-label="Studio intro video"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-[0] bg-cover bg-center opacity-[0.12]"
            style={{ backgroundImage: `url(${foldImageUrl})` }}
          />
          <button
            type="button"
            onClick={openIntroVideoModal}
            className="absolute bottom-2 left-1/2 z-[2] flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-white/25 bg-black/55 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-lg backdrop-blur-sm transition hover:bg-black/70 sm:left-auto sm:right-2 sm:translate-x-0"
            aria-label="Play intro full screen"
          >
            <Play className="h-3 w-3 fill-current" aria-hidden />
            Expand
          </button>
          {showEditChrome ? (
            <span className="pointer-events-none absolute left-2 top-2 z-[2] rounded-full bg-black/50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white/95 backdrop-blur-sm">
              Hero clip
            </span>
          ) : null}
          <div className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-inset ring-white/10" />
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

      {introVideoModalOpen ? (
        <div
          className="fixed inset-0 z-[250] flex items-center justify-center bg-black/78 p-3 backdrop-blur-[10px] sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="studio-intro-video-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeIntroVideoModal();
          }}
        >
          <div
            className="animate-studio-intro-pop relative w-full max-w-[min(960px,calc(100vw-24px))] overflow-hidden rounded-2xl border border-white/20 bg-black shadow-[0_28px_90px_rgba(0,0,0,0.58)] ring-2 ring-white/18"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-gradient-to-r from-stone-950 to-stone-900 px-4 py-3">
              <p id="studio-intro-video-modal-title" className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/95">
                Studio intro
              </p>
              <button
                type="button"
                onClick={closeIntroVideoModal}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white transition hover:bg-white/20"
                aria-label="Close intro video"
              >
                <X className="h-5 w-5" strokeWidth={2} />
              </button>
            </div>
            <div className="relative bg-black">
              <video
                ref={cinemaVideoRef}
                src={STUDIO_INTRO_VIDEO_SRC}
                controls
                playsInline
                autoPlay
                muted
                className="max-h-[min(72vh,calc(100vw-48px))] w-full object-contain sm:max-h-[min(78vh,720px)]"
                aria-label="Studio intro video playback"
              />
              <p className="border-t border-white/10 bg-stone-950/95 px-4 py-2 text-center text-[10px] leading-snug text-stone-400">
                Sound: unmute in the player controls if needed.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {editStoryModalOpen ? (
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
                onClick={() => setEditStoryModalOpen(false)}
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
