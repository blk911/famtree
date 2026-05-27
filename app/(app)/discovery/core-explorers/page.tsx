"use client";
// app/(app)/discovery/core-explorers/page.tsx
// Static Discovery learning map for ages 5-10. No backend or modal wiring.

import Link from "next/link";
import {
  ArrowRight,
  Blocks,
  Brain,
  CircuitBoard,
  Compass,
  Leaf,
  MessageCircle,
  Orbit,
  Ruler,
  ShieldCheck,
  Sparkles,
  WalletCards,
  Wrench,
} from "lucide-react";

const FOUNDATION_TRACKS = [
  {
    title: "Math & Number Sense",
    subhead:
      "Counting, grouping, addition, subtraction, multiplication, division, fractions, patterns, measurement, and real-world math.",
    ladder: [
      "Quantity & counting",
      "Addition and subtraction",
      "Multiplication as grouping",
      "Division as sharing",
      "Fractions in real life",
      "Measurement and geometry",
      "Patterns and probability",
    ],
    applications: "Money, cooking, building, games, time, maps, sports, simple business.",
    icon: Ruler,
    accent: "#fbbf24",
    gradient: "linear-gradient(135deg, rgba(245,158,11,0.28), rgba(34,197,94,0.12))",
  },
  {
    title: "Systems Thinking",
    subhead:
      "How parts connect, how things change, and how small actions create bigger outcomes.",
    ladder: [
      "Parts and wholes",
      "Cause and effect",
      "Inputs and outputs",
      "Feedback loops",
      "Simple systems",
      "Maps and models",
    ],
    applications: "Gardens, weather, machines, families, games, businesses, ecosystems.",
    icon: Orbit,
    accent: "#38bdf8",
    gradient: "linear-gradient(135deg, rgba(14,165,233,0.28), rgba(99,102,241,0.14))",
  },
  {
    title: "Physics Intuition",
    subhead:
      "Motion, force, gravity, light, sound, energy, magnets, electricity, and how the physical world behaves.",
    ladder: [
      "Push and pull",
      "Motion and speed",
      "Gravity",
      "Light and shadows",
      "Sound and vibration",
      "Magnets",
      "Simple electricity",
    ],
    applications: "Balls, bikes, ramps, bridges, toys, music, lights, weather.",
    icon: Sparkles,
    accent: "#a78bfa",
    gradient: "linear-gradient(135deg, rgba(139,92,246,0.30), rgba(59,130,246,0.12))",
  },
  {
    title: "Communication",
    subhead:
      "Listening, speaking, asking questions, telling stories, explaining ideas, and understanding people.",
    ladder: [
      "Listening carefully",
      "Asking clear questions",
      "Telling what happened",
      "Explaining an idea",
      "Reading emotions",
      "Taking turns",
      "Speaking with confidence",
    ],
    applications: "Family, friends, teamwork, presentations, stories, leadership.",
    icon: MessageCircle,
    accent: "#fb7185",
    gradient: "linear-gradient(135deg, rgba(244,63,94,0.25), rgba(251,191,36,0.10))",
  },
  {
    title: "Build & Make",
    subhead:
      "Hands-on learning through tools, structures, art, repair, simple machines, and creative projects.",
    ladder: [
      "Materials",
      "Shapes and structures",
      "Tools and safety",
      "Measuring and cutting",
      "Simple machines",
      "Build-test-improve",
      "Repair mindset",
    ],
    applications: "Cardboard builds, Lego, forts, crafts, simple repairs, garden projects.",
    icon: Wrench,
    accent: "#fb923c",
    gradient: "linear-gradient(135deg, rgba(249,115,22,0.27), rgba(20,184,166,0.11))",
  },
  {
    title: "Logic & Code Thinking",
    subhead:
      "Sequences, patterns, rules, puzzles, step-by-step thinking, debugging, and early coding ideas.",
    ladder: [
      "Patterns",
      "If/then thinking",
      "Step-by-step instructions",
      "Sorting and grouping",
      "Puzzles",
      "Debugging mistakes",
      "Simple coding concepts",
    ],
    applications: "Games, robots, recipes, treasure maps, Scratch-style coding, routines.",
    icon: CircuitBoard,
    accent: "#60a5fa",
    gradient: "linear-gradient(135deg, rgba(37,99,235,0.29), rgba(34,197,94,0.10))",
  },
  {
    title: "Nature & Life",
    subhead:
      "Plants, animals, habitats, food chains, weather, seasons, bodies, health, and living systems.",
    ladder: [
      "Living vs nonliving",
      "Plants and growth",
      "Animals and habitats",
      "Weather and seasons",
      "Food and energy",
      "The human body",
      "Ecosystems",
    ],
    applications: "Gardens, pets, hiking, weather watching, cooking, health, farms.",
    icon: Leaf,
    accent: "#4ade80",
    gradient: "linear-gradient(135deg, rgba(34,197,94,0.30), rgba(14,165,233,0.10))",
  },
  {
    title: "Money & Value",
    subhead:
      "Needs, wants, trade, saving, spending, work, value, fairness, and early entrepreneurship.",
    ladder: [
      "Needs and wants",
      "Counting money",
      "Saving and spending",
      "Trade and exchange",
      "Work creates value",
      "Price and choice",
      "Simple business",
    ],
    applications: "Lemonade stands, chores, markets, games, allowance, family budgeting.",
    icon: WalletCards,
    accent: "#2dd4bf",
    gradient: "linear-gradient(135deg, rgba(20,184,166,0.29), rgba(245,158,11,0.11))",
  },
  {
    title: "Engineering Foundations",
    subhead:
      "Designing, testing, improving, building strong things, solving problems, and making ideas real.",
    ladder: [
      "What problem are we solving?",
      "Imagine solutions",
      "Draw a plan",
      "Build a prototype",
      "Test it",
      "Improve it",
      "Explain the design",
    ],
    applications: "Bridges, towers, boats, ramps, paper airplanes, marble runs, simple robots.",
    icon: Blocks,
    accent: "#c084fc",
    gradient: "linear-gradient(135deg, rgba(192,132,252,0.28), rgba(251,146,60,0.11))",
  },
] as const;

