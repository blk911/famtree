"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ChevronRight, Pencil, X } from "lucide-react";
import type { ApplyStudioIntro } from "@/lib/studios/applyPreview";
import { STUDIO_INTRO_VIDEO_SRC, STUDIO_INTRO_VIDEO_THUMB_SRC } from "@/lib/studios/studioIntroVideo";
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
  const [cinemaNonce, setCinemaNonce] = useState(0);
  const [cinemaMediaError, setCinemaMediaError] = useState(false);
  const cinemaVideoRef = useRef<HTMLVideoElement>(null);
  const cinemaAutoPlayDoneRef = useRef(false);

  const closeIntroVideoModal = useCallback(() => {
    cinemaVideoRef.current?.pause();
    setIntroVideoModalOpen(false);
    setCinemaMediaError(false);
  }, []);

  const openIntroVideoModal = useCallback(() => {
    cinemaAutoPlayDoneRef.current = false;
    setCinemaMediaError(false);
    setCinemaNonce((n) => n + 1);
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

  const tryPlayCinema = useCallback(() => {
    const v = cinemaVideoRef.current;
    if (!v || cinemaAutoPlayDoneRef.current) return;
    /** Chrome often stays at HAVE_METADATA on `loadedmetadata`; requiring HAVE_CURRENT_DATA skipped play(). */
    if (v.readyState < HTMLMediaElement.HAVE_METADATA) return;
    cinemaAutoPlayDoneRef.current = true;
    try {
      v.currentTime = 0;
    } catch {
      /* ignore */
    }
    /**
     * Deferred rAF broke the tap gesture chain on mobile — autoplay stays muted here so
     * `play()` resolves reliably; viewer unmutes with native controls (still counts as same UX fix).
     */
    v.muted = true;
    void v.play().catch(() => {
      cinemaAutoPlayDoneRef.current = false;
    });
  }, []);

  /** Same tick as DOM commit — keeps `play()` closest to the opening tap gesture. */
  useLayoutEffect(() => {
    if (!introVideoModalOpen) return;
    tryPlayCinema();
  }, [introVideoModalOpen, cinemaNonce, tryPlayCinema]);

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
            src={STUDIO_INTRO_VIDEO_THUMB_SRC}
            muted
            playsInline
            preload="metadata"
            tabIndex={-1}
            className="pointer-events-none absolute inset-0 z-[1] h-full w-full object-cover"
            aria-hidden
            onLoadedMetadata={(e) => {
              const v = e.currentTarget;
              try {
                v.currentTime = 0.001;
              } catch {
                /* ignore */
              }
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-[0] bg-cover bg-center opacity-[0.12]"
            style={{ backgroundImage: `url(${foldImageUrl})` }}
          />
          <button
            type="button"
            onClick={openIntroVideoModal}
            className="group absolute inset-0 z-[3] flex flex-col items-center justify-center gap-2 rounded-3xl bg-gradient-to-t from-black/55 via-black/15 to-black/25 transition hover:from-black/65 hover:via-black/25 hover:to-black/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/75 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            aria-label="Play studio intro video full screen"
          >
            <span className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-white text-stone-900 shadow-[0_8px_28px_rgba(0,0,0,0.35)] ring-[3px] ring-white/35 transition group-hover:scale-[1.04] group-active:scale-[0.98]">
              <ChevronRight className="h-8 w-8 translate-x-px" strokeWidth={2.75} aria-hidden />
            </span>
            <span className="max-w-[14rem] px-2 text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]">
              Tap › · Watch intro
            </span>
            <span className="max-w-[13rem] px-3 text-center text-[9px] font-medium italic leading-snug text-white/85 drop-shadow-md">
              Jenny says when you&apos;re ready…
            </span>
          </button>
          {showEditChrome ? (
            <span className="pointer-events-none absolute left-2 top-2 z-[4] rounded-full bg-black/55 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white/95 backdrop-blur-sm">
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
              {cinemaMediaError ? (
                <div className="flex min-h-[180px] flex-col items-center justify-center gap-2 px-6 py-12 text-center">
                  <p className="text-sm font-semibold text-white">Intro video didn&apos;t load</p>
                  <p className="max-w-md text-xs leading-relaxed text-stone-400">
                    Expected file{" "}
                    <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[11px] text-stone-200">
                      public/uploads/STUDIO Intro Vid 1.mp4
                    </code>{" "}
                    — check the path, filename, and that the MP4 is committed or present on the server.
                  </p>
                </div>
              ) : (
                <video
                  key={cinemaNonce}
                  ref={cinemaVideoRef}
                  src={STUDIO_INTRO_VIDEO_SRC}
                  controls
                  playsInline
                  preload="auto"
                  className="max-h-[min(72vh,calc(100vw-48px))] w-full object-contain sm:max-h-[min(78vh,720px)]"
                  aria-label="Studio intro video playback"
                  onLoadedMetadata={tryPlayCinema}
                  onLoadedData={tryPlayCinema}
                  onCanPlay={tryPlayCinema}
                  onError={() => {
                    setCinemaMediaError(true);
                    cinemaAutoPlayDoneRef.current = false;
                  }}
                />
              )}
              <p className="border-t border-white/10 bg-stone-950/95 px-4 py-2 text-center text-[10px] leading-snug text-stone-400">
                Starts muted for autoplay — unmute in controls · replay from the hero thumbnail anytime.
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
