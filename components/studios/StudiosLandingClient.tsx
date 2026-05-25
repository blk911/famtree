"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, X } from "lucide-react";
import { StudiosHeroFeaturedStudios } from "@/components/studios/landing/StudiosHeroFeaturedStudios";
import {
  StudiosGatewayProvider,
  StudiosGatewayAwareLink,
  type SerializedStudiosGatewayContext,
} from "@/components/studios/gateway/StudiosGatewayRoot";
import { MOCK_TESTIMONIALS } from "@/lib/studios/mockStudios";
import { LIVE_STUDIO_SHOWCASE_CARDS } from "@/lib/studios/liveStudioShowcase";
import { StudiosFooter } from "@/components/studios/StudiosFooter";
import { STUDIOS_INK, STUDIOS_LINE, STUDIOS_MUTED } from "@/lib/studios/visual";

const ink = STUDIOS_INK;
const muted = STUDIOS_MUTED;
const line = STUDIOS_LINE;

const GAP_U_STUDENT_VID = "/uploads/Gap promo 1.mp4";

// ─── Student video modal ───────────────────────────────────────────────────────

function StudentVideoModal({ onClose }: { onClose: () => void }) {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.78)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "20px",
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          width: "100%", maxWidth: 780,
          borderRadius: 16,
          overflow: "hidden",
          background: "#000",
          boxShadow: "0 24px 64px rgba(0,0,0,0.55)",
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Close video"
          style={{
            position: "absolute", top: 12, right: 12, zIndex: 10,
            background: "rgba(0,0,0,0.55)", border: "none", borderRadius: "50%",
            width: 36, height: 36, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff",
          }}
        >
          <X style={{ width: 18, height: 18 }} />
        </button>

        {/* Title bar */}
        <div style={{
          padding: "14px 20px 10px",
          background: "linear-gradient(180deg, rgba(0,0,0,0.7) 0%, transparent 100%)",
          position: "absolute", top: 0, left: 0, right: 0, zIndex: 5,
          pointerEvents: "none",
        }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#fff", letterSpacing: "0.03em" }}>
            🎓 Hear from Gap U Students
          </p>
        </div>

        <video
          src={GAP_U_STUDENT_VID}
          controls
          autoPlay
          playsInline
          style={{ display: "block", width: "100%", maxHeight: "72vh", background: "#000" }}
        />
      </div>
    </div>
  );
}

type LandingProps = { serializedGateway?: SerializedStudiosGatewayContext | null };

