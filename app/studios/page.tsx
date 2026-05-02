// app/studios/page.tsx
// AIH Studios — public marketing landing page
// Premium dark/glassmorphism aesthetic, mobile responsive.

import Link from "next/link";
import { ArrowRight, Sparkles, Mic, Users, Building2, Heart } from "lucide-react";
import { MOCK_TESTIMONIALS } from "@/lib/studios/mockStudios";

export default function StudiosLandingPage() {
  return (
    <>
      {/* ─── HERO ───────────────────────────────────────────── */}
      <section style={{
        position: "relative",
        padding: "100px 24px 120px",
        overflow: "hidden",
      }}>
        {/* Glow accents */}
        <div style={{
          position: "absolute",
          top: "-200px",
          left: "20%",
          width: "500px",
          height: "500px",
          background: "radial-gradient(circle, rgba(233,108,80,0.25) 0%, transparent 60%)",
          filter: "blur(40px)",
          pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute",
          bottom: "-100px",
          right: "10%",
          width: "400px",
          height: "400px",
          background: "radial-gradient(circle, rgba(99,102,241,0.20) 0%, transparent 60%)",
          filter: "blur(40px)",
          pointerEvents: "none",
        }} />

        <div style={{ maxWidth: "1100px", margin: "0 auto", textAlign: "center", position: "relative", zIndex: 1 }}>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "6px 16px",
            borderRadius: "999px",
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.12)",
            backdropFilter: "blur(12px)",
            fontSize: "12px",
            fontWeight: 500,
            color: "rgba(255,255,255,0.85)",
            marginBottom: "32px",
            letterSpacing: "0.05em",
            textTransform: "uppercase",
          }}>
            <Sparkles style={{ width: "13px", height: "13px", color: "#f4a261" }} />
            AIH Studios — Beta
          </div>

          <h1 style={{
            fontSize: "clamp(40px, 6vw, 68px)",
            fontWeight: 700,
            letterSpacing: "-1.5px",
            lineHeight: 1.05,
            marginBottom: "24px",
            background: "linear-gradient(180deg, #ffffff 0%, rgba(255,255,255,0.7) 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}>
            Run Your Training Business<br />
            <span style={{ color: "#f4a261", WebkitTextFillColor: "#f4a261" }}>Like a Network</span>
          </h1>

          <p style={{
            fontSize: "19px",
            lineHeight: 1.6,
            color: "rgba(255,255,255,0.7)",
            maxWidth: "680px",
            margin: "0 auto 48px",
          }}>
            Studios gives trainers, recovery pros, and wellness providers a private way to connect with clients,
            manage access, and grow through trusted relationships.
          </p>

          <div style={{ display: "flex", gap: "14px", justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/studios/apply" style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "14px 32px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, #e96c50, #f4a261)",
              color: "white",
              fontSize: "15px",
              fontWeight: 600,
              textDecoration: "none",
              boxShadow: "0 8px 24px rgba(233,108,80,0.35)",
            }}>
              Start Your Studio <ArrowRight style={{ width: "16px", height: "16px" }} />
            </Link>
            <Link href="#explore" style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "14px 32px",
              borderRadius: "10px",
              background: "rgba(255,255,255,0.06)",
              color: "white",
              fontSize: "15px",
              fontWeight: 600,
              textDecoration: "none",
              border: "1px solid rgba(255,255,255,0.15)",
              backdropFilter: "blur(8px)",
            }}>
              Explore Studios
            </Link>
          </div>
        </div>
      </section>

      {/* ─── FLOATING STORY CARDS ──────────────────────────── */}
      <section id="explore" style={{ padding: "60px 24px 100px" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "32px" }}>
          {STORY_CARDS.map((card, i) => (
            <FloatingCard key={card.title} card={card} reverse={i % 2 === 1} />
          ))}
        </div>
      </section>

      {/* ─── TESTIMONIALS ──────────────────────────────────── */}
      <section style={{ padding: "80px 24px", background: "rgba(255,255,255,0.02)", borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <h2 style={{ fontSize: "32px", fontWeight: 700, textAlign: "center", marginBottom: "12px", letterSpacing: "-0.5px" }}>
            Trusted by performance providers
          </h2>
          <p style={{ fontSize: "16px", color: "rgba(255,255,255,0.6)", textAlign: "center", marginBottom: "48px" }}>
            Real operators running real businesses on Studios.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
            {MOCK_TESTIMONIALS.map(t => (
              <div key={t.id} style={{
                padding: "28px",
                borderRadius: "16px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                backdropFilter: "blur(12px)",
              }}>
                <p style={{ fontSize: "15px", lineHeight: 1.65, color: "rgba(255,255,255,0.85)", marginBottom: "20px", fontStyle: "italic" }}>
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: 600 }}>{t.attribution}</div>
                  {t.role && <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", marginTop: "2px" }}>{t.role}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── BENEFITS ──────────────────────────────────────── */}
      <section style={{ padding: "100px 24px" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <h2 style={{ fontSize: "32px", fontWeight: 700, textAlign: "center", marginBottom: "12px", letterSpacing: "-0.5px" }}>
            Built for everyone in the room
          </h2>
          <p style={{ fontSize: "16px", color: "rgba(255,255,255,0.6)", textAlign: "center", marginBottom: "56px" }}>
            One network, three perspectives.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
            {BENEFITS_COLUMNS.map(col => (
              <div key={col.title} style={{
                padding: "32px",
                borderRadius: "20px",
                background: `linear-gradient(180deg, ${col.accent}22 0%, rgba(255,255,255,0.03) 100%)`,
                border: `1px solid ${col.accent}33`,
                backdropFilter: "blur(12px)",
              }}>
                <div style={{
                  width: "44px", height: "44px",
                  borderRadius: "12px",
                  background: col.accent,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  marginBottom: "20px",
                }}>
                  <col.Icon style={{ width: "22px", height: "22px", color: "white" }} />
                </div>
                <h3 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "16px", letterSpacing: "-0.3px" }}>
                  {col.title}
                </h3>
                <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: "10px" }}>
                  {col.bullets.map(b => (
                    <li key={b} style={{ fontSize: "14px", color: "rgba(255,255,255,0.75)", lineHeight: 1.5, display: "flex", gap: "8px" }}>
                      <span style={{ color: col.accent, marginTop: "2px" }}>—</span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── TALL FOOTER ───────────────────────────────────── */}
      <footer style={{
        padding: "80px 24px 40px",
        background: "rgba(0,0,0,0.4)",
        borderTop: "1px solid rgba(255,255,255,0.08)",
      }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "40px", marginBottom: "60px" }}>
            {FOOTER_COLUMNS.map(col => (
              <div key={col.title}>
                <h4 style={{ fontSize: "13px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.95)", marginBottom: "18px" }}>
                  {col.title}
                </h4>
                <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: "11px" }}>
                  {col.items.map(item => (
                    <li key={item}>
                      <span style={{ fontSize: "14px", color: "rgba(255,255,255,0.55)" }}>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div style={{
            paddingTop: "30px",
            borderTop: "1px solid rgba(255,255,255,0.08)",
            display: "flex", justifyContent: "space-between", alignItems: "center",
            flexWrap: "wrap", gap: "16px",
          }}>
            <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.45)" }}>
              © {new Date().getFullYear()} AIH Studios — A surface of AmIHuman.NET
            </div>
            <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.45)" }}>
              Made in Denver, Colorado
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}

// ─── FLOATING CARD COMPONENT ──────────────────────────────────
function FloatingCard({ card, reverse }: { card: typeof STORY_CARDS[number]; reverse: boolean }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "40px",
      alignItems: "center",
      direction: reverse ? "rtl" : "ltr",
    }}>
      {/* Card */}
      <div style={{ direction: "ltr" }}>
        <div style={{
          padding: "36px",
          borderRadius: "24px",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.1)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          transition: "transform 0.3s ease, border-color 0.3s ease",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
            <div style={{
              width: "10px", height: "10px", borderRadius: "50%",
              background: card.accent,
              boxShadow: `0 0 12px ${card.accent}`,
            }} />
            <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)" }}>
              {card.eyebrow}
            </span>
            {/* TODO(studios:audio): wire intro voice clip per card */}
            <button title="Voice intro coming soon" disabled style={{
              marginLeft: "auto",
              width: "32px", height: "32px",
              borderRadius: "50%",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "not-allowed",
              opacity: 0.5,
            }}>
              <Mic style={{ width: "13px", height: "13px", color: "rgba(255,255,255,0.6)" }} />
            </button>
          </div>

          <h3 style={{ fontSize: "26px", fontWeight: 700, marginBottom: "20px", letterSpacing: "-0.4px", lineHeight: 1.2 }}>
            {card.title}
          </h3>

          <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: "12px" }}>
            {card.bullets.map(b => (
              <li key={b} style={{ display: "flex", gap: "10px", fontSize: "15px", color: "rgba(255,255,255,0.78)", lineHeight: 1.5 }}>
                <span style={{ color: card.accent, fontWeight: 700 }}>·</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Visual placeholder */}
      <div style={{ direction: "ltr" }}>
        <div style={{
          aspectRatio: "4/3",
          borderRadius: "24px",
          background: `linear-gradient(135deg, ${card.accent}33, rgba(255,255,255,0.02))`,
          border: "1px solid rgba(255,255,255,0.08)",
          display: "flex", alignItems: "center", justifyContent: "center",
          backdropFilter: "blur(8px)",
        }}>
          <div style={{
            fontSize: "72px",
            filter: "grayscale(0.3)",
            opacity: 0.7,
          }}>
            {card.emoji}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── DATA ──────────────────────────────────────────────────────
const STORY_CARDS = [
  {
    eyebrow: "Step 1 — Ownership",
    title: "Your Studio, Your Network",
    accent: "#f4a261",
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
    accent: "#e96c50",
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
    accent: "#6366f1",
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
    accent: "#10b981",
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
    accent: "#f4a261",
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
    accent: "#e96c50",
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
    accent: "#6366f1",
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
  {
    title: "Studios",
    items: ["Browse", "Start Your Studio", "Pricing", "Apply"],
  },
  {
    title: "Company",
    items: ["About AIH", "Blog", "Press", "Careers"],
  },
  {
    title: "Resources",
    items: ["FAQ", "Help Center", "Privacy", "Terms"],
  },
  {
    title: "Locations",
    items: ["Denver, CO", "Lone Tree / Park Meadows", "Coming Soon"],
  },
  {
    title: "Contact",
    items: ["Support email", "Instagram", "Press inquiries"],
  },
];
