"use client";

import { AvatarChip }    from "@/components/aihsafe/common/AvatarChip";
import { SectionHeader } from "@/components/aihsafe/common/SectionHeader";
import type { GuardianLinkDTO } from "@/types/aihsafe/dto";

const KIND_LABELS: Record<string, string> = {
  parent:          "Parent",
  grandparent:     "Grandparent",
  legal_guardian:  "Legal Guardian",
  trusted_adult:   "Trusted Adult",
};

const KIND_ICONS: Record<string, string> = {
  parent:          "🏠",
  grandparent:     "🌿",
  legal_guardian:  "⚖️",
  trusted_adult:   "🛡",
};

const PERMISSION_LABELS: Record<string, { label: string; bg: string; fg: string }> = {
  view_only:    { label: "View only",    bg: "#f5f5f4", fg: "#78716c" },
  approver:     { label: "Approver",     bg: "#dbeafe", fg: "#1e40af" },
  full_control: { label: "Full control", bg: "#d1fae5", fg: "#065f46" },
};

interface Props {
  guardianLinks:  GuardianLinkDTO[];
  currentUserId:  string;
  loading:        boolean;
  onAddClick?:    () => void;
}

export function TrustedExtensionsPanel({ guardianLinks, currentUserId, loading, onAddClick }: Props) {
  // Active (non-revoked) links where current user is guardian
  const asGuardian = guardianLinks.filter(
    l => l.guardianUserId === currentUserId && !l.revokedAt
  );
  // Active links where current user is the child/supervised person
  const asChild = guardianLinks.filter(
    l => l.childUserId === currentUserId && !l.revokedAt
  );

  return (
    <div
      style={{
        background:   "#fff",
        borderRadius: 16,
        border:       "1px solid #e7e5e4",
        padding:      "20px 22px",
        marginBottom: 14,
      }}
    >
      <SectionHeader
        title="Trusted Adults &amp; Guardians"
        action={
          onAddClick ? (
            <button
              type="button"
              onClick={onAddClick}
              style={{
                background:   "transparent",
                border:       "1px solid #e7e5e4",
                borderRadius: 8,
                padding:      "4px 12px",
                fontSize:     12,
                fontWeight:   600,
                color:        "#44403c",
                cursor:       "pointer",
              }}
            >
              + Link
            </button>
          ) : undefined
        }
      />

      {loading && (
        <p style={{ fontSize: 13, color: "#a8a29e", margin: 0 }}>Loading…</p>
      )}

      {!loading && asGuardian.length === 0 && asChild.length === 0 && (
        <div style={{ textAlign: "center", padding: "20px 0" }}>
          <p style={{ fontSize: 13, color: "#a8a29e", margin: 0 }}>
            No guardian relationships established yet.
          </p>
          <p style={{ fontSize: 12, color: "#d6d3d1", margin: "6px 0 0" }}>
            Guardian links give trusted adults oversight of minors in your network.
          </p>
        </div>
      )}

      {/* Guardians I oversee */}
      {!loading && asGuardian.length > 0 && (
        <div style={{ marginBottom: asChild.length > 0 ? 16 : 0 }}>
          <div
            style={{
              fontSize:      11,
              fontWeight:    700,
              color:         "#a8a29e",
              letterSpacing: "0.07em",
              textTransform: "uppercase",
              marginBottom:  10,
            }}
          >
            You oversee
          </div>
          {asGuardian.map(link => (
            <LinkRow key={link.id} link={link} nameField="childName" />
          ))}
        </div>
      )}

      {/* My guardians */}
      {!loading && asChild.length > 0 && (
        <div>
          <div
            style={{
              fontSize:      11,
              fontWeight:    700,
              color:         "#a8a29e",
              letterSpacing: "0.07em",
              textTransform: "uppercase",
              marginBottom:  10,
            }}
          >
            Your guardians
          </div>
          {asChild.map(link => (
            <LinkRow key={link.id} link={link} nameField="guardianName" />
          ))}
        </div>
      )}
    </div>
  );
}

function LinkRow({ link, nameField }: { link: GuardianLinkDTO; nameField: "childName" | "guardianName" }) {
  const name  = link[nameField] || "Unknown";
  const perm  = PERMISSION_LABELS[link.permissionLevel] ?? { label: link.permissionLevel, bg: "#f5f5f4", fg: "#44403c" };
  const icon  = KIND_ICONS[link.kind]   ?? "👤";
  const label = KIND_LABELS[link.kind]  ?? link.kind;

  return (
    <div
      style={{
        display:        "flex",
        alignItems:     "center",
        gap:            12,
        padding:        "10px 0",
        borderBottom:   "1px solid #f5f5f4",
      }}
    >
      <AvatarChip name={name} size={36} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: "#1c1917", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {name}
        </div>
        <div style={{ fontSize: 12, color: "#78716c", display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
          <span>{icon}</span>
          <span>{label}</span>
        </div>
      </div>
      <span
        style={{
          fontSize:     11,
          fontWeight:   600,
          background:   perm.bg,
          color:        perm.fg,
          borderRadius: 8,
          padding:      "3px 9px",
          whiteSpace:   "nowrap",
          flexShrink:   0,
        }}
      >
        {perm.label}
      </span>
    </div>
  );
}
