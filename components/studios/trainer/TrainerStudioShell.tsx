import Link from "next/link";
import { MapPin, Play } from "lucide-react";
import type { Provider, ProviderCategory, StudioOffer } from "@/types/studios";
import { PROVIDER_CATEGORY_LABELS } from "@/types/studios";
import type { ApplyStudioHeroFields, ApplyStudioIntro } from "@/lib/studios/applyPreview";
import { STUDIOS_CARD_SHADOW, STUDIOS_INK, STUDIOS_LINE, STUDIOS_MUTED } from "@/lib/studios/visual";
import { TrainerPhoto } from "./TrainerPhoto";
import { TrainerOfferCards } from "./TrainerOfferCards";
import { ApplyStudiosStartFrame } from "./ApplyStudiosStartFrame";

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

const NAV_LIVE = [
  { href: "#profile", label: "About" },
  { href: "#services", label: "Services" },
  { href: "#contact", label: "Contact" },
] as const;

type ShellVariant = "live" | "start";

/** Ambient training photography — decorative backgrounds only (Unsplash). */
const TRAINING_HERO_IMG =
  "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1600&q=75";
const TRAINING_FOLD_IMG =
  "https://images.unsplash.com/photo-1574680096145-d05b474e2155?auto=format&fit=crop&w=1400&q=75";

/** OpenStreetMap embed (Denver area) — placeholder until studio address geocoding is wired. */
const STUDIO_PREVIEW_MAP_EMBED =
  "https://www.openstreetmap.org/export/embed.html?bbox=-105.15%2C39.68%2C-104.92%2C39.82&layer=mapnik";

function LocationContactSection({
  provider,
  description,
  showMap,
}: {
  provider: Provider;
  description: string;
  showMap?: boolean;
}) {
  const infoCard = (
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
        height: showMap ? "100%" : undefined,
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
        <p style={{ margin: "12px 0 0", fontSize: "14px", lineHeight: 1.5, color: STUDIOS_MUTED }}>{description}</p>
      </div>
    </div>
  );

  if (!showMap) {
    return infoCard;
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:items-stretch lg:gap-6">
      {infoCard}
      <div
        className="flex min-h-[260px] flex-col overflow-hidden rounded-[20px] border bg-white lg:min-h-[300px]"
        style={{ borderColor: STUDIOS_LINE, boxShadow: STUDIOS_CARD_SHADOW }}
      >
        <iframe
          title="Studio location map preview"
          src={STUDIO_PREVIEW_MAP_EMBED}
          className="h-[240px] w-full shrink-0 border-0 lg:h-auto lg:min-h-0 lg:flex-1"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
        <p className="m-0 border-t border-black/[0.06] bg-stone-50/80 px-3 py-2 text-center text-[11px] leading-snug text-stone-500">
          Preview map — your published address will center here.
        </p>
      </div>
    </div>
  );
}