const STARTER_SOURCES = [
  {
    name: "NASA",
    track: "Science, Systems, Physics",
    ageFit: "Both",
    why: "Space, Earth science, engineering, missions, and real-world exploration questions.",
  },
  {
    name: "NOAA",
    track: "Nature & Life, Systems",
    ageFit: "Both",
    why: "Weather, oceans, climate, maps, and observation-based environmental learning.",
  },
  {
    name: "Smithsonian",
    track: "Nature, History, Systems",
    ageFit: "Both",
    why: "Museums, artifacts, animals, invention, culture, and broad discovery foundations.",
  },
  {
    name: "Khan Academy",
    track: "Math & Number Sense",
    ageFit: "Core",
    why: "Clear skill ladders for arithmetic, early math, logic, and practice routines.",
  },
  {
    name: "3Blue1Brown",
    track: "Math & Systems",
    ageFit: "Advanced",
    why: "Visual explanations that can inspire advanced learners and parent-guided previews.",
  },
  {
    name: "Veritasium",
    track: "Physics Intuition",
    ageFit: "Advanced",
    why: "Deep science questions, experiments, and counterintuitive explanations worth reviewing.",
  },
  {
    name: "Mark Rober",
    track: "Engineering Foundations",
    ageFit: "Both",
    why: "Engineering challenges, playful builds, experiments, and design-test-improve thinking.",
  },
  {
    name: "Arduino",
    track: "Logic & Code Thinking",
    ageFit: "Advanced",
    why: "Physical computing, simple electronics, sensors, and early robotics pathways.",
  },
  {
    name: "Adafruit",
    track: "Build & Make",
    ageFit: "Both",
    why: "Maker projects, circuits, guides, tools, and approachable hands-on learning.",
  },
  {
    name: "Make:",
    track: "Build & Make",
    ageFit: "Both",
    why: "Project-based learning, materials, tools, design, repairs, and creative builds.",
  },
  {
    name: "Numberphile",
    track: "Math & Number Sense",
    ageFit: "Advanced",
    why: "Number stories, patterns, puzzles, and curiosity hooks for math conversations.",
  },
  {
    name: "Beast Academy",
    track: "Math & Logic",
    ageFit: "Core",
    why: "Playful math reasoning, puzzles, visual explanations, and strong foundational practice.",
  },
] as const;

const PHILOSOPHY_STEPS = [
  "Learn the primitive idea",
  "See it in the real world",
  "Try a small mission",
  "Explain it back",
  "Build toward the next idea",
] as const;

const pillStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  borderRadius: 999,
  padding: "7px 12px",
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.06)",
  color: "rgba(255,255,255,0.76)",
  fontSize: 12,
  fontWeight: 800,
};

