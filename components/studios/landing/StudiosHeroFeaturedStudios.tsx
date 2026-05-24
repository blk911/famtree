"use client";

import Link from "next/link";
import type { SyntheticEvent } from "react";
import { StudiosGatewayAwareLink } from "@/components/studios/gateway/StudiosGatewayRoot";
import { type ReactNode, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { ArrowRight, ArrowUpRight, Play } from "lucide-react";
import {
  FEATURED_STUDIO_VIDEO_CARDS,
  type StudioStackCardData,
} from "@/lib/studios/landing/studioStackData";
import { StudioPreviewModal } from "@/components/studios/landing/StudioPreviewModal";
import { STUDIOS_LANDING_HERO_INTRO } from "@/lib/studios/studioIntroVideo";

type Props = { children: ReactNode };

const HERO_FOCUS = FEATURED_STUDIO_VIDEO_CARDS.find((c) => c.id === "gap-u")!;

/** Full-bleed cover inside slot (poster snapshot or JPEG data URL); only for fallback state. */
function slotCoverBg(url: string): CSSProperties {
  return {
    position: "absolute",
    inset: 0,
    backgroundImage: `url(${url})`,
    backgroundSize: "cover",
    backgroundPosition: "center center",
  };
}

/**
 * Landing hero reel: one 16×9 viewport, video `object-fit: contain` so source isn’t vertically stretched,
 * poster frame snapped from the real MP4 after metadata (replacing mismatched Gap U stock art).
 */
export function StudiosHeroFeaturedStudios({ children }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [heroVideoBroken, setHeroVideoBroken] = useState(false);
  const [posterDataUrl, setPosterDataUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const posterCapturedRef = useRef(false);

  const heroIntroSrc = STUDIOS_LANDING_HERO_INTRO.videoSrc;

  useEffect(() => {
    posterCapturedRef.current = false;
    setPosterDataUrl(null);
    setHeroVideoBroken(false);
    videoRef.current?.load();
  }, [heroIntroSrc]);

  function openPreview() {
    setModalOpen(true);
  }

  function capturePosterFrame(v: HTMLVideoElement) {
    if (posterCapturedRef.current) return;
    const w = v.videoWidth;
    const h = v.videoHeight;
    if (!w || !h) return;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(v, 0, 0, w, h);
      posterCapturedRef.current = true;
      setPosterDataUrl(canvas.toDataURL("image/jpeg", 0.92));
    } catch {
      /* Rare: security / decode */
    }
  }

  /** After first frames are buffered, seek briefly in and JPEG the decoded frame — matches the reel, not Gap U stock. */
  function onHeroLoadedData(ev: SyntheticEvent<HTMLVideoElement>) {
    const v = ev.currentTarget;
    setHeroVideoBroken(false);

    const onSeekedOnce = () => {
      capturePosterFrame(v);
      v.removeEventListener("seeked", onSeekedOnce);
    };

    v.addEventListener("seeked", onSeekedOnce);
    requestAnimationFrame(() => {
      try {
        v.pause();
        const d =
          typeof v.duration === "number" && Number.isFinite(v.duration) && v.duration > 0
            ? Math.min(0.12, Math.max(0.02, v.duration * 0.02))
            : 0.04;
        v.currentTime = d;
      } catch {
        capturePosterFrame(v);
      }
    });
  }

  const fallbackPoster = posterDataUrl;

  return (
    <>
      <style>{`
        .shfs-twocol {
          display: grid;
          grid-template-columns: 1fr;
          gap: clamp(14px, 3vw, 26px);
          align-items: center;
          width: 100%;
          max-width: min(1120px, 100%);
          margin: 0 auto;
        }
        @media (min-width: 880px) {
          .shfs-twocol {
            grid-template-columns: minmax(0, 1fr) minmax(0, 1.08fr);
            align-items: center;
          }
        }
        .shfs-copy {
          min-width: 0;
          text-align: center;
        }
        @media (min-width: 880px) {
          .shfs-copy {
            text-align: left;
          }
        }
        .shfs-video-wrap {
          min-width: 0;
          width: 100%;
          display: flex;
          justify-content: center;
        }
        .shfs-shell {
          width: min(720px, 100%);
          border-radius: 15px;
          overflow: hidden;
          background: #fff;
          border: 1px solid rgba(28, 25, 23, 0.085);
          box-shadow:
            0 10px 28px rgba(38, 38, 38, 0.08),
            0 1px 4px rgba(38, 38, 38, 0.04);
        }
        .shfs-video-slot {
          position: relative;
          width: 100%;
          margin: 0;
          aspect-ratio: 16 / 9;
          background:
            radial-gradient(circle at 50% 32%, rgba(255,255,255,0.07), transparent 58%),
            #141210;
          overflow: hidden;
        }
        .shfs-video-slot video {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: contain;
          object-position: center center;
          display: block;
          background: transparent;
        }
        .shfs-play-ornament {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
          transition: opacity 0.22s ease;
          opacity: 0.72;
        }
        .shfs-video-slot:hover .shfs-play-ornament {
          opacity: 1;
        }
        .shfs-play-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.12);
          color: rgba(253, 252, 251, 0.95);
          backdrop-filter: blur(6px);
          border: 1px solid rgba(255, 255, 255, 0.18);
          box-shadow: 0 8px 26px rgba(0, 0, 0, 0.28);
        }
        .shfs-feature-meta {
          padding: 9px 12px 10px;
          border-top: 1px solid rgba(28, 25, 23, 0.06);
        }
        .shfs-feature-title {
          margin: 0 0 3px;
          font-size: 15px;
          font-weight: 800;
          letter-spacing: -0.022em;
          color: #1c1917;
        }
        .shfs-feature-sub {
          margin: 0 0 8px;
          font-size: 11px;
          line-height: 1.4;
          color: #78716c;
        }
        .shfs-actions {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 7px;
        }
        .shfs-btn {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 7px 11px;
          border-radius: 9px;
          font-size: 11px;
          font-weight: 700;
          text-decoration: none;
          cursor: pointer;
          border: 1px solid transparent;
          transition: transform 0.14s ease, box-shadow 0.14s ease;
          line-height: 1.2;
        }
        .shfs-btn:hover {
          transform: translateY(-1px);
        }
        .shfs-btn-primary-solid {
          background: #292524;
          color: #fafaf9;
        }
        .shfs-btn-live {
          background: #9d174d;
          border-color: rgba(157, 23, 77, 0.3);
          color: #fff;
        }
        .shfs-btn-ghost {
          background: rgba(255, 255, 255, 0.92);
          color: #44403c;
          border-color: rgba(28, 25, 23, 0.12);
        }
        .shfs-hero-video-fallback {
          margin: 8px 0 0;
          font-size: 10px;
          line-height: 1.4;
          color: #92400e;
          font-weight: 600;
        }
        .shfs-hero-video-fallback a {
          color: #b45309;
          font-weight: 800;
        }
        @media (prefers-reduced-motion: reduce) {
          .shfs-btn:hover {
            transform: none !important;
          }
          .shfs-play-ornament {
            opacity: 0.9 !important;
          }
        }
      `}</style>

      <div className="shfs-twocol">
        <div className="shfs-copy">{children}</div>
        <div className="shfs-video-wrap">
          <div className="shfs-shell" aria-label={`Featured Studio — ${HERO_FOCUS.title}`}>
            <div className="shfs-video-slot">
              {heroIntroSrc && !heroVideoBroken ? (
                <video
                  key={heroIntroSrc}
                  ref={videoRef}
                  src={heroIntroSrc}
                  poster={posterDataUrl ?? undefined}
                  muted
                  playsInline
                  controls
                  preload="metadata"
                  onLoadedData={onHeroLoadedData}
                  onError={(ev) => {
                    const el = ev.currentTarget;
                    const code = el.error?.code;
                    console.error("[StudiosHeroFeaturedStudios] hero video failed", {
                      requestedUrl: `${typeof window !== "undefined" ? window.location.origin : ""}${heroIntroSrc}`,
                      filename: STUDIOS_LANDING_HERO_INTRO.expectedFileHint,
                      mediaErrorCode: code,
                      networkState: el.networkState,
                      readyState: el.readyState,
                    });
                    setHeroVideoBroken(true);
                  }}
                  aria-label="Studios landing hero intro clip"
                />
              ) : (
                <div
                  role="img"
                  aria-label={`${HERO_FOCUS.title} — clip unavailable`}
                  style={
                    fallbackPoster
                      ? slotCoverBg(fallbackPoster)
                      : { position: "absolute", inset: 0, backgroundColor: "#1c1917" }
                  }
                />
              )}
              <span className="shfs-play-ornament">
                <span className="shfs-play-badge" aria-hidden>
                  <Play style={{ width: 20, height: 20 }} fill="currentColor" />
                </span>
              </span>
            </div>
            <div className="shfs-feature-meta">
              <p className="shfs-feature-title">{HERO_FOCUS.title}</p>
              <p className="shfs-feature-sub">{HERO_FOCUS.subcopy}</p>
              <div className="shfs-actions">{renderActions(HERO_FOCUS, openPreview)}</div>
              {heroVideoBroken ? (
                <p className="shfs-hero-video-fallback">
                  The hero clip couldn’t load in-browser (404 or unsupported format). Try{" "}
                  <a href={heroIntroSrc} target="_blank" rel="noreferrer noopener">
                    opening the MP4 directly
                  </a>{" "}
                  or check DevTools Network for <code>{heroIntroSrc}</code>.
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {modalOpen ? <StudioPreviewModal card={HERO_FOCUS} onClose={() => setModalOpen(false)} /> : null}
    </>
  );
}

function livePrimaryLabel(card: StudioStackCardData): string {
  if (card.id === "gap-u") return "Enter Gap U";
  return "Visit live Space";
}

function renderActions(card: StudioStackCardData, onPreview: () => void) {
  const href = card.exploreHref;

  if (card.preferLiveHeroCta && href) {
    return (
      <>
        <StudiosGatewayAwareLink href={href} actionLabel={livePrimaryLabel(card)} className="shfs-btn shfs-btn-live" scroll>
          {livePrimaryLabel(card)} <ArrowUpRight style={{ width: 13, height: 13 }} aria-hidden />
        </StudiosGatewayAwareLink>
        <button type="button" className="shfs-btn shfs-btn-ghost" onClick={onPreview}>
          Preview…
        </button>
      </>
    );
  }

  return (
    <>
      <button type="button" className="shfs-btn shfs-btn-primary-solid" onClick={onPreview}>
        Studio preview <ArrowRight style={{ width: 12, height: 12 }} aria-hidden />
      </button>
      {href ? (
        href.startsWith("#") ? (
          <Link href={href} className="shfs-btn shfs-btn-ghost">
            Browse demos <ArrowRight style={{ width: 11, height: 11 }} aria-hidden />
          </Link>
        ) : (
          <StudiosGatewayAwareLink href={href} actionLabel={livePrimaryLabel(card)} className="shfs-btn shfs-btn-ghost" scroll>
            Live Space <ArrowRight style={{ width: 11, height: 11 }} aria-hidden />
          </StudiosGatewayAwareLink>
        )
      ) : null}
    </>
  );
}