function StudioPageMainColumns({
  nav,
  variant,
  provider,
  offers,
}: {
  nav?: readonly { readonly href: string; readonly label: string }[];
  variant: ShellVariant;
  provider: Provider;
  offers: StudioOffer[];
}) {
  if (variant === "start") {
    return (
      <div
        style={{
          borderTop: "1px solid rgba(0,0,0,0.06)",
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.72) 0%, rgba(250,247,241,0.92) 35%, rgba(243,238,228,0.55) 100%)",
        }}
      >
        <div className="mx-auto max-w-[1200px] px-6 pb-[72px] pt-10 md:pt-12">
          <div style={{ minWidth: 0 }}>
            <section id="services" style={{ marginBottom: "48px" }}>
              <h2
                style={{
                  fontSize: "clamp(22px, 3vw, 28px)",
                  fontWeight: 700,
                  color: STUDIOS_INK,
                  margin: "0 0 8px",
                  letterSpacing: "-0.3px",
                }}
              >
                Services & offers (preview)
              </h2>
              <p style={{ fontSize: "15px", color: STUDIOS_MUTED, margin: "0 0 24px", lineHeight: 1.5 }}>
                These sample cards match what clients will see. Open one to try the request flow — nothing is sent yet.
              </p>
              <TrainerOfferCards providerName={provider.displayName} offers={offers} previewMode gridColumns="four" />
            </section>
            <section id="contact">
              <h2
                style={{
                  fontSize: "clamp(22px, 3vw, 28px)",
                  fontWeight: 700,
                  color: STUDIOS_INK,
                  margin: "0 0 16px",
                  letterSpacing: "-0.3px",
                }}
              >
                Location & contact
              </h2>
              <LocationContactSection
                provider={provider}
                description="Your real service area and contact options appear here after your studio is approved and published."
                showMap
              />
            </section>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-[1100px] grid-cols-1 gap-8 px-6 pb-[72px] md:grid-cols-[minmax(0,200px)_minmax(0,1fr)] md:items-start md:gap-8">
      <nav
        aria-label="Page sections"
        className="relative top-0 flex flex-row flex-wrap gap-1 rounded-[18px] border bg-white p-4 md:sticky md:top-5 md:flex-col md:gap-1.5"
        style={{ borderColor: STUDIOS_LINE, boxShadow: STUDIOS_CARD_SHADOW }}
      >
        {(nav ?? NAV_LIVE).map(({ href, label }) => (
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
          <h2
            style={{
              fontSize: "clamp(22px, 3vw, 28px)",
              fontWeight: 700,
              color: STUDIOS_INK,
              margin: "0 0 8px",
              letterSpacing: "-0.3px",
            }}
          >
            Services & offers
          </h2>
          <p style={{ fontSize: "15px", color: STUDIOS_MUTED, margin: "0 0 24px", lineHeight: 1.5 }}>
            Tap a card to request — you'll share your email and a short note. No payment on this step.
          </p>
          <TrainerOfferCards providerName={provider.displayName} offers={offers} previewMode={false} />
        </section>

        <section id="contact">
          <h2
            style={{
              fontSize: "clamp(22px, 3vw, 28px)",
              fontWeight: 700,
              color: STUDIOS_INK,
              margin: "0 0 16px",
              letterSpacing: "-0.3px",
            }}
          >
            Location & contact
          </h2>
          <LocationContactSection
            provider={provider}
            description="Prefer to start through a service? Use a card above — requests go to this provider when backend routing is live."
            showMap
          />
        </section>
      </div>
    </div>
  );
}

export function TrainerStudioShell({
  provider,
  offers,
  variant = "live",
  applyTemplate,
}: {
  provider: Provider;
  offers: StudioOffer[];
  variant?: ShellVariant;
  /** When variant is "start", pass hero + intro copy (studio member template). */
  applyTemplate?: { hero: ApplyStudioHeroFields; intro: ApplyStudioIntro };
}) {
  const accent = ACCENT_BY_CATEGORY[provider.category] ?? "#c9a66b";
  const categoryLabel = PROVIDER_CATEGORY_LABELS[provider.category];
  const subtitle = [provider.serviceType, categoryLabel, provider.locationLabel].filter(Boolean).join(" · ");
  const eyebrow = variant === "start" ? "Start your studio" : "AIH Studios provider";

  const applyHero = variant === "start" && applyTemplate ? applyTemplate.hero : null;
  const applyIntro = variant === "start" && applyTemplate ? applyTemplate.intro : null;

  return (
    <>
      {applyHero && applyIntro ? (
        <ApplyStudiosStartFrame
          initialHero={applyHero}
          provider={{ displayName: provider.displayName, imageUrl: provider.imageUrl }}
          accent={accent}
        >
          <section
            id="intro"
            style={{
              position: "relative",
              margin: "0 auto",
              maxWidth: "1100px",
              padding: "48px 24px 56px",
              borderBottom: "1px solid rgba(0,0,0,0.06)",
              overflow: "hidden",
              background: "linear-gradient(120deg, rgba(255,255,255,0.96) 0%, rgba(247,245,238,0.94) 45%, rgba(235,243,252,0.55) 100%)",
            }}
          >
            <div
              aria-hidden
              style={{
                position: "absolute",
                inset: 0,
                backgroundImage: `url(${TRAINING_HERO_IMG})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                opacity: 0.13,
                pointerEvents: "none",
              }}
            />
            <div style={{ position: "relative", zIndex: 1 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
                  gap: "40px",
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    borderRadius: "22px",
                    overflow: "hidden",
                    border: `1px solid ${STUDIOS_LINE}`,
                    boxShadow: STUDIOS_CARD_SHADOW,
                    background: "linear-gradient(160deg, rgba(250,248,245,0.95) 0%, #fff 45%, #f3f0eb 100%)",
                    aspectRatio: "16 / 9",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "10px",
                    position: "relative",
                  }}
                >
                  <div
                    aria-hidden
                    style={{
                      position: "absolute",
                      inset: 0,
                      backgroundImage: `url(${TRAINING_FOLD_IMG})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      opacity: 0.18,
                    }}
                  />
                  <div
                    style={{
                      width: "64px",
                      height: "64px",
                      borderRadius: "50%",
                      background: "rgba(38, 38, 38, 0.88)",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      position: "relative",
                      zIndex: 1,
                    }}
                  >
                    <Play style={{ width: "26px", height: "26px", marginLeft: "4px" }} fill="currentColor" />
                  </div>
                  <span
                    style={{
                      fontSize: "14px",
                      fontWeight: 600,
                      color: STUDIOS_MUTED,
                      position: "relative",
                      zIndex: 1,
                    }}
                  >
                    Intro video
                  </span>
                  <span
                    style={{
                      fontSize: "12px",
                      color: STUDIOS_MUTED,
                      opacity: 0.85,
                      position: "relative",
                      zIndex: 1,
                    }}
                  >
                    Placeholder — upload after approval
                  </span>
                  {/* TODO(studios:video): embed or signed URL */}
                </div>

                <div>
                  <h2
                    style={{
                      fontSize: "clamp(22px, 3vw, 28px)",
                      fontWeight: 700,
                      color: STUDIOS_INK,
                      margin: "0 0 20px",
                      letterSpacing: "-0.3px",
                      lineHeight: 1.2,
                    }}
                  >
                    {applyIntro.title}
                  </h2>
                  <ul style={{ margin: 0, paddingLeft: "22px", display: "flex", flexDirection: "column", gap: "14px" }}>
                    {applyIntro.bullets.map((line) => (
                      <li key={line} style={{ fontSize: "16px", lineHeight: 1.55, color: "#404040" }}>
                        {line}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </section>
          <StudioPageMainColumns variant="start" provider={provider} offers={offers} />
        </ApplyStudiosStartFrame>
      ) : (
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
                {eyebrow}
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
                <h2
                  style={{
                    fontSize: "13px",
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: STUDIOS_MUTED,
                    margin: "0 0 10px",
                  }}
                >
                  Profile
                </h2>
                <p style={{ fontSize: "clamp(18px, 2.5vw, 22px)", lineHeight: 1.55, color: "#404040", margin: 0 }}>
                  {provider.bio ?? `${provider.displayName} offers ${categoryLabel.toLowerCase()} services through AIH Studios.`}
                </p>
              </div>
            </div>
          </section>

          <StudioPageMainColumns nav={NAV_LIVE} variant="live" provider={provider} offers={offers} />
        </>
      )}
    </>
  );
}
