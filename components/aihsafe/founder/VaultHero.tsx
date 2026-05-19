"use client";

import Link from "next/link";
import { Pencil } from "lucide-react";
import { formatDisplayInitials, formatDisplayName } from "@/lib/user/display-name";

export type VaultHeroUser = {
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  role?: string;
};

function HeroMetricPill({
  value,
  label,
  loading,
}: {
  value: number | string;
  label: string;
  loading: boolean;
}) {
  const display = loading ? "…" : value;
  return (
    <div
      style={{
        background:   "rgba(255,255,255,0.11)",
        border:       "1px solid rgba(255,255,255,0.28)",
        borderRadius: 12,
        padding:      "7px 12px",
        minWidth:     76,
        flexShrink:   0,
        boxShadow:    "0 4px 14px rgba(0,0,0,0.12)",
      }}
    >
      <div
        style={{
          fontWeight: 800,
          fontSize:   17,
          color:      "#fff",
          lineHeight: 1.05,
        }}
      >
        {display}
      </div>
      <div
        style={{
          fontSize:       9,
          fontWeight:     700,
          letterSpacing:  "0.09em",
          textTransform:  "uppercase",
          color:          "rgba(255,255,255,0.62)",
          marginTop:      3,
          whiteSpace:     "nowrap",
        }}
      >
        {label}
      </div>
    </div>
  );
}

export function VaultHeroSection({
  coverUrl,
  heroUser,
  eyebrow = "Msg Vault",
  title,
  description,
  spacesCount,
  membersCount,
  loading,
  variant,
}: {
  coverUrl: string | null;
  heroUser: VaultHeroUser | null;
  /** Small label above the title — use "Family Safe" on /aihsafe, "Msg Vault" on /msg-vault. */
  eyebrow?: string;
  title: string;
  description: string;
  spacesCount: number | string;
  membersCount: number | string;
  loading: boolean;
  variant: "full" | "compact";
}) {
  const heroMinH = variant === "compact" ? "96px" : "118px";
  const heroInnerPad = variant === "compact" ? "18px 22px" : "20px 24px";
  const showMetrics = variant === "full";
  const showAvatar = variant === "full" && heroUser != null;

  return (
    <section
      style={{
        position:     "relative",
        minHeight:    heroMinH,
        borderRadius: "24px",
        overflow:     "hidden",
        marginBottom: 12,
        border:       "1px solid rgba(255,255,255,0.55)",
        boxShadow:    "0 18px 40px rgba(28,25,23,0.10)",
        background: coverUrl
          ? `linear-gradient(90deg,rgba(15,23,42,0.78),rgba(15,23,42,0.32)), url(${coverUrl}) center/cover`
          : "linear-gradient(135deg,#1a1a2e 0%,#16213e 55%,#0f3460 100%)",
      }}
    >
      <div
        style={{
          position:   "absolute",
          inset:      0,
          background:
            "radial-gradient(circle at 84% 18%,rgba(244,162,97,0.38),transparent 28%), radial-gradient(circle at 10% 90%,rgba(233,108,80,0.24),transparent 34%)",
        }}
      />

      <div
        className="vault-hero-inner"
        style={{
          position:       "relative",
          zIndex:         1,
          padding:        heroInnerPad,
          display:        "flex",
          alignItems:     variant === "compact" ? "center" : "center",
          justifyContent: "space-between",
          gap:            "18px",
          minHeight:      heroMinH,
        }}
      >
        <div style={{ flex: "1 1 auto", minWidth: 0 }}>
          <p
            style={{
              fontSize:       "11px",
              fontWeight:     900,
              letterSpacing:  "0.16em",
              textTransform:  "uppercase",
              color:          "rgba(255,255,255,0.72)",
              marginBottom:   variant === "compact" ? 6 : 8,
              marginTop:      0,
            }}
          >
            {eyebrow}
          </p>
          <h1
            className="vault-hero-title"
            style={{
              fontSize:      variant === "compact" ? "22px" : "28px",
              fontWeight:    900,
              letterSpacing: "-0.65px",
              color:         "#fff",
              margin:        0,
              lineHeight:    1.12,
              textShadow:    "0 2px 18px rgba(0,0,0,0.22)",
            }}
          >
            {title}
          </h1>
          <p
            className="vault-hero-subtitle"
            style={{
              fontSize:   "14px",
              color:      "rgba(255,255,255,0.84)",
              marginTop:  variant === "compact" ? 5 : 6,
              marginBottom: 0,
              maxWidth:   "520px",
              lineHeight: 1.4,
            }}
          >
            {description}
          </p>
        </div>

        {showMetrics && (
          <div
            style={{
              display:        "flex",
              flexDirection:  "row",
              alignItems:     "center",
              gap:            10,
              flexShrink:     0,
            }}
          >
            <HeroMetricPill value={spacesCount} label="Spaces" loading={loading} />
            <HeroMetricPill value={membersCount} label="Members" loading={loading} />
          </div>
        )}

        {showAvatar && heroUser && (
          <div
            style={{
              display:        "flex",
              flexDirection:  "column",
              alignItems:     "center",
              gap:            "8px",
              flexShrink:     0,
            }}
          >
            <div style={{ position: "relative" }}>
              <div
                className="vault-hero-avatar-wrap"
                style={{
                  width:          "70px",
                  height:         "70px",
                  borderRadius:   "50%",
                  overflow:       "hidden",
                  background:     "rgba(255,255,255,0.24)",
                  border:         "3px solid rgba(255,255,255,0.78)",
                  display:        "flex",
                  alignItems:     "center",
                  justifyContent: "center",
                  boxShadow:      "0 10px 26px rgba(0,0,0,0.20)",
                }}
              >
                {heroUser.photoUrl ? (
                  <img
                    src={heroUser.photoUrl}
                    alt={formatDisplayName(heroUser)}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <span style={{ color: "white", fontWeight: 900, fontSize: "20px" }}>
                    {formatDisplayInitials(heroUser)}
                  </span>
                )}
              </div>
              <Link
                href="/settings"
                title="Edit profile"
                style={{
                  position:       "absolute",
                  bottom:         0,
                  right:          0,
                  width:          "22px",
                  height:         "22px",
                  borderRadius:   "50%",
                  background:     "white",
                  display:        "flex",
                  alignItems:     "center",
                  justifyContent: "center",
                  boxShadow:      "0 2px 8px rgba(0,0,0,0.25)",
                  textDecoration: "none",
                }}
              >
                <Pencil style={{ width: "11px", height: "11px", color: "#1c1917" }} />
              </Link>
            </div>
            <span
              style={{
                fontSize:     "12px",
                fontWeight:   800,
                color:        "#fff",
                textShadow:   "0 1px 10px rgba(0,0,0,0.28)",
                textAlign:    "center",
                maxWidth:     120,
                lineHeight:   1.2,
              }}
            >
              {formatDisplayName(heroUser)}
            </span>
          </div>
        )}
      </div>
    </section>
  );
}

