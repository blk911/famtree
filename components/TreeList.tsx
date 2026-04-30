"use client";

import Link from "next/link";
import { useState } from "react";
import { MapPin } from "lucide-react";
import { FAMILY_ROLE_LABELS, type FamilyRole } from "@/types";

// ── Types ─────────────────────────────────────────────────────────────────────

export type FlatMember = {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  role: string;
  createdAt: string;
  profile: { bio: string | null; familyRole: string | null; location: string | null } | null;
};

export type FlatNode = {
  member: FlatMember;
  depth: number;
  isLast: boolean;
  prefixContinues: boolean[];
};

const PAGE = 5;

// ── Member card (original full size) ─────────────────────────────────────────

function MemberCard({ node, currentUserId }: { node: FlatNode; currentUserId: string | undefined }) {
  const { member, depth } = node;
  const isYou  = member.id === currentUserId;
  const levelLabel = depth === 0 ? "FOUNDER" : `L${depth}`;
  const inits  = `${member.firstName[0] ?? "?"}${member.lastName[0] ?? "?"}`.toUpperCase();
  const fRole  = member.profile?.familyRole;
  const joined = new Date(member.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" });

  return (
    <div style={{ marginLeft: depth * 20, marginBottom: "8px" }}>
      <Link
        href={isYou ? "/profile" : `/profile/${member.id}`}
        style={{
          display: "flex", alignItems: "center", gap: "14px",
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
        }}
      >
        {/* Level pill */}
        <span style={{
          fontSize: "10px", fontWeight: 700, letterSpacing: "0.3px", flexShrink: 0,
          padding: "3px 8px", borderRadius: "6px",
          background: depth === 0 ? "#fff7ed" : depth === 1 ? "#f0fdf4" : depth === 2 ? "#fef9f0" : "#f5f4f0",
          color:      depth === 0 ? "#92400e" : depth === 1 ? "#15803d" : depth === 2 ? "#92400e" : "#78716c",
          border: `1px solid ${depth === 0 ? "#fed7aa" : depth === 1 ? "#bbf7d0" : depth === 2 ? "#fed7aa" : "#e7e5e4"}`,
        }}>
          {levelLabel}
        </span>

        {/* Avatar */}
        <div style={{
          width: 42, height: 42, borderRadius: "50%", flexShrink: 0,
          overflow: "hidden", background: "#e7e5e4",
          display: "flex", alignItems: "center", justifyContent: "center",
          border: "2px solid #f5f4f0",
        }}>
          {member.photoUrl
            ? <img src={member.photoUrl} alt={member.firstName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <span style={{ fontSize: "15px", fontWeight: 700, color: "#78716c" }}>{inits}</span>
          }
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "7px", flexShrink: 0 }}>
            <span style={{ fontSize: "15px", fontWeight: 700, color: "#1c1917", whiteSpace: "nowrap" }}>
              {member.firstName} {member.lastName}
            </span>
            {isYou && (
              <span style={{ fontSize: "10px", fontWeight: 700, background: "#1c1917", color: "white", borderRadius: "999px", padding: "2px 8px" }}>
                You
              </span>
            )}
            {member.role === "founder" && (
              <span style={{ fontSize: "10px", fontWeight: 700, background: "#fff7ed", color: "#92400e", border: "1px solid #fed7aa", borderRadius: "999px", padding: "2px 8px" }}>
                Founder
              </span>
            )}
            {fRole && (
              <span style={{ fontSize: "11px", color: "#78716c", whiteSpace: "nowrap" }}>
                {FAMILY_ROLE_LABELS[fRole as FamilyRole] ?? fRole}
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
            <span style={{ fontSize: "12px", color: "#a8a29e", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>
              {member.profile.bio}
            </span>
          )}
        </div>

        <span style={{ fontSize: "11px", color: "#d6d3d1", whiteSpace: "nowrap", flexShrink: 0 }}>
          Joined {joined}
        </span>
      </Link>
    </div>
  );
}

// ── Section divider ───────────────────────────────────────────────────────────

function LevelDivider({ depth, indent }: { depth: number; indent: number }) {
  const isFounder = depth === 0;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "10px",
      marginLeft: indent, marginBottom: "10px", marginTop: isFounder ? 0 : "20px",
    }}>
      <span style={{
        fontSize: isFounder ? "18px" : "11px",
        fontWeight: isFounder ? 600 : 700,
        letterSpacing: isFounder ? "-0.2px" : "0.8px",
        color: isFounder ? "#1c1917" : depth === 1 ? "#15803d" : depth === 2 ? "#92400e" : "#78716c",
        textTransform: isFounder ? "none" : "uppercase",
      }}>
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
}: {
  items: FlatNode[];
  currentUserId: string | undefined;
}) {
  const [shown, setShown] = useState(PAGE);
  const visible   = items.slice(0, shown);
  const remaining = items.length - shown;

  // Track which depth levels have already had their header rendered
  const renderedLevels = new Set<number>();

  return (
    <div>
      {/* Members grouped with level headers */}
      {visible.map((node) => {
        const showHeader = !renderedLevels.has(node.depth);
        if (showHeader) renderedLevels.add(node.depth);
        return (
          <div key={node.member.id}>
            {showHeader && (
              <LevelDivider depth={node.depth} indent={node.depth * 20} />
            )}
            <MemberCard node={node} currentUserId={currentUserId} />
          </div>
        );
      })}

      {/* Show more */}
      {remaining > 0 && (
        <button
          onClick={() => setShown((n) => n + PAGE)}
          style={{
            marginTop: "12px", width: "100%", padding: "10px",
            background: "none", border: "1px solid #e7e5e4",
            borderRadius: "12px", cursor: "pointer",
            fontSize: "13px", fontWeight: 500, color: "#78716c",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "#fafaf9"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
        >
          Show more — {remaining} more member{remaining !== 1 ? "s" : ""}
        </button>
      )}
    </div>
  );
}
