"use client";

import Link from "next/link";
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

/** Two-column hero (copy + single featured Gap U reel). Studio-example strip removed. */
export function StudiosHeroFeaturedStudios({ children }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [heroVideoBroken, setHeroVideoBroken] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    setHeroVideoBroken(false);
    videoRef.current?.load();
  }, []);

  function openPreview() {
    setModalOpen(true);
  }

  const heroIntroSrc = STUDIOS_LANDING_HERO_INTRO.videoSrc;
  const poster = HERO_FOCUS.foldImageUrl;

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
        }
        .shfs-shell {
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
          aspect-ratio: 16 / 9;
          max-height: 272px;
          background: radial-gradient(circle at 30% 20%, rgba(255,255,255,0.08), transparent 52%), #171412;
          overflow: hidden;
        }
        .shfs-video-slot video {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          background: #1c1917;
        }
        .shfs-poster-tint {
          position: absolute;
          inset: 0;
          background-size: cover;
          background-position: center;
          opacity: 0.08;
          pointer-events: none;
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
        @media (max-width: 879px) {
          .shfs-video-slot {
            max-height: 220px;
          }
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
              <span className="shfs-poster-tint" style={{ backgroundImage: `url(${poster})` }} />
              {heroIntroSrc && !heroVideoBroken ? (
                <video
                  ref={videoRef}
                  src={heroIntroSrc}
                  poster={poster}
                  muted
                  playsInline
                  controls
                  preload="metadata"
                  onError={() => setHeroVideoBroken(true)}
                  aria-label={`Studios hero intro`}
                />
              ) : (
                <div role="img" aria-label={HERO_FOCUS.title} style={posterOnlyStyle(poster)} />
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

function posterOnlyStyle(foldImageUrl: string): CSSProperties {
  return {
    width: "100%",
    height: "100%",
    backgroundImage: `url(${foldImageUrl})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
  };
}
