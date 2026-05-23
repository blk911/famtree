"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { ArrowRight, ArrowUpRight, Play } from "lucide-react";
import {
  FEATURED_STUDIO_VIDEO_CARDS,
  type StudioStackCardData,
  type StudioStackCardId,
} from "@/lib/studios/landing/studioStackData";
import { StudioPreviewModal } from "@/components/studios/landing/StudioPreviewModal";

const DEFAULT_ACTIVE_ID: StudioStackCardId = "private-client-network";

/** Center video + meta and slim playlist rail plug into a 3-column hero via `display:contents` bridge. */
export function FeaturedStudioPlaylist() {
  const [activeId, setActiveId] = useState<StudioStackCardId>(DEFAULT_ACTIVE_ID);
  const [modalOpen, setModalOpen] = useState(false);
  /** When `/uploads/*.mp4` is missing on the host, fall back to static poster instead of infinite spinner/black. */
  const [heroVideoBroken, setHeroVideoBroken] = useState(false);
  const active = FEATURED_STUDIO_VIDEO_CARDS.find((c) => c.id === activeId)!;
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    setHeroVideoBroken(false);
    videoRef.current?.pause();
    if (videoRef.current) videoRef.current.load();
  }, [activeId]);

  function openPreview() {
    setModalOpen(true);
  }

  return (
    <>
      <style>{`
        .fsp-grid-bridge {
          display: contents;
        }
        .fsp-center {
          min-width: 0;
          width: 100%;
        }
        .fsp-shell {
          border-radius: 15px;
          overflow: hidden;
          background: #fff;
          border: 1px solid rgba(28, 25, 23, 0.085);
          box-shadow:
            0 10px 28px rgba(38, 38, 38, 0.08),
            0 1px 4px rgba(38, 38, 38, 0.04);
        }
        .fsp-video-slot {
          position: relative;
          width: 100%;
          aspect-ratio: 16 / 9;
          max-height: 236px;
          background: radial-gradient(circle at 30% 20%, rgba(255,255,255,0.08), transparent 52%), #171412;
          overflow: hidden;
        }
        .fsp-video-slot video {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          background: #1c1917;
        }
        .fsp-poster-tint {
          position: absolute;
          inset: 0;
          background-size: cover;
          background-position: center;
          opacity: 0.08;
          pointer-events: none;
        }
        .fsp-play-ornament {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
          transition: opacity 0.22s ease;
          opacity: 0.72;
        }
        .fsp-video-slot:hover .fsp-play-ornament {
          opacity: 1;
        }
        .fsp-play-badge {
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
        .fsp-feature-meta {
          padding: 9px 12px 10px;
          border-top: 1px solid rgba(28, 25, 23, 0.06);
        }
        .fsp-feature-title {
          margin: 0 0 3px;
          font-size: 15px;
          font-weight: 800;
          letter-spacing: -0.022em;
          color: #1c1917;
        }
        .fsp-feature-sub {
          margin: 0 0 8px;
          font-size: 11px;
          line-height: 1.4;
          color: #78716c;
        }
        .fsp-actions {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 7px;
        }
        .fsp-btn {
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
        .fsp-btn:hover {
          transform: translateY(-1px);
        }
        .fsp-btn-primary-solid {
          background: #292524;
          color: #fafaf9;
        }
        .fsp-btn-live {
          background: #9d174d;
          border-color: rgba(157, 23, 77, 0.3);
          color: #fff;
        }
        .fsp-btn-ghost {
          background: rgba(255, 255, 255, 0.92);
          color: #44403c;
          border-color: rgba(28, 25, 23, 0.12);
        }

        .fsp-rail {
          min-width: 0;
          width: 100%;
          align-self: start;
          padding-top: 2px;
        }
        .fsp-divider-label {
          font-size: 8px;
          font-weight: 800;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #a8a29e;
          margin: 0 0 5px;
        }
        .fsp-playlist {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .fsp-pl-row {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          padding: 4px 6px;
          border-radius: 8px;
          border: 1px solid rgba(28, 25, 23, 0.07);
          border-left-width: 2px;
          border-left-style: solid;
          border-left-color: transparent;
          background: rgba(247, 247, 245, 0.85);
          text-align: left;
          cursor: pointer;
          min-height: 50px;
          max-height: 56px;
          transition: transform 0.12s ease, box-shadow 0.12s ease, background 0.12s ease;
        }
        .fsp-pl-row:hover:not(.fsp-pl-row--active) {
          transform: translateY(-1px);
          box-shadow: inset 0 0 0 1px rgba(28, 25, 23, 0.1), 0 10px 20px rgba(38,38,38,0.06);
        }
        .fsp-pl-row--active {
          background: rgba(255, 255, 255, 0.98);
          border-color: rgba(184, 149, 108, 0.28);
        }
        .fsp-pl-thumb {
          flex: 0 0 auto;
          width: 72px;
          height: 40px;
          border-radius: 6px;
          overflow: hidden;
          flex-shrink: 0;
          background-color: #e7e5e4;
        }
        .fsp-pl-thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .fsp-pl-copy {
          min-width: 0;
          flex: 1 1 auto;
          display: flex;
          flex-direction: column;
          gap: 1px;
        }
        .fsp-pl-title {
          margin: 0;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: -0.012em;
          color: #1c1917;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          line-height: 1.2;
        }
        .fsp-pl-desc {
          margin: 0;
          font-size: 10px;
          line-height: 1.25;
          color: #78716c;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        @media (prefers-reduced-motion: reduce) {
          .fsp-btn:hover,
          .fsp-pl-row:hover {
            transform: none !important;
          }
          .fsp-play-ornament {
            opacity: 0.9 !important;
          }
        }

        @media (max-width: 879px) {
          .fsp-video-slot {
            max-height: 200px;
          }
          .fsp-feature-meta {
            padding: 8px 11px 9px;
          }
          .fsp-rail {
            padding-top: 0;
          }
          .fsp-playlist {
            flex-direction: row;
            flex-wrap: nowrap;
            overflow-x: auto;
            overflow-y: hidden;
            gap: 8px;
            padding: 4px 0 6px;
            margin: 0 -4px;
            scroll-snap-type: x proximity;
            scrollbar-width: thin;
          }
          .fsp-pl-row {
            flex: 0 0 auto;
            width: min(74vw, 240px);
            scroll-snap-align: start;
            min-height: 52px;
            max-height: 56px;
            padding-inline: 8px;
          }
          .fsp-pl-thumb {
            width: 68px;
            height: 38px;
          }
        }
      `}</style>

      <div className="fsp-grid-bridge">
        <div className="fsp-center">
          <div className="fsp-shell" aria-label={`Featured Studio — ${active.title}`}>
            <div className="fsp-video-slot">
              <span className="fsp-poster-tint" style={{ backgroundImage: `url(${active.foldImageUrl})` }} />
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
              <span className="fsp-play-ornament">
                <span className="fsp-play-badge" aria-hidden>
                  <Play style={{ width: 20, height: 20 }} fill="currentColor" />
                </span>
              </span>
            </div>
            <div className="fsp-feature-meta">
              <p className="fsp-feature-title">{active.title}</p>
              <p className="fsp-feature-sub">{active.subcopy}</p>
              <div className="fsp-actions">{renderActions(active, openPreview)}</div>
            </div>
          </div>
        </div>

        <aside className="fsp-rail" aria-label="Studio playlist">
          <p className="fsp-divider-label">Up next</p>
          <div className="fsp-playlist" role="tablist">
            {FEATURED_STUDIO_VIDEO_CARDS.map((card) => {
              const selected = card.id === activeId;
              return (
                <button
                  key={card.id}
                  role="tab"
                  type="button"
                  aria-selected={selected}
                  className={`fsp-pl-row ${selected ? "fsp-pl-row--active" : ""}`}
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
                  <span className="fsp-pl-thumb" aria-hidden>
                    <img src={card.foldImageUrl} alt="" loading="lazy" decoding="async" />
                  </span>
                  <span className="fsp-pl-copy">
                    <span className="fsp-pl-title">{card.title}</span>
                    <span className="fsp-pl-desc">{card.playlistDescriptor}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </aside>
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
        <Link href={href} className="fsp-btn fsp-btn-live" scroll>
          {livePrimaryLabel(card)} <ArrowUpRight style={{ width: 13, height: 13 }} aria-hidden />
        </Link>
        <button type="button" className="fsp-btn fsp-btn-ghost" onClick={onPreview}>
          Preview…
        </button>
      </>
    );
  }

  return (
    <>
      <button type="button" className="fsp-btn fsp-btn-primary-solid" onClick={onPreview}>
        Studio preview <ArrowRight style={{ width: 12, height: 12 }} aria-hidden />
      </button>
      {href ? (
        href.startsWith("#") ? (
          <Link href={href} className="fsp-btn fsp-btn-ghost">
            Browse demos <ArrowRight style={{ width: 11, height: 11 }} aria-hidden />
          </Link>
        ) : (
          <Link href={href} className="fsp-btn fsp-btn-ghost" scroll>
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
