import Link from "next/link";
import { MapPin } from "lucide-react";
import type { Provider, ProviderCategory, StudioOffer } from "@/types/studios";
import { PROVIDER_CATEGORY_LABELS } from "@/types/studios";
import { STUDIOS_CARD_SHADOW, STUDIOS_INK, STUDIOS_LINE, STUDIOS_MUTED } from "@/lib/studios/visual";
import { TrainerPhoto } from "./TrainerPhoto";
import { TrainerOfferCards } from "./TrainerOfferCards";

const ACCENT_BY_CATEGORY: Record<ProviderCategory, string> = {
  trainer: "#c9a66b",
  strength_coach: "#c9a66b",
  mobility: "#7aab9a",
  massage: "#d4897a",
  physical_therapy: "#d4897a",
  sports_medicine: "#8b9dc3",
  recovery: "#7aab9a",
  sauna_cryo: "#7aab9a",
  hydration_iv: "#8b9dc3",
  nutrition: "#c9a66b",
  performance_coach: "#c9a66b",
};

const NAV = [
  { href: "#profile", label: "About" },
  { href: "#services", label: "Services" },
  { href: "#contact", label: "Contact" },
] as const;

export function TrainerStudioShell({ provider, offers }: { provider: Provider; offers: StudioOffer[] }) {
  const accent = ACCENT_BY_CATEGORY[provider.category] ?? "#c9a66b";
  const categoryLabel = PROVIDER_CATEGORY_LABELS[provider.category];
  const subtitle = [provider.serviceType, categoryLabel, provider.locationLabel].filter(Boolean).join(" · ");

  return (
    <>
      <section
        style={{
          position: "relative",
          padding: "56px 24px 48px",
          overflow: "hidden",
          textAlign: "center",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "-60px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "min(640px, 92vw)",
            height: "220px",
            background: "radial-gradient(circle, rgba(255, 218, 230, 0.45) 0%, transparent 70%)",
            filter: "blur(18px)",
            pointerEvents: "none",
          }}
        />
        <div style={{ position: "relative", zIndex: 1, maxWidth: "800px", margin: "0 auto" }}>
          <p
            style={{
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: STUDIOS_MUTED,
              marginBottom: "12px",
            }}
          >
            AIH Studios provider
          </p>
          <h1
            style={{
              fontSize: "clamp(32px, 5vw, 48px)",
              fontWeight: 700,
              letterSpacing: "-1.2px",
              lineHeight: 1.08,
              margin: "0 0 16px",
              color: STUDIOS_INK,
            }}
          >
            {provider.displayName}
          </h1>
          <p style={{ fontSize: "17px", lineHeight: 1.55, color: STUDIOS_MUTED, margin: 0 }}>{subtitle}</p>
          <div style={{ marginTop: "28px", display: "flex", justifyContent: "center", gap: "12px", flexWrap: "wrap" }}>
            <Link
              href="/studios"
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "12px 22px",
                borderRadius: "999px",
                background: "#fff",
                color: STUDIOS_INK,
                fontSize: "14px",
                fontWeight: 600,
                textDecoration: "none",
                border: `1px solid ${STUDIOS_LINE}`,
              }}
            >
              ← All studios
            </Link>
          </div>
        </div>
      </section>

      <section
        id="profile"
        style={{
          padding: "0 24px 40px",
          maxWidth: "1100px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
            gap: "40px",
            alignItems: "center",
          }}
        >
          <TrainerPhoto displayName={provider.displayName} imageUrl={provider.imageUrl} accent={accent} />
          <div>
            <h2 style={{ fontSize: "13px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: STUDIOS_MUTED, margin: "0 0 10px" }}>
              Profile
            </h2>
            <p style={{ fontSize: "clamp(18px, 2.5vw, 22px)", lineHeight: 1.55, color: "#404040", margin: 0 }}>
              {provider.bio ?? `${provider.displayName} offers ${categoryLabel.toLowerCase()} services through AIH Studios.`}
            </p>
          </div>
        </div>
      </section>

      <div
        className="mx-auto grid max-w-[1100px] grid-cols-1 gap-8 px-6 pb-[72px] md:grid-cols-[minmax(0,200px)_minmax(0,1fr)] md:items-start md:gap-8"
      >
        <nav
          aria-label="Page sections"
          className="relative top-0 flex flex-row flex-wrap gap-1 rounded-[18px] border bg-white p-4 md:sticky md:top-5 md:flex-col md:gap-1.5"
          style={{ borderColor: STUDIOS_LINE, boxShadow: STUDIOS_CARD_SHADOW }}
        >
          {NAV.map(({ href, label }) => (
            <a
              key={href}
              href={href}
              className="rounded-xl px-3.5 py-2.5 text-sm font-semibold text-[#262626] transition hover:bg-black/[0.04]"
              style={{ color: STUDIOS_INK }}
            >
              {label}
            </a>
          ))}
        </nav>

        <div style={{ minWidth: 0 }}>
          <section id="services" style={{ marginBottom: "48px" }}>
            <h2 style={{ fontSize: "clamp(22px, 3vw, 28px)", fontWeight: 700, color: STUDIOS_INK, margin: "0 0 8px", letterSpacing: "-0.3px" }}>
              Services & offers
            </h2>
            <p style={{ fontSize: "15px", color: STUDIOS_MUTED, margin: "0 0 24px", lineHeight: 1.5 }}>
              Tap a card to request — you&apos;ll share your email and a short note. No payment on this step.
            </p>
            <TrainerOfferCards providerName={provider.displayName} offers={offers} />
          </section>

          <section id="contact">
            <h2 style={{ fontSize: "clamp(22px, 3vw, 28px)", fontWeight: 700, color: STUDIOS_INK, margin: "0 0 16px", letterSpacing: "-0.3px" }}>
              Location & contact
            </h2>
            <div
              style={{
                padding: "22px",
                borderRadius: "20px",
                background: "#fff",
                border: `1px solid ${STUDIOS_LINE}`,
                boxShadow: STUDIOS_CARD_SHADOW,
                display: "flex",
                gap: "12px",
                alignItems: "flex-start",
              }}
            >
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "12px",
                  background: "rgba(201, 166, 107, 0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <MapPin style={{ width: "18px", height: "18px", color: "#b8956c" }} />
              </div>
              <div>
                <p style={{ margin: 0, fontWeight: 600, color: STUDIOS_INK }}>{provider.locationLabel ?? "Denver metro"}</p>
                {(provider.city || provider.state) && (
                  <p style={{ margin: "6px 0 0", fontSize: "14px", color: STUDIOS_MUTED }}>
                    {[provider.city, provider.state].filter(Boolean).join(", ")}
                  </p>
                )}
                <p style={{ margin: "12px 0 0", fontSize: "14px", lineHeight: 1.5, color: STUDIOS_MUTED }}>
                  Prefer to start through a service? Use a card above — requests go to this provider when backend routing is live.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