const pillStyle: React.CSSProperties = {
  fontSize:     12,
  fontWeight:   600,
  padding:      "5px 11px",
  borderRadius: 999,
  background:   "#f5f5f4",
  color:        "#57534e",
  border:       "1px solid #e7e5e4",
  display:      "inline-flex",
  alignItems:   "center",
  gap:          6,
};

const primaryCtaStyle: React.CSSProperties = {
  display:        "inline-flex",
  alignItems:     "center",
  gap:            8,
  padding:        "10px 20px",
  borderRadius:   11,
  border:         "none",
  background:     "#7c3aed",
  color:          "#fff",
  fontWeight:     700,
  fontSize:       14,
  cursor:         "pointer",
  boxShadow:      "0 4px 14px rgba(124,58,237,0.28)",
};

export function VaultHeroToolbar({
  pendingInvitesCount,
  recentActivityDisplay,
  loading,
  showCreateCta,
  onCreateSpace,
}: {
  pendingInvitesCount: number;
  recentActivityDisplay: number | string;
  loading: boolean;
  showCreateCta: boolean;
  onCreateSpace: () => void;
}) {
  const pend = loading ? "…" : pendingInvitesCount;
  const act = loading ? "…" : recentActivityDisplay;

  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          display:    "flex",
          flexWrap:   "wrap",
          alignItems: "center",
          gap:        8,
          marginBottom: showCreateCta ? 12 : 0,
        }}
      >
        <span style={pillStyle}>
          {pend} pending invites
        </span>
        <span style={pillStyle}>
          {act} recent activity
        </span>
      </div>

      {showCreateCta && (
        <button type="button" onClick={onCreateSpace} style={primaryCtaStyle}>
          + Create Trusted Space
        </button>
      )}
    </div>
  );
}
