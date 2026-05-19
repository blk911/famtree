"use client";

import { useState } from "react";
import Link from "next/link";
import { Users, Lock, User, Mail, ShieldCheck } from "lucide-react";
import { DashboardPrivateThreadCenter } from "@/components/dashboard/DashboardPrivateThreadCenter";
import {
  DashboardPostsPanel,
  type SerializedDashboardPost,
} from "@/components/dashboard/DashboardPostsPanel";

type TabId = "posts" | "pvt-feeds" | "my-posts" | "invites";

export type DashboardTabId = TabId;

type ComposerSpace = { id: string; kind: "BUSINESS" | "CLUB" | "CHURCH"; name: string | null };

interface SerializedInvite {
  id: string;
  recipientEmail: string;
  status: string;
  createdAt: string;
}

type TrustUnitRow = {
  id: string;
  members: Array<{
    user: {
      id: string;
      firstName: string;
      lastName: string;
      photoUrl: string | null;
    };
  }>;
};

type PrivateMember = {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
};

const MSG_VAULT_HREF = "/msg-vault";

interface Props {
  currentUserId: string;
  currentUserRole: string;
  tab?: TabId;
  onTabChange?: (tab: TabId) => void;
  lastSeenAt?: string | null;
  newPostsCount: number;
  newCommentsCount: number;
  invites: SerializedInvite[];
  composerSpaces: ComposerSpace[];
  serializedFeedPosts: SerializedDashboardPost[];
  serializedPrivatePosts: SerializedDashboardPost[];
  serializedMyPosts: SerializedDashboardPost[];
  trustUnits: TrustUnitRow[];
  membersForPrivate: PrivateMember[];
  bondPeers: PrivateMember[];
  /** Badge on Msg Vault tab — same signal as sidebar (see getVaultNotificationCount). */
  vaultNotificationCount: number;
  launchDmPeerId?: string | null;
  onLaunchDmPeerConsumed?: () => void;
  onActiveDirectPeerChange?: (peerId: string | null) => void;
  selectedPrivateThreadKey?: string | null;
  onSelectedPrivateThreadKeyChange?: (key: string | null) => void;
}

const STATUS_COLOR: Record<string, string> = {
  PENDING: "#f59e0b",
  ACCEPTED: "#10b981",
  REGISTERED: "#059669",
  EXPIRED: "#ef4444",
  CANCELLED: "#9ca3af",
};
const STATUS_BG: Record<string, string> = {
  PENDING: "#fef3c7",
  ACCEPTED: "#d1fae5",
  REGISTERED: "#d1fae5",
  EXPIRED: "#fee2e2",
  CANCELLED: "#f3f4f6",
};

function TabBadge({ count }: { count: number }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#ef4444",
        color: "white",
        borderRadius: 999,
        fontSize: 10,
        fontWeight: 700,
        minWidth: 16,
        height: 16,
        padding: "0 4px",
        lineHeight: 1,
      }}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

function PanelTitle({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 15,
        fontWeight: 700,
        color: "#1c1917",
        marginBottom: 14,
        letterSpacing: "-0.02em",
      }}
    >
      {children}
    </div>
  );
}

