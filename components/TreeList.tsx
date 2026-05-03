"use client";

import Link from "next/link";
import { useState } from "react";
import { Eye, EyeOff, MapPin, Volume2, VolumeX } from "lucide-react";
import { FAMILY_ROLE_LABELS, type FamilyRole } from "@/types";

// ── Types ─────────────────────────────────────────────────────────────────────

export type FlatMember = {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  role: string;
  status: string;
  createdAt: string;
  profile: { bio: string | null; familyRole: string | null; location: string | null } | null;
};

export type FlatNode = {
  member: FlatMember;
  depth: number;
  isLast: boolean;
  prefixContinues: boolean[];
};

export type TreePrefsMap = Record<string, { muted: boolean; hidden: boolean }>;

const PAGE = 5;

const ACCOUNT_STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  active: { bg: "#dcfce7", color: "#166534", label: "Active" },
  suspended: { bg: "#fef9c3", color: "#854d0e", label: "Suspended" },
  archived: { bg: "#e2e8f0", color: "#475569", label: "Archived" },
  blocked: { bg: "#fee2e2", color: "#991b1b", label: "Blocked" },
};

// ── Member row ────────────────────────────────────────────────────────────────

function MemberCard({
  node,
  currentUserId,
  pref,
  onPatchPref,
}: {
  node: FlatNode;
  currentUserId: string | undefined;
  pref: { muted: boolean; hidden: boolean };
  onPatchPref: (targetId: string, patch: Partial<{ muted: boolean; hidden: boolean }>) => void;
}) {
  const { member, depth } = node;
  const isYou = member.id === currentUserId;
  const levelLabel = depth === 0 ? "FOUNDER" : `L${depth}`;
  const inits = `${member.firstName[0] ?? "?"}${member.lastName[0] ?? "?"}`.toUpperCase();
  const fRole = member.profile?.familyRole;
  const joined = new Date(member.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" });
  const acct = ACCOUNT_STATUS_STYLE[member.status] ?? ACCOUNT_STATUS_STYLE.active;
  const dimmed = pref.hidden || pref.muted;

  return (
    <div style={{ marginLeft: depth * 20, marginBottom: "8px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "stretch",
          gap: "8px",
          opacity: pref.hidden ? 0.4 : pref.muted ? 0.72 : 1,
          transition: "opacity 0.15s",
        }}
      >
        <Link
          href={isYou ? "/profile" : `/profile/${member.id}`}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
            background: "white",
            border: isYou ? "1px solid #f59e0b" : "1px solid #ece9e3",
            borderRadius: "14px",
            padding: "12px 18px",
            textDecoration: "none",
            boxShadow: isYou
              ? "0 0 0 3px rgba(245,158,11,0.08), 0 1px 4px rgba(0,0,0,0.05)"
              : "0 1px 4px rgba(0,0,0,0.05)",
            transition: "box-shadow 0.15s, border-color 0.15s",
            minWidth: 0,
            flex: 1,
            filter: dimmed && !pref.hidden ? "grayscale(0.25)" : undefined,
          }}
        >
          <span
            style={{
              fontSize: "10px",
              fontWeight: 700,
              letterSpacing: "0.3px",
              flexShrink: 0,
              padding: "3px 8px",
              borderRadius: "6px",
              background: depth === 0 ? "#fff7ed" : depth === 1 ? "#f0fdf4" : depth === 2 ? "#fef9f0" : "#f5f4f0",
              color: depth === 0 ? "#92400e" : depth === 1 ? "#15803d" : depth === 2 ? "#92400e" : "#78716c",
              border: `1px solid ${
                depth === 0 ? "#fed7aa" : depth === 1 ? "#bbf7d0" : depth === 2 ? "#fed7aa" : "#e7e5e4"
              }`,
            }}
          >
            {levelLabel}
          </span>

          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: "50%",
              flexShrink: 0,
              overflow: "hidden",
              background: "#e7e5e4",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "2px solid #f5f4f0",
            }}
          >
            {member.photoUrl ? (
              <img src={member.photoUrl} alt={member.firstName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <span style={{ fontSize: "15px", fontWeight: 700, color: "#78716c" }}>{inits}</span>
            )}
          </div>

          <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "7px", flexShrink: 0 }}>
              <span style={{ fontSize: "15px", fontWeight: 700, color: "#1c1917", whiteSpace: "nowrap" }}>
                {member.firstName} {member.lastName}
              </span>
              {isYou && (
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    background: "#1c1917",
                    color: "white",
                    borderRadius: "999px",
                    padding: "2px 8px",
                  }}
                >
                  You
                </span>
              )}
              {member.role === "founder" && (
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    background: "#fff7ed",
                    color: "#92400e",
                    border: "1px solid #fed7aa",
                    borderRadius: "999px",
                    padding: "2px 8px",
                  }}
                >
                  Founder
                </span>
              )}
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: "999px",
                  background: acct.bg,
                  color: acct.color,
                  border: `1px solid ${acct.color}33`,
                  textTransform: "capitalize",
                }}
                title="Account status (site-wide)"
              >
                {acct.label}
              </span>
              {fRole && (
                <span style={{ fontSize: "11px", color: "#78716c", whiteSpace: "nowrap" }}>
                  {FAMILY_ROLE_LABELS[fRole as FamilyRole] ?? fRole}
                </span>
              )}
              {pref.muted && (
                <span style={{ fontSize: "10px", fontWeight: 700, color: "#a16207", background: "#fef9c3", padding: "2px 6px", borderRadius: "6px" }}>
                  Muted (you)
                </span>
              )}
              {pref.hidden && (
                <span style={{ fontSize: "10px", fontWeight: 700, color: "#475569", background: "#e2e8f0", padding: "2px 6px", borderRadius: "6px" }}>
                  Hidden (you)
                </span>
              )}
            </div>

            {member.profile?.location && (
              <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", color: "#a8a29e", whiteSpace: "nowrap" }}>
                <MapPin style={{ width: 11, height: 11 }} />
                {member.profile.location}
              </span>
            )}

            {member.profile?.bio && (
              <span
                style={{
                  fontSize: "12px",
                  color: "#a8a29e",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  flex: 1,
                  minWidth: 0,
                }}
              >
                {member.profile.bio}
              </span>
            )}
          </div>

          <span style={{ fontSize: "11px", color: "#d6d3d1", whiteSpace: "nowrap", flexShrink: 0 }}>Joined {joined}</span>
        </Link>

        {!isYou && currentUserId && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: "6px",
              flexShrink: 0,
            }}
            onClick={(e) => e.preventDefault()}
            title="These controls are yours only: they do not change this person’s account or what other members see."
          >
            <button
              type="button"
              title={
                pref.muted
                  ? "Unmute on your tree (still your-view-only; not site-wide)"
                  : "Mute on your tree — your view only; does not affect their account or other invitees’ trees"
              }
              onClick={(e) => {
                e.preventDefault();
                onPatchPref(member.id, { muted: !pref.muted });
              }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 36,
                height: 32,
                borderRadius: "8px",
                border: pref.muted ? "1px solid #ca8a04" : "1px solid #e7e5e4",
                background: pref.muted ? "#fef9c3" : "#fafaf9",
                cursor: "pointer",
                color: pref.muted ? "#854d0e" : "#78716c",
              }}
            >
              {pref.muted ? <VolumeX style={{ width: 16, height: 16 }} /> : <Volume2 style={{ width: 16, height: 16 }} />}
            </button>
            <button
              type="button"
              title={
                pref.hidden
                  ? "Show on your tree again (your-view-only)"
                  : "Hide / dim on your tree — your view only; not an admin block and does not affect others"
              }
              onClick={(e) => {
                e.preventDefault();
                onPatchPref(member.id, { hidden: !pref.hidden });
              }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 36,
                height: 32,
                borderRadius: "8px",
                border: pref.hidden ? "1px solid #64748b" : "1px solid #e7e5e4",
                background: pref.hidden ? "#e2e8f0" : "#fafaf9",
                cursor: "pointer",
                color: pref.hidden ? "#334155" : "#78716c",
              }}
            >
              {pref.hidden ? <Eye style={{ width: 16, height: 16 }} /> : <EyeOff style={{ width: 16, height: 16 }} />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Section divider ───────────────────────────────────────────────────────────

function LevelDivider({ depth, indent }: { depth: number; indent: number }) {
  const isFounder = depth === 0;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        marginLeft: indent,
        marginBottom: "10px",
        marginTop: isFounder ? 0 : "20px",
      }}
    >
      <span
        style={{
          fontSize: isFounder ? "18px" : "11px",
          fontWeight: isFounder ? 600 : 700,
          letterSpacing: isFounder ? "-0.2px" : "0.8px",
          color: isFounder ? "#1c1917" : depth === 1 ? "#15803d" : depth === 2 ? "#92400e" : "#78716c",
          textTransform: isFounder ? "none" : "uppercase",
        }}
      >
        {isFounder ? "My Family" : `Level ${depth}`}
      </span>
      <div style={{ flex: 1, height: 1, background: "#f0ede8" }} />
    </div>
  );
}

