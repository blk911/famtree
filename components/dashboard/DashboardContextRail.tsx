"use client";

import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { ContextRailCard } from "./ContextRailCard";
import type { FlatNode } from "@/components/TreeList";

interface TrustUnit {
  id: string;
  members: {
    user: { id: string; firstName: string; lastName: string; photoUrl: string | null };
  }[];
}

interface Props {
  flat: FlatNode[];
  totalMembers: number;
  trustUnits: TrustUnit[];
  currentUserId: string;
  activeDmPeerId: string | null;
  dmUnreadByPeerId: Record<string, number>;
  onMemberPrivateThreadClick: (memberUserId: string) => void;
}

export function DashboardContextRail({
  flat,
  totalMembers,
  trustUnits,
  currentUserId,
  activeDmPeerId,
  dmUnreadByPeerId,
  onMemberPrivateThreadClick,
}: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <ContextRailCard title="Family Tree" count={totalMembers} href="/tree">
        {flat.length === 0 ? (
          <p style={{ fontSize: 12, color: "#a8a29e", margin: 0 }}>
            No members yet — invite your family!
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {flat.slice(0, 5).map((node) => {
              const isSelf = node.member.id === currentUserId;
              const unread = dmUnreadByPeerId[node.member.id] ?? 0;
              const active = activeDmPeerId === node.member.id;
              return (
                <button
                  key={node.member.id}
                  type="button"
                  disabled={isSelf}
                  onClick={() => {
                    if (!isSelf) onMemberPrivateThreadClick(node.member.id);
                  }}
                  title={
                    isSelf
                      ? "This is you"
                      : `Open private thread with ${node.member.firstName} ${node.member.lastName}`
                  }
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 8px",
                    marginInline: -8,
                    borderRadius: 10,
                    border: active ? "1px solid #c7d2fe" : "1px solid transparent",
                    background: active ? "rgba(238,242,255,0.92)" : "transparent",
                    cursor: isSelf ? "default" : "pointer",
                    textAlign: "left",
                    opacity: isSelf ? 0.65 : 1,
                  }}
                >
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      flexShrink: 0,
                      overflow: "hidden",
                      background: "linear-gradient(135deg,#1a1a2e,#0f3460)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 9,
                      fontWeight: 700,
                      color: "white",
                    }}
                  >
                    {node.member.photoUrl ? (
                      <img
                        src={node.member.photoUrl}
                        alt=""
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      `${node.member.firstName[0] ?? ""}${node.member.lastName[0] ?? ""}`.toUpperCase()
                    )}
                  </div>
                  <span
                    style={{
                      fontSize: 12,
                      color: "#1c1917",
                      fontWeight: 500,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    {node.member.firstName} {node.member.lastName}
                  </span>
                  {!isSelf && (
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        flexShrink: 0,
                      }}
                    >
                      <MessageCircle
                        aria-hidden
                        style={{ width: 13, height: 13, color: "#818cf8", opacity: 0.9 }}
                      />
                      {unread > 0 ? (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: "white",
                            background: "#6366f1",
                            borderRadius: 999,
                            minWidth: 16,
                            height: 16,
                            padding: "0 4px",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            lineHeight: 1,
                          }}
                        >
                          {unread > 99 ? "99+" : unread}
                        </span>
                      ) : null}
                    </span>
                  )}
                </button>
              );
            })}
            {flat.length > 5 && (
              <Link
                href="/tree"
                style={{
                  fontSize: 11,
                  color: "#6366f1",
                  fontWeight: 600,
                  textDecoration: "none",
                  marginTop: 2,
                }}
              >
                +{flat.length - 5} more →
              </Link>
            )}
          </div>
        )}
      </ContextRailCard>

      {trustUnits.length > 0 && (
        <ContextRailCard title="Trust Units" count={trustUnits.length} href="/tree">
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {trustUnits.slice(0, 4).map((unit) => {
              const names = unit.members.slice(0, 2).map((m) => m.user.firstName).join(" · ");
              const extra = unit.members.length > 2 ? ` +${unit.members.length - 2}` : "";
              return (
                <div
                  key={unit.id}
                  style={{
                    fontSize: 12,
                    color: "#44403c",
                    fontWeight: 500,
                    padding: "5px 0",
                    borderTop: "1px solid #f5f4f0",
                  }}
                >
                  🤝 {names}
                  {extra}
                </div>
              );
            })}
          </div>
        </ContextRailCard>
      )}

      <ContextRailCard title="Msg Vault" href="/aihsafe">
        <p style={{ fontSize: 12, color: "#78716c", margin: 0, lineHeight: 1.45 }}>
          Open Msg Vault for overview, trusted spaces, activity, and members.
        </p>
      </ContextRailCard>
    </div>
  );
}
