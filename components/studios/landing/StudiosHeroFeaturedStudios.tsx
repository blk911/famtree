"use client";

import Link from "next/link";
import { type ReactNode, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { ArrowRight, ArrowUpRight, Play } from "lucide-react";
import {
  FEATURED_STUDIO_VIDEO_CARDS,
  type StudioStackCardData,
  type StudioStackCardId,
} from "@/lib/studios/landing/studioStackData";
import { StudioPreviewModal } from "@/components/studios/landing/StudioPreviewModal";

const DEFAULT_ACTIVE_ID: StudioStackCardId = "private-client-network";

type Props = { children: ReactNode };

/** Two-column hero (copy + featured video) and horizontal studio example picker below. */
export function StudiosHeroFeaturedStudios({ children }: Props) {
  const [activeId, setActiveId] = useState<StudioStackCardId>(DEFAULT_ACTIVE_ID);
  const [modalOpen, setModalOpen] = useState(false);
  const [heroVideoBroken, setHeroVideoBroken] = useState(false);
  const active = FEATURED_STUDIO_VIDEO_CARDS.find((c) => c.id === activeId)!;
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    setHeroVideoBroken(false);
    videoRef.current?.pause();
    videoRef.current?.load();
  }, [activeId]);

  function openPreview() {
    setModalOpen(true);
  }

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
        .shfs-strip {
          width: 100%;
          max-width: min(1120px, 100%);
          margin: clamp(10px, 2vw, 18px) auto 0;
          padding-top: 2px;
        }
        .shfs-strip-label {
          font-size: 8px;
          font-weight: 800;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #a8a29e;
          margin: 0 0 6px;
          text-align: center;
        }
        @media (min-width: 880px) {
          .shfs-strip-label {
            text-align: left;
          }
        }
        .shfs-strip-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 8px;
        }
        @media (max-width: 900px) {
          .shfs-strip-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        @media (max-width: 520px) {
          .shfs-strip-grid {
            display: flex;
            flex-direction: row;
            flex-wrap: nowrap;
            overflow-x: auto;
            overflow-y: hidden;
            gap: 8px;
            padding: 2px 0 8px;
            margin: 0 -4px;
            scroll-snap-type: x proximity;
            scrollbar-width: thin;
            -webkit-overflow-scrolling: touch;
          }
          .shfs-ex-card {
            flex: 0 0 min(78vw, 260px);
            scroll-snap-align: start;
          }
        }
        .shfs-ex-card {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          padding: 6px 8px;
          border-radius: 10px;
          border: 1px solid rgba(28, 25, 23, 0.08);
          border-left-width: 2px;
          border-left-style: solid;
          border-left-color: transparent;
          background: rgba(255, 255, 255, 0.88);
          text-align: left;
          cursor: pointer;
          min-height: 52px;
          max-height: 58px;
          transition: transform 0.12s ease, box-shadow 0.12s ease, background 0.12s ease;
        }
        .shfs-ex-card:hover:not(.shfs-ex-card--active) {
          transform: translateY(-1px);
          box-shadow: 0 8px 18px rgba(38, 38, 38, 0.06);
        }
        .shfs-ex-card--active {
          background: rgba(255, 255, 255, 0.98);
          border-color: rgba(184, 149, 108, 0.28);
        }
        .shfs-ex-thumb {
          flex: 0 0 auto;
          width: 56px;
          height: 36px;
          border-radius: 6px;
          overflow: hidden;
          background-color: #e7e5e4;
        }
        .shfs-ex-thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .shfs-ex-copy {
          min-width: 0;
          flex: 1 1 auto;
        }
        .shfs-ex-title {
          margin: 0;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: -0.012em;
          color: #1c1917;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          line-height: 1.2;
        }
        .shfs-ex-desc {
          margin: 2px 0 0;
          font-size: 10px;
          line-height: 1.25;
          color: #78716c;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        @media (max-width: 879px) {
          .shfs-video-slot {
            max-height: 220px;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .shfs-btn:hover,
          .shfs-ex-card:hover {
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
          <div className="shfs-shell" aria-label={`Featured Studio — ${active.title}`}>
            <div className="shfs-video-slot">
              <span className="shfs-poster-tint" style={{ backgroundImage: `url(${active.foldImageUrl})` }} />
              {active.videoSrc && !heroVideoBroken ? (
                <video
                  key={active.id}
                  ref={videoRef}
                  src={active.videoSrc}
                  poster={active.foldImageUrl}
                  muted
                  playsInline
                  controls
                  preload="metadata"
                  onError={() => setHeroVideoBroken(true)}
                  aria-label={`Featured clip — ${active.videoLabel}`}
                />
              ) : (
                <div role="img" aria-label={active.title} style={posterOnlyStyle(active)} />
              )}
              <span className="shfs-play-ornament">
                <span className="shfs-play-badge" aria-hidden>
                  <Play style={{ width: 20, height: 20 }} fill="currentColor" />
                </span>
              </span>
            </div>
            <div className="shfs-feature-meta">
              <p className="shfs-feature-title">{active.title}</p>
              <p className="shfs-feature-sub">{active.subcopy}</p>
              <div className="shfs-actions">{renderActions(active, openPreview)}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="shfs-strip" aria-label="Studio examples">
        <p className="shfs-strip-label">Studio examples</p>
        <div className="shfs-strip-grid" role="tablist">
          {FEATURED_STUDIO_VIDEO_CARDS.map((card) => {
            const selected = card.id === activeId;
            return (
              <button
                key={card.id}
                role="tab"
                type="button"
                aria-selected={selected}
                className={`shfs-ex-card ${selected ? "shfs-ex-card--active" : ""}`}
                style={
                  selected
                    ? ({
                        borderLeftColor: card.accent,
                        backgroundColor: card.accentSoft,
                      } as CSSProperties)
                    : undefined
                }
                aria-label={`Show ${card.title}`}
                onClick={() => {
                  setActiveId(card.id);
                  setModalOpen(false);
                }}
              >
                <span className="shfs-ex-thumb" aria-hidden>
                  <img src={card.foldImageUrl} alt="" loading="lazy" decoding="async" />
                </span>
                <span className="shfs-ex-copy">
                  <span className="shfs-ex-title">{card.title}</span>
                  <span className="shfs-ex-desc">{card.playlistDescriptor}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {modalOpen ? <StudioPreviewModal card={active} onClose={() => setModalOpen(false)} /> : null}
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
        <Link href={href} className="shfs-btn shfs-btn-live" scroll>
          {livePrimaryLabel(card)} <ArrowUpRight style={{ width: 13, height: 13 }} aria-hidden />
        </Link>
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
          <Link href={href} className="shfs-btn shfs-btn-ghost" scroll>
            Live Space <ArrowRight style={{ width: 11, height: 11 }} aria-hidden />
          </Link>
        )
      ) : null}
    </>
  );
}

function posterOnlyStyle(card: StudioStackCardData): CSSProperties {
  return {
    width: "100%",
    height: "100%",
    backgroundImage: `url(${card.foldImageUrl})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
  };
}
