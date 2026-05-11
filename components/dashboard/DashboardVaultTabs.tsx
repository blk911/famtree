"use client";

import { useState } from "react";
import Link from "next/link";
import { MessageSquare, Lock, Rss, User, Mail, ShieldCheck, CheckCircle } from "lucide-react";

type TabId = "messages" | "feed" | "posts" | "invites" | "family-safe";

interface SerializedInvite {
  id:             string;
  recipientEmail: string;
  status:         string;
  createdAt:      string;
}

interface Props {
  vaultNewCount:    number;
  newPostsCount:    number;
  newCommentsCount: number;
  invites:          SerializedInvite[];
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
  vaultNewCount,
  newPostsCount,
  newCommentsCount,
  invites,
}: Props) {
  const [tab, setTab] = useState<TabId>("messages");
  const pendingCount = invites.filter(i => i.status === "PENDING").length;

  const TABS: { id: TabId; label: string; Icon: React.ElementType; badge?: number }[] = [
    { id:"messages",    label:"Messages",    Icon:MessageSquare, badge:vaultNewCount > 0 ? vaultNewCount : undefined },
    { id:"feed",        label:"Feed",        Icon:Rss,           badge:newPostsCount > 0 ? newPostsCount : undefined },
    { id:"posts",       label:"My Posts",    Icon:User },
    { id:"invites",     label:"Invites",     Icon:Mail,          badge:pendingCount > 0 ? pendingCount : undefined },
    { id:"family-safe", label:"Family Safe", Icon:ShieldCheck },
  ];

  return (
    <div style={{
      background:"#fff", borderRadius:16, border:"1px solid #ece9e3",
      boxShadow:"0 1px 4px rgba(0,0,0,0.05)", overflow:"hidden",
    }}>
      {/* Tab bar */}
      <div
        role="tablist"
        style={{ display:"flex", borderBottom:"1px solid #f5f4f0", overflowX:"auto", scrollbarWidth:"none" }}
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

      {/* Panels */}
      <div style={{ padding:"18px 20px", minHeight:220 }}>

        {/* ── Messages: global inbox / all conversations ── */}
        {tab === "messages" && (
          <div>
            <div style={{ display:"flex", alignItems:"baseline", justifyContent:"space-between", marginBottom:14 }}>
              <div>
                <div style={{ fontSize:15, fontWeight:700, color:"#1c1917" }}>Your Conversations</div>
                <div style={{ fontSize:12, color:"#a8a29e", marginTop:2 }}>
                  {vaultNewCount > 0
                    ? `${vaultNewCount} new item${vaultNewCount !== 1 ? "s" : ""} since your last visit`
                    : "All caught up — no new activity"}
                </div>
              </div>
            </div>

            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {/* Open Feed stream */}
              <Link href="/family-vault/posts" style={{
                display:"flex", alignItems:"center", gap:12, padding:"13px 15px",
                background: newPostsCount > 0 ? "#f0f7ff" : "#f8f8f7",
                borderRadius:12, textDecoration:"none",
                border: newPostsCount > 0 ? "1px solid #bfdbfe" : "1px solid #ece9e3",
              }}>
                <div style={{
                  width:36, height:36, borderRadius:10, flexShrink:0,
                  background: newPostsCount > 0 ? "#6366f1" : "#e7e5e4",
                  display:"flex", alignItems:"center", justifyContent:"center",
                }}>
                  <MessageSquare style={{ width:16, height:16, color: newPostsCount > 0 ? "white" : "#a8a29e" }} />
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:"#1c1917" }}>Open Feed</div>
                  <div style={{ fontSize:11, color:"#78716c", marginTop:1 }}>Family-wide posts and updates</div>
                </div>
                {newPostsCount > 0 && (
                  <span style={{
                    background:"#6366f1", color:"white", borderRadius:999,
                    fontSize:10, fontWeight:800, padding:"2px 8px", flexShrink:0,
                  }}>
                    {newPostsCount} new
                  </span>
                )}
                <span style={{ color:"#a8a29e", fontSize:16, flexShrink:0 }}>→</span>
              </Link>

              {/* Private Feed stream */}
              <Link href="/family-vault/private" style={{
                display:"flex", alignItems:"center", gap:12, padding:"13px 15px",
                background: newCommentsCount > 0 ? "#faf5ff" : "#f8f8f7",
                borderRadius:12, textDecoration:"none",
                border: newCommentsCount > 0 ? "1px solid #e9d5ff" : "1px solid #ece9e3",
              }}>
                <div style={{
                  width:36, height:36, borderRadius:10, flexShrink:0,
                  background: newCommentsCount > 0 ? "#7c3aed" : "#e7e5e4",
                  display:"flex", alignItems:"center", justifyContent:"center",
                }}>
                  <Lock style={{ width:16, height:16, color: newCommentsCount > 0 ? "white" : "#a8a29e" }} />
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:"#1c1917" }}>Private Feed</div>
                  <div style={{ fontSize:11, color:"#78716c", marginTop:1 }}>Trust unit conversations</div>
                </div>
                {newCommentsCount > 0 && (
                  <span style={{
                    background:"#7c3aed", color:"white", borderRadius:999,
                    fontSize:10, fontWeight:800, padding:"2px 8px", flexShrink:0,
                  }}>
                    {newCommentsCount} new
                  </span>
                )}
                <span style={{ color:"#a8a29e", fontSize:16, flexShrink:0 }}>→</span>
              </Link>
            </div>
          </div>
        )}

        {/* ── Feed: family-wide posts ── */}
        {tab === "feed" && (
          <div>
            <div style={{ fontSize:15, fontWeight:700, color:"#1c1917", marginBottom:4 }}>Family Feed</div>
            <div style={{ fontSize:13, color:"#78716c", marginBottom:16 }}>
              Posts and updates shared across your family network.
            </div>

            {newPostsCount > 0 && (
              <div style={{
                display:"flex", alignItems:"center", gap:8, padding:"10px 14px",
                background:"#eff6ff", borderRadius:10, border:"1px solid #bfdbfe",
                marginBottom:14,
              }}>
                <span style={{
                  width:8, height:8, borderRadius:"50%", background:"#3b82f6", flexShrink:0,
                  display:"inline-block",
                }} />
                <span style={{ fontSize:13, fontWeight:600, color:"#1d4ed8" }}>
                  {newPostsCount} new post{newPostsCount !== 1 ? "s" : ""} since your last visit
                </span>
              </div>
            )}

            <Link href="/family-vault/posts" style={{
              display:"inline-flex", alignItems:"center", gap:8,
              padding:"10px 18px", background:"#6366f1", color:"white",
              borderRadius:10, textDecoration:"none", fontSize:13, fontWeight:700,
            }}>
              <Rss style={{ width:14, height:14 }} />
              Open Family Feed →
            </Link>
          </div>
        )}

        {/* ── My Posts: user-created content ── */}
        {tab === "posts" && (
          <div>
            <div style={{ fontSize:15, fontWeight:700, color:"#1c1917", marginBottom:4 }}>My Timeline</div>
            <div style={{ fontSize:13, color:"#78716c", marginBottom:16 }}>
              Posts, photos, and updates you&apos;ve shared with your family.
            </div>
            <Link href="/profile" style={{
              display:"inline-flex", alignItems:"center", gap:8,
              padding:"10px 18px", background:"#1c1917", color:"white",
              borderRadius:10, textDecoration:"none", fontSize:13, fontWeight:700,
            }}>
              <User style={{ width:14, height:14 }} />
              View My Posts →
            </Link>
          </div>
        )}

        {/* ── Invites: invite activity ── */}
        {tab === "invites" && (
          <div>
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
                      padding:"3px 10px", borderRadius:999,
                      fontSize:11, fontWeight:600,
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

        {/* ── Family Safe: governed family activity ── */}
        {tab === "family-safe" && (
          <div>
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
    </div>
  );
}
