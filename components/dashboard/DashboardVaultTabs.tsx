"use client";

import { useState } from "react";
import Link from "next/link";
import { MessageSquare, Rss, User, Mail, ShieldCheck } from "lucide-react";

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
      <div style={{ padding:"18px 20px", minHeight:200 }}>

        {tab === "messages" && (
          <div>
            <p style={{ fontSize:14, color: vaultNewCount > 0 ? "#1c1917" : "#78716c", marginTop:0, fontWeight: vaultNewCount > 0 ? 500 : 400 }}>
              {vaultNewCount > 0
                ? `${vaultNewCount} new message${vaultNewCount !== 1 ? "s" : ""} since your last visit.`
                : "All caught up · no new messages."}
            </p>
            <div style={{ display:"flex", flexDirection:"column", gap:8, marginTop:12 }}>
              <Link href="/family-vault/posts" style={{
                display:"flex", alignItems:"center", gap:10, padding:"11px 14px",
                background:"#f8f8f7", borderRadius:10, textDecoration:"none",
                border:"1px solid #ece9e3",
              }}>
                <MessageSquare style={{ width:16, height:16, color:"#6366f1", flexShrink:0 }} />
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:"#1c1917" }}>Open Feed</div>
                  <div style={{ fontSize:11, color:"#a8a29e" }}>Family-wide posts</div>
                </div>
                {newPostsCount > 0 && (
                  <span style={{ background:"#6366f1", color:"white", borderRadius:999, fontSize:10, fontWeight:800, padding:"1px 6px" }}>
                    {newPostsCount} new
                  </span>
                )}
                <span style={{ color:"#a8a29e", fontSize:14 }}>→</span>
              </Link>
              <Link href="/family-vault/private" style={{
                display:"flex", alignItems:"center", gap:10, padding:"11px 14px",
                background:"#f8f8f7", borderRadius:10, textDecoration:"none",
                border:"1px solid #ece9e3",
              }}>
                <MessageSquare style={{ width:16, height:16, color:"#7c3aed", flexShrink:0 }} />
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:"#1c1917" }}>Private Feed</div>
                  <div style={{ fontSize:11, color:"#a8a29e" }}>Trust unit conversations</div>
                </div>
                {newCommentsCount > 0 && (
                  <span style={{ background:"#7c3aed", color:"white", borderRadius:999, fontSize:10, fontWeight:800, padding:"1px 6px" }}>
                    {newCommentsCount} new
                  </span>
                )}
                <span style={{ color:"#a8a29e", fontSize:14 }}>→</span>
              </Link>
            </div>
          </div>
        )}

        {tab === "feed" && (
          <div>
            <p style={{ fontSize:14, color: newPostsCount > 0 ? "#1c1917" : "#78716c", marginTop:0, fontWeight: newPostsCount > 0 ? 500 : 400 }}>
              {newPostsCount > 0
                ? `${newPostsCount} new post${newPostsCount !== 1 ? "s" : ""} since your last visit.`
                : "No new posts since your last visit."}
            </p>
            <Link href="/family-vault/posts" style={{
              display:"inline-flex", alignItems:"center", gap:8, marginTop:8,
              padding:"9px 16px", background:"#6366f1", color:"white",
              borderRadius:10, textDecoration:"none", fontSize:13, fontWeight:600,
            }}>
              <Rss style={{ width:14, height:14 }} />
              Open Feed →
            </Link>
          </div>
        )}

        {tab === "posts" && (
          <div>
            <p style={{ fontSize:14, color:"#78716c", marginTop:0 }}>Your posts, photos, and timeline updates.</p>
            <Link href="/profile" style={{
              display:"inline-flex", alignItems:"center", gap:8, marginTop:8,
              padding:"9px 16px", background:"#1c1917", color:"white",
              borderRadius:10, textDecoration:"none", fontSize:13, fontWeight:600,
            }}>
              <User style={{ width:14, height:14 }} />
              View My Posts →
            </Link>
          </div>
        )}

        {tab === "invites" && (
          <div>
            {invites.length === 0 ? (
              <div style={{ textAlign:"center", padding:"20px 0" }}>
                <p style={{ fontSize:14, color:"#a8a29e", margin:"0 0 12px" }}>No invites sent yet.</p>
                <Link href="/invite" style={{
                  display:"inline-flex", alignItems:"center", gap:6,
                  padding:"8px 14px", background:"#1c1917", color:"white",
                  borderRadius:9, textDecoration:"none", fontSize:13, fontWeight:600,
                }}>
                  <Mail style={{ width:13, height:13 }} /> Invite someone
                </Link>
              </div>
            ) : (
              <>
                <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:12 }}>
                  <Link href="/invite" style={{ fontSize:12, color:"#6366f1", fontWeight:600, textDecoration:"none" }}>
                    View all →
                  </Link>
                </div>
                {invites.map((inv, i) => (
                  <div key={inv.id} style={{
                    display:"flex", alignItems:"center", justifyContent:"space-between",
                    padding:"11px 0",
                    borderBottom: i < invites.length - 1 ? "1px solid #f5f4f0" : "none",
                  }}>
                    <div>
                      <span style={{ fontSize:14, fontWeight:500, color:"#1c1917" }}>{inv.recipientEmail}</span>
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

        {tab === "family-safe" && (
          <div>
            <p style={{ fontSize:14, color:"#78716c", marginTop:0 }}>
              Your private family circles, trusted spaces, and guardian tools.
            </p>
            <Link href="/aihsafe" style={{
              display:"inline-flex", alignItems:"center", gap:8, marginTop:8,
              padding:"9px 16px",
              background:"linear-gradient(135deg,#0f3460,#16213e)",
              color:"white", borderRadius:10, textDecoration:"none",
              fontSize:13, fontWeight:600,
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
