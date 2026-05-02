// app/studios/page.tsx
// AIH Studios — public marketing landing page
// Light, warm editorial aesthetic (cream / soft accent — broad appeal).

import Link from "next/link";
import { ArrowRight, Sparkles, Mic, Users, Building2, Heart } from "lucide-react";
import { MOCK_TESTIMONIALS } from "@/lib/studios/mockStudios";

const ink = "#262626";
const muted = "#737373";
const line = "rgba(0, 0, 0, 0.07)";
const cardShadow = "0 1px 3px rgba(0, 0, 0, 0.06), 0 8px 24px rgba(0, 0, 0, 0.06)";

export default function StudiosLandingPage() {
  return (
    <>
      <section
        style={{
          position: "relative",
          padding: "88px 24px 100px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "-80px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "min(720px, 90vw)",
            height: "280px",
            background: "radial-gradient(circle, rgba(255, 218, 230, 0.5) 0%, transparent 70%)",
            filter: "blur(20px)",
            pointerEvents: "none",
          }}
        />

        <div style={{ maxWidth: "1100px", margin: "0 auto", textAlign: "center", position: "relative", zIndex: 1 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 18px",
              borderRadius: "999px",
              background: "#fff",
              border: `1px solid ${line}`,
              boxShadow: "0 1px 2px rgba(0, 0, 0, 0.04)",
              fontSize: "11px",
              fontWeight: 600,
              color: muted,
              marginBottom: "28px",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            <Sparkles style={{ width: "13px", height: "13px", color: "#d4a574" }} />
            AIH Studios — Beta
          </div>

          <h1
            style={{
              fontSize: "clamp(36px, 5.5vw, 60px)",
              fontWeight: 700,
              letterSpacing: "-1.8px",
              lineHeight: 1.06,
              marginBottom: "22px",
              color: ink,
            }}
          >
            Run Your Training Business
            <br />
            <span style={{ color: "#b8956c" }}>Like a Network</span>
          </h1>

          <p
            style={{
              fontSize: "18px",
              lineHeight: 1.65,
              color: muted,
              maxWidth: "620px",
              margin: "0 auto 44px",
            }}
          >
            Studios gives trainers, recovery pros, and wellness providers a private way to connect with clients,
            manage access, and grow through trusted relationships.
          </p>

          <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
            <Link
              href="/studios/apply"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "14px 28px",
                borderRadius: "999px",
                background: ink,
                color: "#fff",
                fontSize: "15px",
                fontWeight: 600,
                textDecoration: "none",
                boxShadow: "0 4px 14px rgba(38, 38, 38, 0.22)",
              }}
            >
              Start Your Studio <ArrowRight style={{ width: "16px", height: "16px" }} />
            </Link>
            <Link
              href="#explore"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "14px 28px",
                borderRadius: "999px",
                background: "#fff",
                color: ink,
                fontSize: "15px",
                fontWeight: 600,
                textDecoration: "none",
                border: `1px solid ${line}`,
                boxShadow: "0 1px 2px rgba(0, 0, 0, 0.04)",
              }}
            >
              Explore Studios
            </Link>
          </div>
        </div>
      </section>

      <section id="explore" style={{ padding: "48px 24px 88px" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "40px" }}>
          {STORY_CARDS.map((card, i) => (
            <FloatingCard key={card.title} card={card} reverse={i % 2 === 1} />
          ))}
        </div>
      </section>

      <section
        style={{
          padding: "76px 24px",
          background: "rgba(255, 255, 255, 0.55)",
          borderTop: `1px solid ${line}`,
          borderBottom: `1px solid ${line}`,
        }}
      >
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <h2
            style={{
              fontSize: "clamp(26px, 4vw, 34px)",
              fontWeight: 700,
              textAlign: "center",
              marginBottom: "10px",
              letterSpacing: "-0.4px",
              color: ink,
            }}
          >
            Trusted by performance providers
          </h2>
          <p style={{ fontSize: "16px", color: muted, textAlign: "center", marginBottom: "44px", maxWidth: "480px", marginInline: "auto" }}>
            Real operators running real businesses on Studios.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "18px" }}>
            {MOCK_TESTIMONIALS.map((t) => (
              <div
                key={t.id}
                style={{
                  padding: "26px",
                  borderRadius: "20px",
                  background: "#fff",
                  border: `1px solid ${line}`,
                  boxShadow: cardShadow,
                }}
              >
                <p
                  style={{
                    fontSize: "15px",
                    lineHeight: 1.65,
                    color: "#404040",
                    marginBottom: "18px",
                    fontStyle: "italic",
                  }}
                >
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: ink }}>{t.attribution}</div>
                  {t.role && (
                    <div style={{ fontSize: "12px", color: muted, marginTop: "4px" }}>{t.role}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ padding: "88px 24px" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <h2
            style={{
              fontSize: "clamp(26px, 4vw, 34px)",
              fontWeight: 700,
              textAlign: "center",
              marginBottom: "10px",
              letterSpacing: "-0.4px",
              color: ink,
            }}
          >
            Built for everyone in the room
          </h2>
          <p style={{ fontSize: "16px", color: muted, textAlign: "center", marginBottom: "48px" }}>
            One network, three perspectives.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
            {BENEFITS_COLUMNS.map((col) => (
              <div
                key={col.title}
                style={{
                  padding: "30px",
                  borderRadius: "22px",
                  background: "#fff",
                  border: `1px solid ${line}`,
                  boxShadow: cardShadow,
                  borderTop: `3px solid ${col.accent}`,
                }}
              >
                <div
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "14px",
                    background: `${col.accent}18`,
                    color: col.accent,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "18px",
                  }}
                >
                  <col.Icon style={{ width: "22px", height: "22px" }} />
                </div>
                <h3 style={{ fontSize: "19px", fontWeight: 700, marginBottom: "14px", letterSpacing: "-0.2px", color: ink }}>
                  {col.title}
                </h3>
                <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: "10px" }}>
                  {col.bullets.map((b) => (
                    <li key={b} style={{ fontSize: "14px", color: "#525252", lineHeight: 1.55, display: "flex", gap: "10px" }}>
                      <span style={{ color: col.accent, marginTop: "2px", fontWeight: 600 }}>·</span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer
        style={{
          padding: "72px 24px 40px",
          background: "#fff",
          borderTop: `1px solid ${line}`,
        }}
      >
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: "36px",
              marginBottom: "52px",
            }}
          >
            {FOOTER_COLUMNS.map((col) => (
              <div key={col.title}>
                <h4
                  style={{
                    fontSize: "12px",
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: ink,
                    marginBottom: "16px",
                  }}
                >
                  {col.title}
                </h4>
                <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: "10px" }}>
                  {col.items.map((item) => (
                    <li key={item}>
                      <span style={{ fontSize: "14px", color: muted }}>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div
            style={{
              paddingTop: "28px",
              borderTop: `1px solid ${line}`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "14px",
            }}
          >
            <div style={{ fontSize: "13px", color: muted }}>
              © {new Date().getFullYear()} AIH Studios — A surface of AmIHuman.NET
            </div>
            <div style={{ fontSize: "13px", color: muted }}>Made in Denver, Colorado</div>
          </div>
        </div>
      </footer>
    </>
  );
}

function FloatingCard({ card, reverse }: { card: (typeof STORY_CARDS)[number]; reverse: boolean }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
        gap: "32px",
        alignItems: "center",
        direction: reverse ? "rtl" : "ltr",
      }}
    >
      <div style={{ direction: "ltr" }}>
        <div
          style={{
            padding: "32px",
            borderRadius: "22px",
            background: "#fff",
            border: `1px solid ${line}`,
            boxShadow: cardShadow,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "18px" }}>
            <div
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: card.accent,
              }}
            />
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: muted,
              }}
            >
              {card.eyebrow}
            </span>
            {/* TODO(studios:audio): wire intro voice clip per card */}
            <button
              title="Voice intro coming soon"
              disabled
              style={{
                marginLeft: "auto",
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: "rgba(0, 0, 0, 0.04)",
                border: `1px solid ${line}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "not-allowed",
                opacity: 0.45,
              }}
            >
              <Mic style={{ width: "14px", height: "14px", color: muted }} />
            </button>
          </div>

          <h3
            style={{
              fontSize: "clamp(22px, 3.5vw, 28px)",
              fontWeight: 700,
              marginBottom: "18px",
              letterSpacing: "-0.4px",
              lineHeight: 1.2,
              color: ink,
            }}
          >
            {card.title}
          </h3>

          <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: "12px" }}>
            {card.bullets.map((b) => (
              <li key={b} style={{ display: "flex", gap: "10px", fontSize: "15px", color: "#404040", lineHeight: 1.5 }}>
                <span style={{ color: card.accent, fontWeight: 700 }}>·</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div style={{ direction: "ltr" }}>
        <div
          style={{
            aspectRatio: "4/3",
            borderRadius: "22px",
            background: `linear-gradient(145deg, ${card.soft} 0%, #fff 48%, ${card.soft2} 100%)`,
            border: `1px solid ${line}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: cardShadow,
          }}
        >
          <div style={{ fontSize: "64px", lineHeight: 1 }}>{card.emoji}</div>
        </div>
      </div>
    </div>
  );
}

const STORY_CARDS = [
  {
    eyebrow: "Step 1 — Ownership",
    title: "Your Studio, Your Network",
    accent: "#c9a66b",
    soft: "#fdf6eb",
    soft2: "#fceee4",
    emoji: "🏛️",
    bullets: [
      "Create a public-facing Studio page",
      "Share services, videos, and availability",
      "Let prospects request access",
    ],
  },
  {
    eyebrow: "Step 2 — Trust",
    title: "Clients Earn Access",
    accent: "#d4897a",
    soft: "#fdf4f2",
    soft2: "#fce8e4",
    emoji: "🤝",
    bullets: [
      "Prospects start with a short intro video",
      "You approve trial access",
      "Trust builds through real interaction",
    ],
  },
  {
    eyebrow: "Step 3 — Growth",
    title: "Grow Through Referrals",
    accent: "#8b9dc3",
    soft: "#f3f6fc",
    soft2: "#e8eef8",
    emoji: "🌱",
    bullets: [
      "Members can invite the right people",
      "Providers stay in control",
      "Every referral carries context",
    ],
  },
  {
    eyebrow: "Step 4 — Network",
    title: "Built for Local Performance Networks",
    accent: "#7aab9a",
    soft: "#f2f8f5",
    soft2: "#e5f0eb",
    emoji: "🌐",
    bullets: [
      "Trainers and strength coaches",
      "PT and sports medicine",
      "Massage, recovery, hydration, nutrition",
    ],
  },
] as const;

const BENEFITS_COLUMNS = [
  {
    title: "For Trainers",
    accent: "#c9a66b",
    Icon: Building2,
    bullets: [
      "Own your client list, not a marketplace's",
      "Approve who walks in the door",
      "Offer intro packages without app fees",
      "Voice/video intros build trust before booking",
    ],
  },
  {
    title: "For Clients",
    accent: "#d4897a",
    Icon: Heart,
    bullets: [
      "Discover vetted providers in your city",
      "Earn access through real interactions",
      "Track your sessions in one private space",
      "Refer the right people to people you trust",
    ],
  },
  {
    title: "For Providers",
    accent: "#8b9dc3",
    Icon: Users,
    bullets: [
      "Recovery, nutrition, hydration, PT — all welcome",
      "Cross-refer with neighbor providers",
      "Local network amplifies local trust",
      "No fake leads, no marketplace race-to-bottom",
    ],
  },
] as const;

const FOOTER_COLUMNS = [
  { title: "Studios", items: ["Browse", "Start Your Studio", "Pricing", "Apply"] },
  { title: "Company", items: ["About AIH", "Blog", "Press", "Careers"] },
  { title: "Resources", items: ["FAQ", "Help Center", "Privacy", "Terms"] },
  { title: "Locations", items: ["Denver, CO", "Lone Tree / Park Meadows", "Coming Soon"] },
  { title: "Contact", items: ["Support email", "Instagram", "Press inquiries"] },
];
