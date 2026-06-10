"use client";

import { useState, type CSSProperties, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { VmbSampleResultsSection } from "@/components/studios/salon/VmbSampleResultsSection";
import { StudioHeroVideoSlot } from "@/components/studios/trainer/StudioHeroVideoSlot";
import { STUDIOS_CARD_SHADOW, STUDIOS_INK, STUDIOS_LINE, STUDIOS_MUTED } from "@/lib/studios/visual";

const ACCENT = "#9d174d";
const ACCENT_SOFT = "#fdf2f8";
const WARM_BG = "#faf8f5";

const COMPARISON_CARDS: Array<{ title: string; body: string; highlight?: boolean }> = [
  {
    title: "Social Media",
    body: "Followers, likes, and posts are useful — but the algorithm controls who sees them.",
  },
  {
    title: "Booking Software",
    body: "Your current system handles scheduling, payments, and client records. Keep it.",
  },
  {
    title: "VMB",
    body: "VMB adds a growth layer on top: referrals, invitations, reactivations, gifting, VIP campaigns, and client-powered brand marketing.",
    highlight: true,
  },
];

const GROWTH_BULLETS = [
  "Invite top clients into your private client network",
  "Turn happy clients into trusted referral channels",
  "Promote birthday, bridal, holiday, and gift moments",
  "Bring dormant clients back",
  "Push social media attention toward bookings",
  "Create salon-branded campaigns without extra staff work",
] as const;

const HOW_STEPS = [
  {
    step: "1",
    title: "Connect",
    body: "Upload or connect your salon data from the platform you already use.",
  },
  {
    step: "2",
    title: "Activate",
    body: "VMB identifies campaign opportunities and launches client invitations, referral prompts, gift campaigns, and social brand marketing.",
  },
  {
    step: "3",
    title: "Grow",
    body: "New appointments, rebookings, referrals, and prepaid opportunities flow back to your existing booking process.",
  },
] as const;

const TRIAL_BULLETS = [
  "Works with Vagaro, GlossGenius, Square, Fresha, Boulevard, Mangomint, and CSV exports",
  "Setup takes minutes",
  "No credit card required for trial",
  "Designed for salon owners, independent techs, and studio operators",
] as const;

const HERO_VIDEO = {
  videoSrc: "/uploads/studios-hero-intro-v2.mp4",
  thumbSrc: "/uploads/STUDIO Intro Vid Thumb.png",
  foldImageUrl:
    "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1400&q=75",
};

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

const PROVIDER_OPTIONS = [
  { value: "", label: "Select your booking platform" },
  { value: "glossgenius", label: "GlossGenius" },
  { value: "vagaro", label: "Vagaro" },
  { value: "square", label: "Square" },
  { value: "fresha", label: "Fresha" },
  { value: "boulevard", label: "Boulevard" },
  { value: "mangomint", label: "Mangomint" },
  { value: "csv", label: "CSV export / other" },
] as const;

export function VmbSalonsLanding() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [salonName, setSalonName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [providerPlatform, setProviderPlatform] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleTrialSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/vmb/trial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone,
          salonName,
          providerPlatform,
        }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        redirectUrl?: string;
        error?: string;
      };
      if (!data.ok || !data.redirectUrl) {
        setSubmitError(data.error ?? "Could not start trial. Please try again.");
        return;
      }
      router.push(data.redirectUrl);
    } catch {
      setSubmitError("Could not start trial. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div id="vmb-salons" style={{ background: WARM_BG, color: STUDIOS_INK }}>
      {/* Hero */}
      <section
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          padding: "48px 24px 56px",
        }}
      >
        <p
          style={{
            margin: "0 0 12px",
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: ACCENT,
          }}
        >
          VMB for Salons
        </p>
        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-2 lg:gap-12">
          <div>
            <h1
              style={{
                margin: "0 0 20px",
                fontSize: "clamp(32px, 5vw, 52px)",
                fontWeight: 900,
                lineHeight: 1.08,
                letterSpacing: "-0.03em",
              }}
            >
              More Appointments.
              <br />
              More Referrals.
              <br />
              More Revenue.
              <br />
              <span style={{ color: ACCENT }}>From the Clients You Already Have.</span>
            </h1>
            <p
              style={{
                margin: "0 0 24px",
                fontSize: "clamp(15px, 2vw, 18px)",
                lineHeight: 1.55,
                color: STUDIOS_MUTED,
                maxWidth: 560,
              }}
            >
              VMB works with your existing salon software to help generate new business from client
              relationships, referrals, invitations, birthdays, bridal groups, and social sharing.
            </p>
            <ul
              style={{
                margin: "0 0 28px",
                padding: 0,
                listStyle: "none",
                display: "grid",
                gap: 8,
                fontSize: 15,
                fontWeight: 600,
                color: STUDIOS_INK,
              }}
            >
              <li>No software replacement.</li>
              <li>No back-office change.</li>
              <li>No monthly or annual fee.</li>
              <li>Start with a 30-day free trial.</li>
            </ul>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              <button
                type="button"
                onClick={() => scrollToId("vmb-trial")}
                style={{
                  padding: "14px 24px",
                  borderRadius: 12,
                  border: "none",
                  background: ACCENT,
                  color: "#fff",
                  fontSize: 15,
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                Start Free Trial
              </button>
              <Link
                href="/vmb/demo"
                style={{
                  display: "inline-block",
                  padding: "14px 24px",
                  borderRadius: 12,
                  border: `1px solid ${STUDIOS_LINE}`,
                  background: "#fff",
                  color: STUDIOS_INK,
                  fontSize: 15,
                  fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                See How VMB Works
              </Link>
            </div>
          </div>

          <div style={{ paddingTop: 4 }}>
            <p
              style={{
                margin: "0 0 12px",
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: ACCENT,
                textAlign: "center",
              }}
            >
              Your Salon Growth Engine
            </p>
            <StudioHeroVideoSlot
              videoSrc={HERO_VIDEO.videoSrc}
              thumbSrc={HERO_VIDEO.thumbSrc}
              foldImageUrl={HERO_VIDEO.foldImageUrl}
              modalTitle="Your Salon Growth Engine"
              overlayPrimary="Client-powered growth"
              overlaySecondary="Referrals · invitations · reactivations"
              badgeLabel="VMB"
              expectedFileHint={HERO_VIDEO.videoSrc}
              thumbPlayAriaLabel="Play VMB salon growth overview"
              cinemaAriaLabel="VMB salon growth video"
              fitParentWidth
            />
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section style={{ background: "#fff", borderTop: `1px solid ${STUDIOS_LINE}` }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "64px 24px" }}>
          <h2
            style={{
              margin: "0 0 12px",
              fontSize: "clamp(28px, 4vw, 40px)",
              fontWeight: 900,
              letterSpacing: "-0.02em",
              textAlign: "center",
            }}
          >
            Stop Paying For Attention.
            <br />
            Start Growing From Trust.
          </h2>
          <p
            style={{
              margin: "0 auto 40px",
              maxWidth: 680,
              textAlign: "center",
              fontSize: 17,
              lineHeight: 1.55,
              color: STUDIOS_MUTED,
            }}
          >
            Social media can build awareness. Booking software can manage appointments. VMB turns
            trusted client relationships into new business.
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 20,
            }}
          >
            {COMPARISON_CARDS.map((card) => (
              <div
                key={card.title}
                style={{
                  padding: "28px 24px",
                  borderRadius: 18,
                  background: card.highlight ? ACCENT_SOFT : WARM_BG,
                  border: card.highlight ? `2px solid ${ACCENT}` : `1px solid ${STUDIOS_LINE}`,
                  boxShadow: card.highlight ? STUDIOS_CARD_SHADOW : "none",
                }}
              >
                <h3 style={{ margin: "0 0 12px", fontSize: 20, fontWeight: 800 }}>{card.title}</h3>
                <p style={{ margin: 0, fontSize: 15, lineHeight: 1.55, color: STUDIOS_MUTED }}>
                  {card.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Existing book */}
      <section style={{ maxWidth: 1180, margin: "0 auto", padding: "64px 24px" }}>
        <h2
          style={{
            margin: "0 0 16px",
            fontSize: "clamp(26px, 3.5vw, 36px)",
            fontWeight: 900,
            letterSpacing: "-0.02em",
          }}
        >
          We Generate Business From Your Existing Book
        </h2>
        <p style={{ margin: "0 0 28px", fontSize: 17, lineHeight: 1.6, color: STUDIOS_MUTED, maxWidth: 720 }}>
          Your clients already know people who need hair, nails, skin, lashes, waxing, massage, and
          self-care services. VMB helps activate those relationships without asking you to change the
          way your salon operates.
        </p>
        <ul
          style={{
            margin: 0,
            padding: 0,
            listStyle: "none",
            display: "grid",
            gap: 12,
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          }}
        >
          {GROWTH_BULLETS.map((item) => (
            <li
              key={item}
              style={{
                padding: "14px 16px",
                borderRadius: 12,
                background: "#fff",
                border: `1px solid ${STUDIOS_LINE}`,
                fontSize: 15,
                fontWeight: 600,
                lineHeight: 1.45,
              }}
            >
              {item}
            </li>
          ))}
        </ul>
      </section>

      {/* How it works */}
      <section
        id="vmb-how-it-works"
        style={{ background: "#fff", borderTop: `1px solid ${STUDIOS_LINE}` }}
      >
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "64px 24px" }}>
          <h2
            style={{
              margin: "0 0 36px",
              fontSize: "clamp(26px, 3.5vw, 36px)",
              fontWeight: 900,
              letterSpacing: "-0.02em",
              textAlign: "center",
            }}
          >
            How VMB Works
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 24,
            }}
          >
            {HOW_STEPS.map((item) => (
              <div key={item.step} style={{ textAlign: "center", padding: "8px 12px" }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    margin: "0 auto 16px",
                    borderRadius: "50%",
                    background: ACCENT,
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 20,
                    fontWeight: 900,
                  }}
                >
                  {item.step}
                </div>
                <h3 style={{ margin: "0 0 10px", fontSize: 22, fontWeight: 800 }}>{item.title}</h3>
                <p style={{ margin: 0, fontSize: 15, lineHeight: 1.55, color: STUDIOS_MUTED }}>
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <VmbSampleResultsSection />

      {/* Trial offer */}
      <section
        id="vmb-trial"
        style={{
          background: `linear-gradient(180deg, ${ACCENT_SOFT} 0%, ${WARM_BG} 100%)`,
          borderTop: `1px solid ${STUDIOS_LINE}`,
        }}
      >
        <div
          style={{
            maxWidth: 720,
            margin: "0 auto",
            padding: "64px 24px 80px",
            textAlign: "center",
          }}
        >
          <h2
            style={{
              margin: "0 0 12px",
              fontSize: "clamp(28px, 4vw, 40px)",
              fontWeight: 900,
              letterSpacing: "-0.02em",
            }}
          >
            Try VMB Free For 30 Days
          </h2>
          <p style={{ margin: "0 0 32px", fontSize: 17, lineHeight: 1.55, color: STUDIOS_MUTED }}>
            No monthly fee. No annual contract. No back-office change. Keep your current salon
            software.
          </p>

          <form
            onSubmit={handleTrialSubmit}
            style={{
              textAlign: "left",
              padding: "28px",
              borderRadius: 20,
              background: "#fff",
              border: `1px solid ${STUDIOS_LINE}`,
              boxShadow: STUDIOS_CARD_SHADOW,
              display: "grid",
              gap: 14,
            }}
          >
            <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 700 }}>
              Your name
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={inputStyle}
                placeholder="Jane Smith"
              />
            </label>
            <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 700 }}>
              Salon or business name
              <input
                required
                value={salonName}
                onChange={(e) => setSalonName(e.target.value)}
                style={inputStyle}
                placeholder="Your salon name"
              />
            </label>
            <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 700 }}>
              Email
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={inputStyle}
                placeholder="you@yoursalon.com"
              />
            </label>
            <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 700 }}>
              Phone
              <input
                required
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={inputStyle}
                placeholder="(555) 555-5555"
              />
            </label>
            <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 700 }}>
              Current booking platform
              <select
                required
                value={providerPlatform}
                onChange={(e) => setProviderPlatform(e.target.value)}
                style={inputStyle}
              >
                {PROVIDER_OPTIONS.map((opt) => (
                  <option key={opt.value || "empty"} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
            {submitError ? (
              <div style={{ color: "#b91c1c", fontSize: 13 }}>{submitError}</div>
            ) : null}
            <button
              type="submit"
              disabled={submitting}
              style={{
                marginTop: 8,
                padding: "16px 24px",
                borderRadius: 12,
                border: "none",
                background: ACCENT,
                color: "#fff",
                fontSize: 16,
                fontWeight: 800,
                cursor: submitting ? "wait" : "pointer",
                opacity: submitting ? 0.8 : 1,
              }}
            >
              {submitting ? "Starting trial…" : "Start My 30-Day Trial"}
            </button>
          </form>

          <ul
            style={{
              margin: "28px 0 0",
              padding: 0,
              listStyle: "none",
              display: "grid",
              gap: 10,
              textAlign: "left",
              fontSize: 14,
              color: STUDIOS_MUTED,
            }}
          >
            {TRIAL_BULLETS.map((item) => (
              <li key={item}>✓ {item}</li>
            ))}
          </ul>

          <p style={{ marginTop: 32, fontSize: 13, color: STUDIOS_MUTED }}>
            <Link href="/studios" style={{ color: ACCENT, fontWeight: 700 }}>
              Explore AIH Studios
            </Link>
            {" · "}
            <Link href="/login" style={{ color: ACCENT, fontWeight: 700 }}>
              Sign in
            </Link>
          </p>
        </div>
      </section>

    </div>
  );
}

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 10,
  border: "1px solid rgba(0,0,0,0.1)",
  fontSize: 15,
  boxSizing: "border-box",
};