export function DashboardVaultTabs({
  currentUserId,
  currentUserRole,
  tab: controlledTab,
  onTabChange,
  lastSeenAt = null,
  launchDmPeerId = null,
  onLaunchDmPeerConsumed,
  onActiveDirectPeerChange,
  selectedPrivateThreadKey = null,
  onSelectedPrivateThreadKeyChange,
  newPostsCount,
  newCommentsCount,
  invites,
  composerSpaces,
  serializedFeedPosts,
  serializedPrivatePosts,
  serializedMyPosts,
  trustUnits,
  membersForPrivate,
  bondPeers,
  vaultNotificationCount,
}: Props) {
  const [uncontrolledTab, setUncontrolledTab] = useState<TabId>("posts");
  const isControlled = controlledTab !== undefined;
  const tab = isControlled ? controlledTab : uncontrolledTab;

  function setTab(next: TabId) {
    if (!isControlled) setUncontrolledTab(next);
    onTabChange?.(next);
  }
  const pendingCount = invites.filter((i) => i.status === "PENDING").length;

  const TABS: { id: TabId; label: string; Icon: React.ElementType; badge?: number }[] = [
    { id: "posts", label: "Posts", Icon: Users, badge: newPostsCount > 0 ? newPostsCount : undefined },
    {
      id: "pvt-feeds",
      label: "Private Threads",
      Icon: Lock,
      badge: newCommentsCount > 0 ? newCommentsCount : undefined,
    },
    { id: "my-posts", label: "My Posts", Icon: User },
    { id: "invites", label: "Invites", Icon: Mail, badge: pendingCount > 0 ? pendingCount : undefined },
  ];

  const inactiveTabLinkStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 5,
    padding: "7px 12px 9px",
    flexShrink: 0,
    background: "none",
    border: "none",
    borderBottom: "2px solid transparent",
    color: "#78716c",
    fontWeight: 500,
    fontSize: 13,
    cursor: "pointer",
    whiteSpace: "nowrap",
    textDecoration: "none",
    transition: "color 0.12s, border-color 0.12s",
  };

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 16,
        border: "1px solid #ece9e3",
        boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
        overflow: "visible",
      }}
    >
      <div
        role="tablist"
        aria-label="Dashboard sections"
        style={{
          display: "flex",
          gap: 3,
          padding: "10px 12px 0",
          overflowX: "auto",
          scrollbarWidth: "none",
          borderBottom: "1px solid #f5f4f0",
        }}
      >
        {TABS.map(({ id, label, Icon, badge }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "7px 12px 9px",
                flexShrink: 0,
                background: "none",
                border: "none",
                borderBottom: active ? "2px solid #6366f1" : "2px solid transparent",
                color: active ? "#1c1917" : "#78716c",
                fontWeight: active ? 650 : 500,
                fontSize: 13,
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "color 0.12s, border-color 0.12s",
              }}
            >
              <Icon style={{ width: 14, height: 14, flexShrink: 0 }} />
              {label}
              {badge !== undefined && <TabBadge count={badge} />}
            </button>
          );
        })}

        {/* Msg Vault — navigates to full page (no inline preview). */}
        <Link
          href={MSG_VAULT_HREF}
          role="tab"
          prefetch
          aria-label={
            vaultNotificationCount > 0
              ? `Msg Vault, ${vaultNotificationCount} notifications`
              : "Msg Vault"
          }
          style={inactiveTabLinkStyle}
        >
          <ShieldCheck style={{ width: 14, height: 14, flexShrink: 0 }} />
          Msg Vault
          {vaultNotificationCount > 0 && <TabBadge count={vaultNotificationCount} />}
        </Link>
      </div>

      <div style={{ padding: "20px", minHeight: 220 }}>
        {tab === "posts" && (
          <div>
            <DashboardPostsPanel
              variant="feed"
              currentUserId={currentUserId}
              currentUserRole={currentUserRole}
              composerSpaces={composerSpaces}
              posts={serializedFeedPosts}
              newPostsCount={newPostsCount}
            />
          </div>
        )}

        {tab === "pvt-feeds" && (
          <div>
            <PanelTitle>Private Threads</PanelTitle>
            <DashboardPrivateThreadCenter
              key="dashboard-private-feed"
              currentUserId={currentUserId}
              trustUnits={trustUnits}
              posts={serializedPrivatePosts}
              members={membersForPrivate}
              bondPeers={bondPeers}
              selectedThreadKey={selectedPrivateThreadKey}
              launchDmPeerId={launchDmPeerId}
              onLaunchDmPeerConsumed={onLaunchDmPeerConsumed}
              onActiveDirectPeerChange={onActiveDirectPeerChange}
              onSelectedThreadKeyChange={onSelectedPrivateThreadKeyChange}
            />
          </div>
        )}

        {tab === "my-posts" && (
          <div>
            <PanelTitle>My Posts</PanelTitle>
            <DashboardPostsPanel
              variant="mine"
              currentUserId={currentUserId}
              currentUserRole={currentUserRole}
              composerSpaces={composerSpaces}
              posts={serializedMyPosts}
              newPostsCount={0}
              emptyMineHint={
                <button
                  type="button"
                  onClick={() => setTab("posts")}
                  style={{
                    marginTop: 16,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 18px",
                    background: "#1c1917",
                    color: "white",
                    borderRadius: 10,
                    border: "none",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  <User style={{ width: 14, height: 14 }} />
                  Write your first post
                </button>
              }
            />
          </div>
        )}

        {tab === "invites" && (
          <div>
            {invites.length === 0 ? (
              <div style={{ textAlign: "center", padding: "24px 0" }}>
                <Mail style={{ width: 28, height: 28, color: "#d6d3d1", margin: "0 auto 10px" }} />
                <p style={{ fontSize: 14, color: "#a8a29e", margin: "0 0 14px" }}>No invites sent yet.</p>
                <Link
                  href="/invite"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "9px 16px",
                    background: "#1c1917",
                    color: "white",
                    borderRadius: 9,
                    textDecoration: "none",
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  <Mail style={{ width: 13, height: 13 }} /> Invite someone
                </Link>
              </div>
            ) : (
              <>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 12,
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#1c1917", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span>Invites</span>
                    {pendingCount > 0 && (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: "#f59e0b",
                          background: "#fef3c7",
                          borderRadius: 999,
                          padding: "2px 7px",
                        }}
                      >
                        {pendingCount} pending
                      </span>
                    )}
                  </div>
                  <Link href="/invite" style={{ fontSize: 12, color: "#6366f1", fontWeight: 600, textDecoration: "none" }}>
                    + New invite
                  </Link>
                </div>
                {invites.map((inv, i) => (
                  <div
                    key={inv.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "11px 0",
                      borderBottom: i < invites.length - 1 ? "1px solid #f5f4f0" : "none",
                    }}
                  >
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 500, color: "#1c1917" }}>{inv.recipientEmail}</span>
                      <span style={{ fontSize: 11, color: "#a8a29e", marginLeft: 10 }}>
                        {new Date(inv.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    </div>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        padding: "3px 10px",
                        borderRadius: 999,
                        fontSize: 11,
                        fontWeight: 600,
                        color: STATUS_COLOR[inv.status] ?? "#78716c",
                        background: STATUS_BG[inv.status] ?? "#f5f5f4",
                      }}
                    >
                      {inv.status.charAt(0) + inv.status.slice(1).toLowerCase()}
                    </span>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