// ── Paginated list ────────────────────────────────────────────────────────────

export function TreeList({
  items,
  currentUserId,
  initialPrefs = {},
  privacyNote = "full",
}: {
  items: FlatNode[];
  currentUserId: string | undefined;
  initialPrefs?: TreePrefsMap;
  /** Explains mute/hide are per-viewer, not admin site-wide actions */
  privacyNote?: "full" | "short" | "none";
}) {
  const [shown, setShown] = useState(PAGE);
  const [prefs, setPrefs] = useState<TreePrefsMap>(initialPrefs);

  const visible = items.slice(0, shown);
  const remaining = items.length - shown;

  const patchPref = async (targetId: string, patch: Partial<{ muted: boolean; hidden: boolean }>) => {
    // Viewer is always the logged-in user; body is only targetId + flags (strict schema rejects viewerId).
    const res = await fetch("/api/tree/view-preference", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetId, ...patch }),
    });
    if (!res.ok) return;
    const data = await res.json();
    const p = data.preference as { targetId: string; muted: boolean; hidden: boolean };
    setPrefs((prev) => ({
      ...prev,
      [p.targetId]: { muted: p.muted, hidden: p.hidden },
    }));
  };

  const getPref = (id: string) => prefs[id] ?? { muted: false, hidden: false };

  const renderedLevels = new Set<number>();

  return (
    <div>
      {privacyNote === "full" && (
        <p style={{ fontSize: "12px", color: "#78716c", marginBottom: "14px", lineHeight: 1.55 }}>
          <strong>Your view only:</strong> Mute and hide change how <em>you</em> see people on this tree. They do{" "}
          <strong>not</strong> change anyone&apos;s account, passwords, or invitations, and each member has their own
          settings for their tree. <strong>Site-wide</strong> suspend / archive / block is only in{" "}
          <strong>Admin</strong>.
        </p>
      )}
      {privacyNote === "short" && (
        <p style={{ fontSize: "11px", color: "#a8a29e", marginBottom: "10px", lineHeight: 1.45 }}>
          Mute/hide: <strong>your</strong> tree only — not site-wide. Admin controls account-wide access.
        </p>
      )}
      {visible.map((node) => {
        const showHeader = !renderedLevels.has(node.depth);
        if (showHeader) renderedLevels.add(node.depth);
        return (
          <div key={node.member.id}>
            {showHeader && <LevelDivider depth={node.depth} indent={node.depth * 20} />}
            <MemberCard node={node} currentUserId={currentUserId} pref={getPref(node.member.id)} onPatchPref={patchPref} />
          </div>
        );
      })}

      {remaining > 0 && (
        <button
          type="button"
          onClick={() => setShown((n) => n + PAGE)}
          style={{
            marginTop: "12px",
            width: "100%",
            padding: "10px",
            background: "none",
            border: "1px solid #e7e5e4",
            borderRadius: "12px",
            cursor: "pointer",
            fontSize: "13px",
            fontWeight: 500,
            color: "#78716c",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#fafaf9";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "none";
          }}
        >
          Show more — {remaining} more member{remaining !== 1 ? "s" : ""}
        </button>
      )}
    </div>
  );
}
