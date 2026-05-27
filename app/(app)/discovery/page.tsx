"use client";
// app/(app)/discovery/page.tsx
// AIH Discovery Channel — subject navigation home.
// This page is NAVIGATION, not a content dump.
// Subject pages are the exploration hubs.

import { ArrowRight, Compass, ShieldCheck, Sparkles, Tv2, BookOpen, Users } from "lucide-react";
import Link from "next/link";
import { SUBJECTS } from "@/lib/discovery/catalog";
import { DiscoverySubjectCard } from "@/components/discovery/DiscoverySubjectCard";

const GUIDED_DISCOVERY_PATHS = [
  {
    title: "Core Explorers",
    ages: "Ages 5-10",
    subhead:
      "Build curiosity through experiments, stories, nature, numbers, making, and safe discovery.",
    tags: ["Experiments", "Stories", "Nature", "Numbers", "Making"],
    gradient: "linear-gradient(135deg, rgba(34,197,94,0.34), rgba(14,165,233,0.18))",
    accent: "#4ade80",
    href: "/discovery/core-explorers",
  },
  {
    title: "Advanced Explorers",
    ages: "Ages 11-18",
    subhead:
      "Go deeper into science, math, engineering, coding, history, logic, and real-world systems.",
    tags: ["Science", "Math", "Engineering", "Coding", "Systems"],
    gradient: "linear-gradient(135deg, rgba(59,130,246,0.34), rgba(168,85,247,0.18))",
    accent: "#60a5fa",
  },
  {
    title: "Career & Pro Studies",
    ages: "Teens+",
    subhead:
      "Explore future careers, AI, robotics, entrepreneurship, medicine, design, engineering, trades, and advanced learning tracks.",
    tags: ["AI", "Robotics", "Careers", "Design", "Trades"],
    gradient: "linear-gradient(135deg, rgba(217,70,239,0.28), rgba(245,158,11,0.18))",
    accent: "#f0abfc",
  },
] as const;

