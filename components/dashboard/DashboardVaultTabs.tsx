"use client";

import { useState } from "react";
import Link from "next/link";
import { Users, Lock, User, Mail, ShieldCheck, CheckCircle } from "lucide-react";
import { FamilyFeedClient } from "@/components/FamilyFeedClient";
import { PrivateFeedClient } from "@/components/PrivateFeedClient";
import { MyPostsMount } from "@/components/dashboard/MyPostsMount";

type TabId = "posts" | "pvt-feeds" | "my-posts" | "invites" | "family-safe";

// Serialized post shape — matches what FamilyFeedClient / PrivateFeedClient expect at runtime
type SerializedPost = {
  id: string;
  title?: string | null;
  body: string;
  imageUrl: string | null;
  createdAt: string;
  updatedAt?: string;
  _count?: { likes: number; comments: number; thumbsUp?: number; thumbsDown?: number };
  visibility?: Array<{ userId: string }>;
  profile: {
    user: { id: string; firstName: string; lastName: string; photoUrl: string | null };
    [key: string]: unknown;
  };
};

type SimpleUser = {
  id: string; firstName: string; lastName: string; photoUrl: string | null;
};

type TrustUnitMin = {
  id: string;
  members: Array<{ user: { id: string; firstName: string; lastName: string; photoUrl: string | null } }>;
};

interface SerializedInvite {
  id:             string;
  recipientEmail: string;
  status:         string;
  createdAt:      string;
}

interface Props {
  // badge counts (kept for tab indicators)
  newPostsCount:    number;
  newCommentsCount: number;
  // invite list for Invites tab
  invites:          SerializedInvite[];
  // feed mount data
  currentUserId:    string;
  feedPosts:        SerializedPost[];
  privatePosts:     SerializedPost[];
  privateMembers:   SimpleUser[];
  bondPeers:        SimpleUser[];
  trustUnits:       TrustUnitMin[];
}

const STATUS_COLOR: Record<string, string> = {
  PENDING:"#f59e0b", ACCEPTED:"#10b981", REGISTERED:"#059669",
  EXPIRED:"#ef4444", CANCELLED:"#9ca3af",
};
const STATUS_BG: Record<string, string> = {
  PENDING:"#fef3c7", ACCEPTED:"#d1fae5", REGISTERED:"#d1fae5",
  EXPIRED:"#fee2e2", CANCELLED:"#f3f4f6",
};