export default function CoreExplorersPage() {
  return (
    <>
      <style>{`
        .core-track-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
        }
        .core-source-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
        }
        @media (min-width: 760px) {
          .core-track-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .core-source-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        }
        @media (min-width: 1120px) {
          .core-track-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        }
        @media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
      `}</style>

      <div
        style={{
          minHeight: "calc(100vh - 60px)",
          background:
            "radial-gradient(circle at top left, rgba(34,197,94,0.16), transparent 34%), #0d0d0f",
          color: "#fff",
          paddingBottom: 84,
        }}
      >
        <section
          style={{
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            padding: "clamp(34px,5vw,68px) clamp(16px,4vw,40px) clamp(32px,5vw,60px)",
          }}
        >
          <Link
            href="/discovery"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              color: "rgba(255,255,255,0.46)",
              textDecoration: "none",
              fontSize: 12,
              fontWeight: 800,
              marginBottom: 24,
            }}
          >
            <ArrowRight style={{ width: 13, height: 13, transform: "rotate(180deg)" }} />
            Back to Discovery
          </Link>

          <div style={{ maxWidth: 880 }}>
            <p
              style={{
                margin: "0 0 12px",
                color: "#4ade80",
                fontSize: 11,
                fontWeight: 950,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
              }}
            >
              Core Explorers
            </p>
            <h1
              style={{
                margin: "0 0 16px",
                fontSize: "clamp(34px, 6vw, 68px)",
                lineHeight: 0.98,
                letterSpacing: "-0.055em",
                fontWeight: 950,
                maxWidth: 780,
              }}
            >
              Build the foundations for how the world works.
            </h1>
            <p
              style={{
                margin: "0 0 24px",
                maxWidth: 720,
                color: "rgba(255,255,255,0.56)",
                fontSize: "clamp(14px, 1.7vw, 17px)",
                lineHeight: 1.7,
              }}
            >
              Ages 5-10. First-principles learning through numbers, logic, nature,
              building, communication, money, systems, and real-world discovery.
            </p>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 9, marginBottom: 26 }}>
              <span style={pillStyle}>
                <Sparkles style={{ width: 14, height: 14, color: "#fbbf24" }} />
                Ages 5-10
              </span>
              <span style={pillStyle}>
                <ShieldCheck style={{ width: 14, height: 14, color: "#4ade80" }} />
                Safe Discovery
              </span>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              <a
                href="#math-number-sense"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "11px 16px",
                  borderRadius: 999,
                  background: "#fff",
                  color: "#111827",
                  textDecoration: "none",
                  fontSize: 13,
                  fontWeight: 950,
                }}
              >
                Start with Numbers
                <ArrowRight style={{ width: 15, height: 15 }} />
              </a>
              <a
                href="#foundations"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "11px 16px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.15)",
                  background: "rgba(255,255,255,0.07)",
                  color: "#fff",
                  textDecoration: "none",
                  fontSize: 13,
                  fontWeight: 900,
                }}
              >
                Explore All Foundations
                <Compass style={{ width: 15, height: 15, color: "#4ade80" }} />
              </a>
            </div>
          </div>
        </section>

        <section id="foundations" style={{ padding: "clamp(36px,5vw,64px) clamp(16px,4vw,40px) 0" }}>
          <div style={{ marginBottom: 20, maxWidth: 720 }}>
            <h2
              style={{
                margin: "0 0 7px",
                fontSize: "clamp(22px, 3vw, 32px)",
                fontWeight: 950,
                letterSpacing: "-0.04em",
              }}
            >
              Foundation Tracks
            </h2>
            <p style={{ margin: 0, color: "rgba(255,255,255,0.42)", fontSize: 13, lineHeight: 1.65 }}>
              A capability map for the ideas young learners use everywhere: count, compare,
              observe, explain, build, test, repair, trade, and design.
            </p>
          </div>

          <div className="core-track-grid">
            {FOUNDATION_TRACKS.map((track) => {
              const Icon = track.icon;
              const id = track.title.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

              return (
                <article
                  id={id}
                  key={track.title}
                  style={{
                    borderRadius: 22,
                    overflow: "hidden",
                    background: "rgba(255,255,255,0.045)",
                    border: "1px solid rgba(255,255,255,0.09)",
                    boxShadow: "0 20px 70px rgba(0,0,0,0.22)",
                    minHeight: 520,
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <div
                    style={{
                      background: track.gradient,
                      borderBottom: "1px solid rgba(255,255,255,0.10)",
                      padding: "22px 22px 20px",
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: 16,
                    }}
                  >
                    <div
                      style={{
                        width: 46,
                        height: 46,
                        borderRadius: 15,
                        background: "rgba(0,0,0,0.24)",
                        border: "1px solid rgba(255,255,255,0.14)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Icon style={{ width: 23, height: 23, color: "#fff" }} />
                    </div>
                    <span
                      style={{
                        borderRadius: 999,
                        padding: "5px 9px",
                        background: `${track.accent}18`,
                        border: `1px solid ${track.accent}30`,
                        color: track.accent,
                        fontSize: 11,
                        fontWeight: 850,
                        whiteSpace: "nowrap",
                      }}
                    >
                      Foundation
                    </span>
                  </div>

                  <div style={{ padding: "20px 22px 22px", display: "flex", flexDirection: "column", flex: 1 }}>
                    <h3
                      style={{
                        margin: "0 0 8px",
                        fontSize: 20,
                        lineHeight: 1.12,
                        letterSpacing: "-0.035em",
                        fontWeight: 950,
                      }}
                    >
                      {track.title}
                    </h3>
                    <p style={{ margin: "0 0 18px", color: "rgba(255,255,255,0.54)", fontSize: 13, lineHeight: 1.58 }}>
                      {track.subhead}
                    </p>

                    <div style={{ marginBottom: 18 }}>
                      <div
                        style={{
                          marginBottom: 9,
                          color: "rgba(255,255,255,0.38)",
                          fontSize: 10,
                          fontWeight: 900,
                          letterSpacing: "0.12em",
                          textTransform: "uppercase",
                        }}
                      >
                        Learning ladder
                      </div>
                      <div style={{ display: "grid", gap: 7 }}>
                        {track.ladder.map((step, index) => (
                          <div key={step} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span
                              style={{
                                width: 20,
                                height: 20,
                                borderRadius: 999,
                                background: `${track.accent}18`,
                                border: `1px solid ${track.accent}2f`,
                                color: track.accent,
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 10,
                                fontWeight: 900,
                                flexShrink: 0,
                              }}
                            >
                              {index + 1}
                            </span>
                            <span style={{ color: "rgba(255,255,255,0.68)", fontSize: 12, fontWeight: 700 }}>
                              {step}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div
                      style={{
                        marginTop: "auto",
                        borderRadius: 14,
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        padding: "12px 13px",
                      }}
                    >
                      <div
                        style={{
                          marginBottom: 5,
                          color: track.accent,
                          fontSize: 10,
                          fontWeight: 900,
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                        }}
                      >
                        Applications
                      </div>
                      <p style={{ margin: 0, color: "rgba(255,255,255,0.58)", fontSize: 12, lineHeight: 1.55 }}>
                        {track.applications}
                      </p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section style={{ padding: "clamp(44px,5vw,68px) clamp(16px,4vw,40px) 0" }}>
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              gap: 18,
              flexWrap: "wrap",
              marginBottom: 18,
            }}
          >
            <div style={{ maxWidth: 720 }}>
              <h2
                style={{
                  margin: "0 0 7px",
                  fontSize: "clamp(22px, 3vw, 32px)",
                  fontWeight: 950,
                  letterSpacing: "-0.04em",
                }}
              >
                Trusted Starting Sources
              </h2>
              <p style={{ margin: 0, color: "rgba(255,255,255,0.42)", fontSize: 13, lineHeight: 1.65 }}>
                These are sources to investigate, not outbound links. Sources are reviewed before
                being added to Safe View.
              </p>
            </div>
            <span
              style={{
                borderRadius: 999,
                padding: "7px 12px",
                background: "rgba(74,222,128,0.10)",
                border: "1px solid rgba(74,222,128,0.22)",
                color: "#4ade80",
                fontSize: 11,
                fontWeight: 900,
              }}
            >
              Candidate Source Library
            </span>
          </div>

          <div className="core-source-grid">
            {STARTER_SOURCES.map((source) => (
              <article
                key={source.name}
                style={{
                  borderRadius: 16,
                  background: "rgba(255,255,255,0.045)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  padding: "17px 18px",
                  minHeight: 190,
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                  <h3 style={{ margin: 0, fontSize: 17, fontWeight: 950, letterSpacing: "-0.025em" }}>
                    {source.name}
                  </h3>
                  <span
                    style={{
                      borderRadius: 999,
                      padding: "3px 7px",
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.09)",
                      color: "rgba(255,255,255,0.50)",
                      fontSize: 10,
                      fontWeight: 800,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {source.ageFit}
                  </span>
                </div>
                <div style={{ marginTop: 12, color: "#60a5fa", fontSize: 11, fontWeight: 850 }}>
                  {source.track}
                </div>
                <p style={{ margin: "9px 0 16px", color: "rgba(255,255,255,0.52)", fontSize: 12, lineHeight: 1.55 }}>
                  {source.why}
                </p>
                <div
                  style={{
                    marginTop: "auto",
                    color: "rgba(255,255,255,0.38)",
                    fontSize: 10,
                    fontWeight: 900,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                  }}
                >
                  Candidate Source
                </div>
              </article>
            ))}
          </div>
        </section>

        <section style={{ padding: "clamp(44px,5vw,68px) clamp(16px,4vw,40px) 0" }}>
          <div
            style={{
              borderRadius: 24,
              background:
                "linear-gradient(135deg, rgba(255,255,255,0.07), rgba(255,255,255,0.025))",
              border: "1px solid rgba(255,255,255,0.10)",
              padding: "clamp(24px,4vw,42px)",
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr)",
              gap: 24,
            }}
          >
            <div>
              <div
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 16,
                  background: "rgba(74,222,128,0.12)",
                  border: "1px solid rgba(74,222,128,0.22)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 16,
                }}
              >
                <Brain style={{ width: 25, height: 25, color: "#4ade80" }} />
              </div>
              <h2
                style={{
                  margin: "0 0 12px",
                  fontSize: "clamp(22px, 3vw, 34px)",
                  fontWeight: 950,
                  letterSpacing: "-0.045em",
                }}
              >
                First Principles, Not Random Videos
              </h2>
              <p style={{ margin: 0, color: "rgba(255,255,255,0.54)", fontSize: 14, lineHeight: 1.7, maxWidth: 760 }}>
                Core Explorers starts with the basic ideas children use to understand everything else:
                number, cause, motion, language, structure, living systems, value, and design.
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
              {PHILOSOPHY_STEPS.map((step, index) => (
                <div
                  key={step}
                  style={{
                    borderRadius: 14,
                    padding: "14px 15px",
                    background: "rgba(0,0,0,0.20)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <div style={{ color: "#4ade80", fontSize: 11, fontWeight: 950, marginBottom: 7 }}>
                    Step {index + 1}
                  </div>
                  <div style={{ color: "rgba(255,255,255,0.74)", fontSize: 13, fontWeight: 800 }}>
                    {step}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section style={{ padding: "clamp(44px,5vw,68px) clamp(16px,4vw,40px) 0" }}>
          <div
            style={{
              borderRadius: 24,
              background: "rgba(20,83,45,0.16)",
              border: "1px solid rgba(74,222,128,0.15)",
              padding: "clamp(24px,4vw,44px)",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: 18, flexWrap: "wrap" }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 17,
                  background: "rgba(74,222,128,0.12)",
                  border: "1px solid rgba(74,222,128,0.24)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <ShieldCheck style={{ width: 26, height: 26, color: "#4ade80" }} />
              </div>

              <div style={{ flex: 1, minWidth: 240 }}>
                <h2
                  style={{
                    margin: "0 0 10px",
                    fontSize: "clamp(22px, 3vw, 32px)",
                    fontWeight: 950,
                    letterSpacing: "-0.04em",
                  }}
                >
                  Safe Discovery, Guided by Humans
                </h2>
                <p style={{ margin: "0 0 20px", color: "rgba(255,255,255,0.56)", fontSize: 14, lineHeight: 1.7, maxWidth: 760 }}>
                  Every future video, project, article, or tool added here should open inside
                  AIH Safe View - no comments, no open search, no random recommendations, no
                  algorithmic rabbit holes.
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  <Link
                    href="/discovery"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "10px 15px",
                      borderRadius: 999,
                      background: "#fff",
                      color: "#111827",
                      textDecoration: "none",
                      fontSize: 13,
                      fontWeight: 950,
                    }}
                  >
                    Back to Discovery
                  </Link>
                  <Link
                    href="/discovery/science"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "10px 15px",
                      borderRadius: 999,
                      border: "1px solid rgba(255,255,255,0.15)",
                      background: "rgba(255,255,255,0.07)",
                      color: "#fff",
                      textDecoration: "none",
                      fontSize: 13,
                      fontWeight: 900,
                    }}
                  >
                    Explore Science Lab
                    <ArrowRight style={{ width: 14, height: 14, color: "#4ade80" }} />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