export default function DiscoveryHomePage() {
  return (
    <>
      <style>{`
        .disc-subject-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
        }
        @media (min-width: 480px) {
          .disc-subject-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (min-width: 860px) {
          .disc-subject-grid { grid-template-columns: repeat(3, 1fr); }
        }
        .disc-trails-row {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
        }
        @media (min-width: 700px) {
          .disc-trails-row {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }
        @media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
      `}</style>

      <div
        style={{
          minHeight: "calc(100vh - 60px)",
          background: "#0d0d0f",
          color: "#fff",
          paddingBottom: 80,
        }}
      >
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <div
          style={{
            width: "100%",
            borderBottom: "1px solid rgba(255,255,255,0.05)",
            background:
              "linear-gradient(180deg, rgba(99,102,241,0.14) 0%, transparent 100%)",
            padding: "clamp(32px,5vw,60px) clamp(16px,4vw,40px) clamp(28px,4vw,48px)",
          }}
        >
          <p
            style={{
              margin: "0 0 10px",
              fontSize: 10,
              fontWeight: 900,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "rgba(168,85,247,0.85)",
            }}
          >
            AIH Discovery Channel
          </p>

          <h1
            style={{
              margin: "0 0 14px",
              fontSize: "clamp(26px, 4.5vw, 48px)",
              fontWeight: 900,
              letterSpacing: "-0.04em",
              lineHeight: 1.06,
              color: "#fff",
              maxWidth: 600,
            }}
          >
            Where do you want{" "}
            <span
              style={{
                background: "linear-gradient(90deg, #818cf8, #c084fc)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              to explore?
            </span>
          </h1>

          <p
            style={{
              margin: "0 0 26px",
              fontSize: "clamp(13px, 1.6vw, 16px)",
              lineHeight: 1.6,
              color: "rgba(255,255,255,0.46)",
              maxWidth: 500,
            }}
          >
            Nine curated subjects. Hundreds of investigations, projects, and trails.
            Everything plays inside Safe View — no ads, no comments, no rabbit holes.
          </p>

          {/* Stat pills */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {[
              { icon: <Tv2 style={{ width: 12, height: 12 }} />, label: "9 Subjects" },
              { icon: <BookOpen style={{ width: 12, height: 12 }} />, label: "90+ Items" },
              { icon: <Users style={{ width: 12, height: 12 }} />, label: "All Ages" },
              { icon: <ShieldCheck style={{ width: 12, height: 12 }} />, label: "Safe View" },
            ].map(({ icon, label }) => (
              <span
                key={label}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "5px 12px", borderRadius: 20,
                  border: "1px solid rgba(255,255,255,0.10)",
                  background: "rgba(255,255,255,0.04)",
                  fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.56)",
                  letterSpacing: "0.02em",
                }}
              >
                {icon}
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* ── Subject grid ─────────────────────────────────────────────── */}
        <div
          style={{
            padding: "clamp(32px,4vw,52px) clamp(16px,4vw,40px) 0",
          }}
        >
          <div style={{ marginBottom: 20 }}>
            <h2
              style={{
                margin: 0,
                fontSize: "clamp(15px, 2vw, 18px)",
                fontWeight: 900,
                letterSpacing: "-0.025em",
                color: "rgba(255,255,255,0.9)",
              }}
            >
              Explore the World
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "rgba(255,255,255,0.32)", fontWeight: 500 }}>
              Every subject opens a new way to think, build, and discover.
            </p>
          </div>

          <div className="disc-subject-grid">
            {SUBJECTS.map((subject) => (
              <DiscoverySubjectCard key={subject.id} subject={subject} />
            ))}
          </div>
        </div>

        {/* ── Featured Trails ──────────────────────────────────────────── */}
        <div
          style={{
            padding: "clamp(44px,5vw,64px) clamp(16px,4vw,40px) 0",
          }}
        >
          <div style={{ marginBottom: 18 }}>
            <h2
              style={{
                margin: 0,
                fontSize: "clamp(15px, 2vw, 18px)",
                fontWeight: 900,
                letterSpacing: "-0.025em",
                color: "rgba(255,255,255,0.9)",
              }}
            >
              Guided Discovery Paths
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "rgba(255,255,255,0.32)", fontWeight: 500 }}>
              Start with wonder, go deeper with skill, and grow toward real-world mastery.
            </p>
          </div>

          <div className="disc-trails-row">
            {GUIDED_DISCOVERY_PATHS.map((path) => {
              const card = (
                <article
                key={path.title}
                style={{
                  minHeight: 260,
                  borderRadius: 22,
                  overflow: "hidden",
                  background: "rgba(255,255,255,0.045)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  boxShadow: "0 20px 70px rgba(0,0,0,0.22)",
                  display: "flex",
                  flexDirection: "column",
                  position: "relative",
                  height: "100%",
                }}
              >
                <div
                  style={{
                    background: path.gradient,
                    borderBottom: "1px solid rgba(255,255,255,0.10)",
                    padding: "24px 24px 22px",
                    minHeight: 90,
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 14,
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 14,
                      background: "rgba(0,0,0,0.26)",
                      border: "1px solid rgba(255,255,255,0.14)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 12px 30px rgba(0,0,0,0.22)",
                    }}
                  >
                    <Compass style={{ width: 22, height: 22, color: "#fff" }} />
                  </div>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      borderRadius: 999,
                      padding: "5px 10px",
                      background: "rgba(0,0,0,0.30)",
                      border: "1px solid rgba(255,255,255,0.13)",
                      color: "rgba(255,255,255,0.76)",
                      fontSize: 11,
                      fontWeight: 800,
                      whiteSpace: "nowrap",
                    }}
                  >
                    <Sparkles style={{ width: 12, height: 12, color: path.accent }} />
                    {path.ages}
                  </span>
                </div>

                <div
                  style={{
                    padding: "22px 24px 24px",
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <h3
                    style={{
                      margin: "0 0 8px",
                      fontSize: "clamp(18px, 2.1vw, 23px)",
                      fontWeight: 950,
                      letterSpacing: "-0.03em",
                      color: "#fff",
                      lineHeight: 1.1,
                    }}
                  >
                    {path.title}
                  </h3>

                  <p
                    style={{
                      margin: "0 0 18px",
                      color: "rgba(255,255,255,0.54)",
                      fontSize: 13,
                      lineHeight: 1.58,
                    }}
                  >
                    {path.subhead}
                  </p>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 22 }}>
                    {path.tags.map((tag) => (
                      <span
                        key={tag}
                        style={{
                          borderRadius: 8,
                          padding: "4px 9px",
                          background: `${path.accent}17`,
                          border: `1px solid ${path.accent}2f`,
                          color: path.accent,
                          fontSize: 11,
                          fontWeight: 750,
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <button
                    type="button"
                    style={{
                      marginTop: "auto",
                      alignSelf: "flex-start",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      borderRadius: 999,
                      border: "1px solid rgba(255,255,255,0.16)",
                      background: "rgba(255,255,255,0.08)",
                      color: "#fff",
                      padding: "9px 14px",
                      fontSize: 12,
                      fontWeight: 850,
                      cursor: "pointer",
                    }}
                    aria-label={`Explore ${path.title}`}
                  >
                    Explore
                    <ArrowRight style={{ width: 14, height: 14, color: path.accent }} />
                  </button>
                </div>
              </article>
              );

              if ("href" in path) {
                return (
                  <Link key={path.title} href={path.href} style={{ color: "inherit", textDecoration: "none" }}>
                    {card}
                  </Link>
                );
              }

              return card;
            })}
          </div>
        </div>

        {/* ── Safe View section ────────────────────────────────────────── */}
        <div
          style={{
            margin: "clamp(44px,5vw,64px) clamp(16px,4vw,40px) 0",
            padding: "clamp(24px,3.5vw,40px) clamp(20px,4vw,44px)",
            borderRadius: 20,
            background: "rgba(20,83,45,0.16)",
            border: "1px solid rgba(74,222,128,0.14)",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: 18, flexWrap: "wrap" }}>
            <div
              style={{
                width: 48, height: 48, borderRadius: 14, flexShrink: 0,
                background: "rgba(74,222,128,0.12)",
                border: "1px solid rgba(74,222,128,0.24)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <ShieldCheck style={{ width: 24, height: 24, color: "#4ade80" }} />
            </div>

            <div style={{ flex: 1, minWidth: 220 }}>
              <h2
                style={{
                  margin: "0 0 10px",
                  fontSize: "clamp(16px, 2vw, 20px)",
                  fontWeight: 900, letterSpacing: "-0.03em", color: "#fff",
                }}
              >
                How Safe View Works
              </h2>
              <p
                style={{
                  margin: "0 0 16px",
                  fontSize: 13, lineHeight: 1.6,
                  color: "rgba(255,255,255,0.48)", maxWidth: 560,
                }}
              >
                Every item on the Discovery Channel opens inside AIH Safe View — a fully
                contained player built for family learning. There is no autoplay queue, no
                comment section, no external links, and no recommendation engine pointing
                you away from what you chose to explore.
              </p>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))",
                  gap: 8,
                }}
              >
                {[
                  "Approved content only",
                  "No ads or sponsorships",
                  "No comment sections",
                  "No autoplay rabbit holes",
                  "No external links",
                  "Watch · Replay · Close",
                ].map((f) => (
                  <div
                    key={f}
                    style={{
                      display: "flex", alignItems: "center", gap: 8,
                      fontSize: 12, color: "rgba(255,255,255,0.58)", fontWeight: 600,
                    }}
                  >
                    <span
                      style={{
                        width: 5, height: 5, borderRadius: "50%",
                        background: "#4ade80", flexShrink: 0,
                      }}
                    />
                    {f}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Footer ───────────────────────────────────────────────────── */}
        <div
          style={{
            margin: "clamp(40px,5vw,56px) clamp(16px,4vw,40px) 0",
            textAlign: "center",
          }}
        >
          <p
            style={{
              margin: "0 0 6px", fontSize: 11, fontWeight: 700,
              letterSpacing: "0.1em", textTransform: "uppercase",
              color: "rgba(255,255,255,0.22)",
            }}
          >
            AIH Discovery Channel — MVP
          </p>
          <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.16)" }}>
            Full video library, parental controls, and saved trails coming soon.
          </p>
        </div>
      </div>
    </>
  );
}
