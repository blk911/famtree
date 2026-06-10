import Link from "next/link";
import { VMB_THEME } from "@/lib/vmb/theme";

export function VmbLanding() {
  return (
    <section
      style={{
        maxWidth: 1120,
        margin: "0 auto",
        padding: "72px 24px 96px",
      }}
    >
      <div
        className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2"
      >
        <div>
          <p
            style={{
              margin: "0 0 16px",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: VMB_THEME.accent,
            }}
          >
            VMB for Salons
          </p>
          <h1
            style={{
              margin: "0 0 20px",
              fontSize: "clamp(34px, 5vw, 52px)",
              fontWeight: 800,
              letterSpacing: "-0.04em",
              lineHeight: 1.08,
            }}
          >
            Your Clients Already Have A Beauty Network.
          </h1>
          <p
            style={{
              margin: "0 0 36px",
              fontSize: "clamp(17px, 2vw, 19px)",
              lineHeight: 1.6,
              color: VMB_THEME.muted,
              maxWidth: 520,
            }}
          >
            VMB helps you discover trusted relationships, unlock referrals, and grow revenue from
            the clients you already have.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            <Link
              href="/vmb/start"
              style={{
                display: "inline-block",
                padding: "14px 22px",
                borderRadius: 12,
                background: VMB_THEME.accent,
                color: "#fff",
                fontSize: 15,
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              Find The Gold In Your Book
            </Link>
            <Link
              href="/vmb/dashboard"
              style={{
                display: "inline-block",
                padding: "14px 22px",
                borderRadius: 12,
                border: `1px solid ${VMB_THEME.line}`,
                background: VMB_THEME.cardBg,
                color: VMB_THEME.ink,
                fontSize: 15,
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              See How VMB Works
            </Link>
          </div>
        </div>

        <div
          style={{
            borderRadius: 24,
            overflow: "hidden",
            background: `linear-gradient(145deg, ${VMB_THEME.accentSoft} 0%, #fff 55%)`,
            border: `1px solid ${VMB_THEME.line}`,
            padding: "32px 28px",
            minHeight: 360,
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
          }}
        >
          <p
            style={{
              margin: "0 0 8px",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: VMB_THEME.accent,
            }}
          >
            Relationship-first growth
          </p>
          <p
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              lineHeight: 1.35,
              maxWidth: 320,
            }}
          >
            Referrals, trusted providers, and reactivations — from the book you already own.
          </p>
        </div>
      </div>
    </section>
  );
}
