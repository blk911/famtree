"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Pencil, Play } from "lucide-react";
import type { ApplyStudioIntro } from "@/lib/studios/applyPreview";
import { STUDIOS_CARD_SHADOW, STUDIOS_INK, STUDIOS_LINE, STUDIOS_MUTED } from "@/lib/studios/visual";

const MAX_STORY_WORDS = 500;

function countWords(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

/** Intro / “second hero” block — modal edit for title + bullets; loader on video card (stub upload). */
export function StudioStartStorySection({
  initialIntro,
  draftStorageKey,
  heroBgImageUrl,
  foldImageUrl,
}: {
  initialIntro: ApplyStudioIntro;
  draftStorageKey: string;
  heroBgImageUrl: string;
  foldImageUrl: string;
}) {
  const storageKey = `${draftStorageKey}_intro_v1`;
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

  return (
    <>
      <section
        id="team"
        style={{
          position: "relative",
          margin: "0 auto",
          maxWidth: "1100px",
          padding: "48px 24px 56px",
          borderBottom: "1px solid rgba(0,0,0,0.06)",
          overflow: "hidden",
          background: "linear-gradient(120deg, rgba(255,255,255,0.96) 0%, rgba(247,245,238,0.94) 45%, rgba(235,243,252,0.55) 100%)",
        }}
      >
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `url(${heroBgImageUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            opacity: 0.13,
            pointerEvents: "none",
          }}
        />
        <div style={{ position: "relative", zIndex: 1 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
              gap: "40px",
              alignItems: "center",
            }}
          >
            <div
              id="portfolio"
              style={{
                borderRadius: "22px",
                overflow: "hidden",
                border: `1px solid ${STUDIOS_LINE}`,
                boxShadow: STUDIOS_CARD_SHADOW,
                background: "linear-gradient(160deg, rgba(250,248,245,0.95) 0%, #fff 45%, #f3f0eb 100%)",
                aspectRatio: "16 / 9",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                position: "relative",
              }}
            >
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  inset: 0,
                  backgroundImage: `url(${foldImageUrl})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  opacity: 0.18,
                }}
              />
              <div
                style={{
                  width: "64px",
                  height: "64px",
                  borderRadius: "50%",
                  background: "rgba(38, 38, 38, 0.88)",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                  zIndex: 1,
                }}
              >
                <Play style={{ width: "26px", height: "26px", marginLeft: "4px" }} fill="currentColor" />
              </div>
              <span
                style={{
                  fontSize: "14px",
                  fontWeight: 600,
                  color: STUDIOS_MUTED,
                  position: "relative",
                  zIndex: 1,
                }}
              >
                Intro video
              </span>
              <span
                style={{
                  fontSize: "12px",
                  color: STUDIOS_MUTED,
                  opacity: 0.85,
                  position: "relative",
                  zIndex: 1,
                }}
              >
                Placeholder — upload after approval
              </span>
              <button
                type="button"
                disabled={videoBusy}
                onClick={onVideoStub}
                className="absolute bottom-3 right-3 z-[2] inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-bold uppercase tracking-wide text-stone-800 shadow-md ring-1 ring-black/[0.04] transition hover:bg-stone-50 disabled:opacity-70"
              >
                {videoBusy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    Working…
                  </>
                ) : (
                  "Upload video"
                )}
              </button>
            </div>

            <div style={{ position: "relative" }}>
              <button
                type="button"
                aria-label="Edit story section"
                onClick={openModal}
                className="absolute -right-1 -top-2 z-[2] flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white text-stone-700 shadow-md ring-1 ring-black/[0.04] transition hover:bg-stone-50 md:right-0"
              >
                <Pencil className="h-4 w-4" strokeWidth={2} />
              </button>
              <h2
                style={{
                  fontSize: "clamp(22px, 3vw, 28px)",
                  fontWeight: 700,
                  color: STUDIOS_INK,
                  margin: "0 0 20px",
                  letterSpacing: "-0.3px",
                  lineHeight: 1.2,
                  paddingRight: "44px",
                }}
              >
                {intro.title}
              </h2>
              <ul style={{ margin: 0, paddingLeft: "22px", display: "flex", flexDirection: "column", gap: "14px" }}>
                {(Array.isArray(intro.bullets) ? intro.bullets : []).map((line) => (
                  <li key={line} style={{ fontSize: "16px", lineHeight: 1.55, color: "#404040" }}>
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

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
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-stone-500">Title — current</p>
            <p className="mt-1 rounded-lg bg-stone-50 px-3 py-2 text-sm text-stone-700">{intro.title}</p>
            <label className="mt-4 block text-xs font-bold uppercase tracking-wide text-stone-500">
              New title
              <input
                className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-base font-semibold text-stone-900 outline-none focus:ring-2 focus:ring-stone-300"
                value={titleDraft}
                maxLength={200}
                onChange={(e) => setTitleDraft(e.target.value)}
              />
            </label>
            <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-stone-500">
              Story — one bullet per line · max {MAX_STORY_WORDS} words
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