export function DashboardVaultTabs({
  newPostsCount,
  newCommentsCount,
  invites,
  currentUserId,
  feedPosts,
  privatePosts,
  privateMembers,
  bondPeers,
  trustUnits,
}: Props) {
  const [tab, setTab] = useState<TabId>("posts");
  const pendingCount = invites.filter(i => i.status === "PENDING").length;

  const TABS: { id: TabId; label: string; Icon: React.ElementType; badge?: number }[] = [
    { id:"posts",       label:"Posts",       Icon:Users,      badge:newPostsCount > 0 ? newPostsCount : undefined },
    { id:"pvt-feeds",   label:"Pvt Feeds",   Icon:Lock,       badge:newCommentsCount > 0 ? newCommentsCount : undefined },
    { id:"my-posts",    label:"My Posts",    Icon:User },
    { id:"invites",     label:"Invites",     Icon:Mail,       badge:pendingCount > 0 ? pendingCount : undefined },
    { id:"family-safe", label:"Family Safe", Icon:ShieldCheck },
  ];

  return (
    <div style={{
      background:"#fff", borderRadius:16, border:"1px solid #ece9e3",
      boxShadow:"0 1px 4px rgba(0,0,0,0.05)",
    }}>
      {/* Tab bar */}
      <div
        role="tablist"
        style={{
          display:"flex", borderBottom:"1px solid #f5f4f0",
          overflowX:"auto", scrollbarWidth:"none",
          borderRadius:"16px 16px 0 0",
        }}
      >
        {TABS.map(({ id, label, Icon, badge }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              role="tab"
              aria-selected={active}
              onClick={() => setTab(id)}
              style={{
                display:"flex", alignItems:"center", gap:5,
                padding:"11px 14px", background:"none", border:"none",
                borderBottom: active ? "2px solid #6366f1" : "2px solid transparent",
                color: active ? "#6366f1" : "#78716c",
                fontWeight: active ? 700 : 500,
                fontSize:13, cursor:"pointer", whiteSpace:"nowrap", flexShrink:0,
              }}
            >
              <Icon style={{ width:13, height:13, flexShrink:0 }} />
              {label}
              {badge !== undefined && (
                <span style={{
                  background:"#ef4444", color:"white", borderRadius:999,
                  fontSize:9, fontWeight:800, padding:"1px 4px", lineHeight:1.4,
                }}>
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Panels ── */}

      {/* Posts: full family-wide open feed */}
      {tab === "posts" && (
        <div style={{ padding:"0 0 4px" }}>
          <FamilyFeedClient
            currentUserId={currentUserId}
            posts={feedPosts as any}
          />
        </div>
      )}

      {/* Pvt Feeds: trust-unit / private circle conversations */}
      {tab === "pvt-feeds" && (
        <div style={{ padding:"0 0 4px" }}>
          <PrivateFeedClient
            currentUserId={currentUserId}
            trustUnits={trustUnits as any}
            posts={privatePosts as any}
            members={privateMembers as any}
            bondPeers={bondPeers as any}
          />
        </div>
      )}

      {/* My Posts: user-created timeline */}
      {tab === "my-posts" && (
        <div style={{ padding:"16px 20px" }}>
          <MyPostsMount currentUserId={currentUserId} />
        </div>
      )}

      {/* Invites: invite activity */}
      {tab === "invites" && (
        <div style={{ padding:"18px 20px" }}>
          {invites.length === 0 ? (
            <div style={{ textAlign:"center", padding:"24px 0" }}>
              <Mail style={{ width:28, height:28, color:"#d6d3d1", margin:"0 auto 10px" }} />
              <p style={{ fontSize:14, color:"#a8a29e", margin:"0 0 14px" }}>No invites sent yet.</p>
              <Link href="/invite" style={{
                display:"inline-flex", alignItems:"center", gap:6,
                padding:"9px 16px", background:"#1c1917", color:"white",
                borderRadius:9, textDecoration:"none", fontSize:13, fontWeight:700,
              }}>
                <Mail style={{ width:13, height:13 }} /> Invite someone
              </Link>
            </div>
          ) : (
            <>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
                <div style={{ fontSize:13, fontWeight:700, color:"#1c1917" }}>
                  Invite Activity
                  {pendingCount > 0 && (
                    <span style={{ marginLeft:8, fontSize:11, fontWeight:700, color:"#f59e0b", background:"#fef3c7", borderRadius:999, padding:"2px 7px" }}>
                      {pendingCount} pending
                    </span>
                  )}
                </div>
                <Link href="/invite" style={{ fontSize:12, color:"#6366f1", fontWeight:600, textDecoration:"none" }}>
                  + New invite
                </Link>
              </div>
              {invites.map((inv, i) => (
                <div key={inv.id} style={{
                  display:"flex", alignItems:"center", justifyContent:"space-between",
                  padding:"11px 0",
                  borderBottom: i < invites.length - 1 ? "1px solid #f5f4f0" : "none",
                }}>
                  <div>
                    <span style={{ fontSize:13, fontWeight:500, color:"#1c1917" }}>{inv.recipientEmail}</span>
                    <span style={{ fontSize:11, color:"#a8a29e", marginLeft:10 }}>
                      {new Date(inv.createdAt).toLocaleDateString("en-US", { month:"short", day:"numeric" })}
                    </span>
                  </div>
                  <span style={{
                    display:"inline-flex", alignItems:"center",
                    padding:"3px 10px", borderRadius:999, fontSize:11, fontWeight:600,
                    color: STATUS_COLOR[inv.status] ?? "#78716c",
                    background: STATUS_BG[inv.status] ?? "#f5f5f4",
                  }}>
                    {inv.status.charAt(0) + inv.status.slice(1).toLowerCase()}
                  </span>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* Family Safe: route into the governed app */}
      {tab === "family-safe" && (
        <div style={{ padding:"18px 20px" }}>
          <div style={{ fontSize:15, fontWeight:700, color:"#1c1917", marginBottom:4 }}>Family Safe</div>
          <div style={{ fontSize:13, color:"#78716c", marginBottom:18 }}>
            Your private family governance network — controlled circles, trusted spaces, and guardian oversight.
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:20 }}>
            {[
              "Private circles and trusted spaces",
              "Guardian approvals and oversight tools",
              "Controlled membership and visibility",
            ].map(text => (
              <div key={text} style={{ display:"flex", alignItems:"center", gap:8 }}>
                <CheckCircle style={{ width:14, height:14, color:"#10b981", flexShrink:0 }} />
                <span style={{ fontSize:13, color:"#44403c" }}>{text}</span>
              </div>
            ))}
          </div>
          <Link href="/aihsafe" style={{
            display:"inline-flex", alignItems:"center", gap:8,
            padding:"10px 18px",
            background:"linear-gradient(135deg,#0f3460,#16213e)",
            color:"white", borderRadius:10, textDecoration:"none",
            fontSize:13, fontWeight:700,
          }}>
            <ShieldCheck style={{ width:14, height:14 }} />
            Open Family Safe →
          </Link>
        </div>
      )}

    </div>
  );
}