export function StudiosLanding({ serializedGateway = null }: LandingProps) {
  const [studentVidOpen, setStudentVidOpen] = useState(false);
  const openStudentVid = useCallback(() => setStudentVidOpen(true), []);
  const closeStudentVid = useCallback(() => setStudentVidOpen(false), []);

  return (
    <StudiosGatewayProvider gateway={serializedGateway}>
      <>
      <style>{`
        .lss-wrap {
          max-width: 1180px;
          margin-left: auto;
          margin-right: auto;
          padding-bottom: clamp(10px, 2vw, 16px);
        }
        .lss-sectionHead {
          text-align: center;
          margin-bottom: clamp(18px, 3.5vw, 28px);
        }
        .lss-sectionEyebrow {
          margin: 0 0 8px;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: #a8a29e;
        }
        .lss-headline {
          margin: 0 0 8px;
          font-size: clamp(20px, 2.5vw, 26px);
          font-weight: 800;
          letter-spacing: -0.5px;
          color: ${ink};
        }
        .lss-subline {
          margin: 0 auto;
          font-size: clamp(13px, 1.4vw, 15px);
          line-height: 1.52;
          color: ${muted};
          max-width: 44rem;
          font-weight: 500;
        }
        .lss-grid {
          display: grid;
          gap: 16px;
          align-items: stretch;
        }
        @media (min-width: 1060px) {
          .lss-grid {
            grid-template-columns: minmax(0, 1.13fr) repeat(3, minmax(0, 1fr));
            gap: 18px;
          }
        }
        @media (min-width: 700px) and (max-width: 1059px) {
          .lss-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 16px;
          }
        }
        @media (max-width: 699px) {
          .lss-grid {
            display: flex;
            flex-direction: row;
            flex-wrap: nowrap;
            gap: 14px;
            overflow-x: auto;
            overscroll-behavior-x: contain;
            scroll-snap-type: x mandatory;
            padding: 4px 0 14px;
            margin: 0 -8px;
            padding-left: 12px;
            padding-right: 12px;
            -webkit-overflow-scrolling: touch;
          }
          .lss-grid .lss-card {
            flex: 0 0 min(420px, 88vw);
            scroll-snap-align: start;
            max-width: 100%;
          }
        }
        .lss-card {
          display: flex;
          flex-direction: column;
          height: 100%;
          min-height: 0;
          text-align: left;
          text-decoration: none;
          color: inherit;
          font-family: inherit;
          background: rgba(255, 255, 255, 0.94);
          border: 1px solid rgba(28, 25, 23, 0.08);
          border-radius: 18px;
          overflow: hidden;
          box-shadow: 0 10px 32px rgba(28, 25, 23, 0.07), 0 2px 6px rgba(28, 25, 23, 0.04);
          transition: transform 0.14s ease, box-shadow 0.14s ease;
          cursor: pointer;
        }
        .lss-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 18px 48px rgba(28, 25, 23, 0.1), 0 4px 12px rgba(28, 25, 23, 0.05);
        }
        .lss-card:focus-visible {
          outline: 2px solid rgba(157, 23, 77, 0.5);
          outline-offset: 2px;
        }
        .lss-card--featured {
          border-color: rgba(157, 23, 77, 0.24);
          background: linear-gradient(168deg, #fffefb 0%, #fffefd 52%, #fff 100%);
          box-shadow: 0 16px 44px rgba(157, 23, 77, 0.1), 0 6px 18px rgba(28, 25, 23, 0.06);
        }
        .lss-card--featured:hover {
          box-shadow: 0 22px 56px rgba(157, 23, 77, 0.12), 0 8px 20px rgba(28, 25, 23, 0.07);
        }
        .lss-visual {
          position: relative;
          aspect-ratio: 4 / 3;
          min-height: clamp(148px, 22vw, 192px);
          background: #e7e5e4;
        }
        .lss-visual img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .lss-visual::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(to top, rgba(28, 25, 23, 0.35) 0%, transparent 45%);
          pointer-events: none;
        }
        .lss-card--featured .lss-visual::after {
          background: linear-gradient(to top, rgba(125, 20, 60, 0.28) 0%, transparent 50%);
        }
        .lss-body {
          display: flex;
          flex-direction: column;
          flex: 1 1 auto;
          padding: 14px 16px 17px;
          gap: 6px;
        }
        .lss-eyebrow {
          margin: 0;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.09em;
          text-transform: uppercase;
          color: #78716c;
          line-height: 1.35;
        }
        .lss-card--featured .lss-eyebrow {
          color: #9d174d;
          letter-spacing: 0.1em;
        }
        .lss-title {
          margin: 0;
          font-size: clamp(17px, 2vw, 19px);
          font-weight: 800;
          letter-spacing: -0.35px;
          line-height: 1.17;
          color: ${ink};
        }
        .lss-sub {
          margin: 0 0 auto;
          font-size: 12px;
          line-height: 1.48;
          color: ${muted};
          flex: 1 1 auto;
        }
        .lss-cta {
          margin-top: 10px;
          font-size: 12px;
          font-weight: 800;
          color: #57534e;
          letter-spacing: 0.01em;
        }
        .lss-card--featured .lss-cta {
          color: #9d174d;
        }
        @media (prefers-reduced-motion: reduce) {
          .lss-card:hover {
            transform: none;
          }
        }
        .studios-hero-ribbon {
          max-width: min(820px, 94vw);
          margin: 0 auto clamp(10px, 2vw, 16px);
          padding: 0 12px clamp(10px, 1.8vw, 14px);
          text-align: center;
          border-bottom: 1px solid rgba(184, 149, 108, 0.35);
          color: #8f7349;
          font-size: clamp(12px, 2vw, 14.5px);
          font-weight: 700;
          letter-spacing: 0.035em;
          line-height: 1.35;
        }
        .studios-hero-copy-inner {
          max-width: 520px;
          margin-left: auto;
          margin-right: auto;
        }
        .studios-hero-pitch-copy p {
          max-width: 48ch;
        }
        @media (min-width: 880px) {
          .studios-hero-copy-inner {
            margin-left: 0;
            margin-right: 0;
            max-width: min(460px, 100%);
          }
        }
        .studios-hero-explore {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 10px;
          margin-top: 14px;
          justify-content: center;
        }
        .studios-hero-explore-btn:hover {
          transform: translateY(-1px);
        }
        @media (min-width: 880px) {
          .studios-hero-explore {
            justify-content: flex-start;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .studios-hero-explore-btn:hover {
            transform: none !important;
          }
        }
      `}</style>

      <section
        style={{
          position: "relative",
          padding: "clamp(10px, 2.2vw, 20px) 16px clamp(16px, 2.5vw, 22px)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "-36px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "min(520px, 92vw)",
            height: "140px",
            background: "radial-gradient(circle, rgba(255, 218, 230, 0.38) 0%, transparent 72%)",
            filter: "blur(18px)",
            pointerEvents: "none",
          }}
        />

        <p className="studios-hero-ribbon">
          Empowering personal connections in an automated world.
        </p>

        <StudiosHeroFeaturedStudios>
          <div className="studios-hero-copy-inner">
            <div className="studios-hero-pitch-copy">
              <h1
                style={{
                  fontSize: "clamp(24px, 3.85vw, 38px)",
                  fontWeight: 800,
                  letterSpacing: "-1.2px",
                  lineHeight: 1.05,
                  marginBottom: "10px",
                  marginTop: 0,
                  color: ink,
                }}
              >
                Where humans{" "}
                <span style={{ color: "#b8956c" }}>connect</span>
              </h1>

              <p
                style={{
                  fontSize: "clamp(14px, 1.85vw, 16px)",
                  lineHeight: 1.5,
                  color: muted,
                  margin: "0 0 10px",
                  fontWeight: 500,
                }}
              >
                The world is filling up with automated replies and optimized feeds. Studios is the opposite — a private place for trainers and wellness pros to build{" "}
                <strong style={{ color: ink, fontWeight: 700 }}>relationships that matter</strong>, with clients who earn access instead of arriving anonymously at scale.
              </p>

              <div className="studios-hero-explore" aria-label="Explore Studios">
                <Link
                  href="/studios/gap-u"
                  className="studios-hero-explore-btn"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "9px 16px",
                    borderRadius: "999px",
                    background: "#fdf2f8",
                    color: "#9d174d",
                    fontSize: "13px",
                    fontWeight: 700,
                    textDecoration: "none",
                    border: "1px solid rgba(157, 23, 77, 0.2)",
                    transition: "transform 0.12s ease, box-shadow 0.12s ease",
                  }}
                >
                  Explore Gap U <ArrowRight style={{ width: "14px", height: "14px" }} aria-hidden />
                </Link>
                <Link
                  href="#studios-live"
                  className="studios-hero-explore-btn"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "9px 16px",
                    borderRadius: "999px",
                    background: "#fff",
                    color: ink,
                    fontSize: "13px",
                    fontWeight: 700,
                    textDecoration: "none",
                    border: `1px solid ${line}`,
                    transition: "transform 0.12s ease, box-shadow 0.12s ease",
                  }}
                >
                  See live pages <ArrowRight style={{ width: "14px", height: "14px" }} aria-hidden />
                </Link>
              </div>
            </div>
          </div>
        </StudiosHeroFeaturedStudios>
      </section>

      <section style={{ padding: "24px 20px 40px", background: "linear-gradient(180deg, transparent 0%, rgba(253,252,251,0.55) 30%, transparent 100%)" }}>
        <div className="lss-wrap">
          <div id="studios-live" style={{ scrollMarginTop: "72px" }}>
            <header className="lss-sectionHead">
              <p className="lss-sectionEyebrow">Live studio examples</p>
              <h2 className="lss-headline">Live studio pages</h2>
              <p className="lss-subline">
                Private relationship-driven spaces built on AIH Studios.
              </p>
            </header>
            {/* Desktop/tablet grid; narrow screens swap to horizontal scroll for premium pacing */}
            <div className="lss-grid">
              {LIVE_STUDIO_SHOWCASE_CARDS.map((card) => (
                <StudiosGatewayAwareLink
                  key={card.id}
                  href={card.href}
                  prefetch={false}
                  actionLabel={card.ctaLabel.replace(/\s*→\s*$/, "").trim()}
                  className={`lss-card ${card.featured ? "lss-card--featured" : ""}`}
                >
                  <div className="lss-visual">
                    <img src={card.imageSrc} alt={card.imageAlt} loading="lazy" decoding="async" />
                  </div>
                  <div className="lss-body">
                    <p className="lss-eyebrow">{card.categoryLabel}</p>
                    <h3 className="lss-title">{card.title}</h3>
                    <p className="lss-sub">{card.subtitle}</p>
                    <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                      <span className="lss-cta">{card.ctaLabel}</span>
                      {card.id === "gap-u" && (
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); openStudentVid(); }}
                          style={{
                            display: "inline-flex", alignItems: "center", gap: 4,
                            background: "none", border: "none", padding: 0,
                            cursor: "pointer", fontSize: 13, fontWeight: 700,
                            color: "#9d174d", textDecoration: "underline",
                            textDecorationStyle: "dotted", textUnderlineOffset: 3,
                            letterSpacing: "0.01em",
                          }}
                          aria-label="Watch Gap University student testimonials"
                        >
                          🎓 Testimonials
                        </button>
                      )}
                    </div>
                  </div>
                </StudiosGatewayAwareLink>
              ))}
            </div>
          </div>

          <div
            style={{
              marginTop: "clamp(28px, 4.5vw, 40px)",
              padding: "22px 18px",
              borderRadius: "16px",
              background: "rgba(255,255,255,0.65)",
              border: `1px solid ${line}`,
            }}
          >
            <p
              style={{
                fontSize: "11px",
                fontWeight: 800,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: muted,
                textAlign: "center",
                marginBottom: "14px",
              }}
            >
              Operators on Studios
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "14px" }}>
              {MOCK_TESTIMONIALS.map((t) => (
                <blockquote
                  key={t.id}
                  style={{
                    margin: 0,
                    padding: "14px 16px",
                    borderRadius: "12px",
                    background: "#fff",
                    border: `1px solid ${line}`,
                  }}
                >
                  <p style={{ fontSize: "13px", lineHeight: 1.55, color: "#404040", marginBottom: "10px", fontStyle: "italic" }}>
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <footer style={{ fontSize: "12px", fontWeight: 700, color: ink }}>{t.attribution}</footer>
                  {t.role && <div style={{ fontSize: "11px", color: muted, marginTop: "3px" }}>{t.role}</div>}
                </blockquote>
              ))}
            </div>
          </div>
        </div>
      </section>

      <StudiosFooter />

      {studentVidOpen && <StudentVideoModal onClose={closeStudentVid} />}
      </>
    </StudiosGatewayProvider>
  );
}
