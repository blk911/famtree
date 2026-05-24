"use client";

import Link from "next/link";
import { ChevronRight, Sparkles } from "lucide-react";
import { StudiosHeroFeaturedStudios } from "@/components/studios/landing/StudiosHeroFeaturedStudios";
import { MOCK_TESTIMONIALS, MOCK_PROVIDERS } from "@/lib/studios/mockStudios";
import { StudiosFooter } from "@/components/studios/StudiosFooter";
import { PROVIDER_CATEGORY_LABELS } from "@/types/studios";
import { STUDIOS_CARD_SHADOW, STUDIOS_INK, STUDIOS_LINE, STUDIOS_MUTED } from "@/lib/studios/visual";

const ink = STUDIOS_INK;
const muted = STUDIOS_MUTED;
const line = STUDIOS_LINE;
const cardShadow = STUDIOS_CARD_SHADOW;

export function StudiosLanding() {
  return (
    <>
      <style>{`
        .studios-lp-studio-card:hover { transform: translateY(-1px); }
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
          .studios-hero-badge-row {
            justify-content: flex-start !important;
          }
        }
        .studios-hero-explore {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 4px 10px;
          margin-top: 4px;
          justify-content: center;
        }
        .studios-hero-explore-link {
          font-size: 12px;
          font-weight: 700;
          text-decoration: none;
          border-bottom: 1px solid transparent;
          padding-bottom: 1px;
          transition: border-color 0.15s ease, color 0.15s ease;
        }
        .studios-hero-explore-link:hover {
          border-bottom-color: currentColor;
        }
        .studios-hero-explore-sep {
          color: rgba(168, 162, 158, 0.95);
          font-size: 12px;
          user-select: none;
        }
        @media (min-width: 880px) {
          .studios-hero-explore {
            justify-content: flex-start;
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
            <div
              className="studios-hero-badge-row"
              style={{
                display: "flex",
                justifyContent: "center",
                marginBottom: "12px",
              }}
            >
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "7px",
                  padding: "6px 14px",
                  borderRadius: "999px",
                  background: "#fff",
                  border: `1px solid ${line}`,
                  boxShadow: "0 1px 2px rgba(0, 0, 0, 0.04)",
                  fontSize: "10px",
                  fontWeight: 700,
                  color: muted,
                  letterSpacing: "0.09em",
                  textTransform: "uppercase",
                }}
              >
                <Sparkles style={{ width: "12px", height: "12px", color: "#d4a574" }} />
                AIH Studios · Beta
              </div>
            </div>

            <div className="studios-hero-pitch-copy">
              <h1
                style={{
                  fontSize: "clamp(24px, 3.85vw, 38px)",
                  fontWeight: 800,
                  letterSpacing: "-1.2px",
                  lineHeight: 1.05,
                  marginBottom: "10px",
                  color: ink,
                }}
              >
                Where humans
                <span style={{ color: "#b8956c" }}> still connect</span>
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

              <div className="studios-hero-explore" aria-label="Secondary navigation">
                <Link href="/studios/gap-u" className="studios-hero-explore-link" style={{ color: "#9d174d" }}>
                  Explore Gap U
                </Link>
                <span className="studios-hero-explore-sep" aria-hidden>
                  ·
                </span>
                <Link href="#studios-live" className="studios-hero-explore-link" style={{ color: ink }}>
                  See live pages
                </Link>
              </div>
            </div>
          </div>
        </StudiosHeroFeaturedStudios>
      </section>

      <section style={{ padding: "18px 20px 36px" }}>
        <div style={{ maxWidth: "960px", margin: "0 auto" }}>
          <div id="studios-live" style={{ scrollMarginTop: "72px" }}>
            <h2
              style={{
                fontSize: "clamp(17px, 2.4vw, 21px)",
                fontWeight: 800,
                textAlign: "center",
                marginBottom: "6px",
                letterSpacing: "-0.3px",
                color: ink,
              }}
            >
              Live studio pages
            </h2>
            <p
              style={{
                fontSize: "13px",
                color: muted,
                textAlign: "center",
                marginBottom: "18px",
              }}
            >
              Same layout you launch — explore examples below.
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                gap: "12px",
                marginBottom: "28px",
              }}
            >
              <Link
                className="studios-lp-studio-card"
                href="/studios/gap-u"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                  padding: "16px",
                  borderRadius: "14px",
                  background: "linear-gradient(165deg, #fdf2f8 0%, #fff 60%)",
                  border: "1px solid rgba(157, 23, 77, 0.18)",
                  boxShadow: cardShadow,
                  textDecoration: "none",
                  color: ink,
                  transition: "transform 0.12s ease",
                  gridColumn: "1 / -1",
                  maxWidth: "100%",
                }}
              >
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 800,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "#9d174d",
                  }}
                >
                  Flagship live Studio
                </span>
                <span style={{ fontSize: "16px", fontWeight: 800 }}>Gap U Learning Lab</span>
                <span style={{ fontSize: "12px", color: muted, lineHeight: 1.45 }}>
                  Future learning · homeschool pods · invention labs — invite-only, not a public feed.
                </span>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "13px",
                    fontWeight: 700,
                    marginTop: "4px",
                    color: "#9d174d",
                  }}
                >
                  Explore Gap U <ChevronRight style={{ width: "14px", height: "14px" }} />
                </span>
              </Link>
              {MOCK_PROVIDERS.filter((p) => p.active).map((p) => (
                <Link
                  key={p.id}
                  className="studios-lp-studio-card"
                  href={`/studios/${p.slug}`}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                    padding: "16px",
                    borderRadius: "14px",
                    background: "#fff",
                    border: `1px solid ${line}`,
                    boxShadow: cardShadow,
                    textDecoration: "none",
                    color: ink,
                    transition: "transform 0.12s ease",
                  }}
                >
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 800,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: muted,
                    }}
                  >
                    {PROVIDER_CATEGORY_LABELS[p.category] ?? p.category}
                  </span>
                  <span style={{ fontSize: "16px", fontWeight: 800 }}>{p.displayName}</span>
                  {p.locationLabel && <span style={{ fontSize: "12px", color: muted }}>{p.locationLabel}</span>}
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "13px", fontWeight: 700, marginTop: "4px" }}>
                    View <ChevronRight style={{ width: "14px", height: "14px" }} />
                  </span>
                </Link>
              ))}
            </div>
          </div>

          <div
            style={{
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
    </>
  );
}
