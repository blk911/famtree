"use client";

import { useState } from "react";
import Link from "next/link";
import { Users, Lock, User, Mail, ShieldCheck, CheckCircle } from "lucide-react";
import { DashboardPostComposer } from "@/components/dashboard/DashboardPostComposer";

type TabId = "posts" | "pvt-feeds" | "my-posts" | "invites" | "family-safe";

type ComposerSpace = { id: string; kind: "BUSINESS" | "CLUB" | "CHURCH"; name: string | null };

interface SerializedInvite {
  id:             string;
  recipientEmail: string;
  status:         string;
  createdAt:      string;
}

type PostPreview = {
  id:       string;
  body:     string;
  createdAt: string;
  scopeLabel: string;
  author:   { firstName: string; lastName: string; photoUrl: string | null };
};

type MyPostPreview = {
  id:       string;
  body:     string;
  createdAt: string;
  _count:   { likes: number; comments: number };
};

interface Props {
  newPostsCount:    number;
  newCommentsCount: number;
  invites:          SerializedInvite[];
  feedPreviews:     PostPreview[];
  myPostPreviews:   MyPostPreview[];
  composerSpaces:   ComposerSpace[];
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
  feedPreviews,
  myPostPreviews,
  composerSpaces,
}: Props) {
  const [tab, setTab] = useState<TabId>("posts");
  const pendingCount = invites.filter(i => i.status === "PENDING").length;

  const TABS: { id: TabId; label: string; Icon: React.ElementType; badge?: number }[] = [
    { id:"posts",       label:"Posts",      Icon:Users,      badge:newPostsCount > 0 ? newPostsCount : undefined },
    { id:"pvt-feeds",   label:"Pvt Feeds",  Icon:Lock,       badge:newCommentsCount > 0 ? newCommentsCount : undefined },
    { id:"my-posts",    label:"My Posts",   Icon:User },
    { id:"invites",     label:"Invites",    Icon:Mail,       badge:pendingCount > 0 ? pendingCount : undefined },
    { id:"family-safe", label:"Family Safe",Icon:ShieldCheck },
  ];

  return (
    <div style={{
      background:"#fff", borderRadius:16, border:"1px solid #ece9e3",
      boxShadow:"0 1px 4px rgba(0,0,0,0.05)", overflow:"hidden",
    }}>
      {/* Tab bar — segmented pill control */}
      <div
        role="tablist"
        style={{
          display:"flex", gap:3, padding:"10px 12px 0",
          overflowX:"auto", scrollbarWidth:"none",
          WebkitOverflowScrolling:"touch" as any,
          borderBottom:"1px solid #f5f4f0",
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
                padding:"7px 12px 9px", flexShrink:0,
                background:"none", border:"none",
                borderBottom: active ? "2px solid #6366f1" : "2px solid transparent",
                color: active ? "#1c1917" : "#78716c",
                fontWeight: active ? 650 : 500,
                fontSize:13, cursor:"pointer", whiteSpace:"nowrap",
                transition:"color 0.12s, border-color 0.12s",
              }}
            >
              <Icon style={{ width:14, height:14, flexShrink:0 }} />
              {label}
              {badge !== undefined && (
                <span style={{
                  display:"inline-flex", alignItems:"center", justifyContent:"center",
                  background:"#ef4444", color:"white", borderRadius:999,
                  fontSize:10, fontWeight:700, minWidth:16, height:16,
                  padding:"0 4px", lineHeight:1,
                }}>
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Panels */}
      <div style={{ padding:"20px", minHeight:220 }}>

        {/* ── Posts: family-wide social stream ── */}
        {tab === "posts" && (
          <div>
            <DashboardPostComposer composerSpaces={composerSpaces} />

            {newPostsCount > 0 ? (
              <div style={{
                display:"flex", alignItems:"center", gap:10,
                padding:"10px 14px", borderRadius:10, marginBottom:14,
                background:"#fffbeb", border:"1px solid #fde68a",
              }}>
                <span style={{ fontSize:16, flexShrink:0 }}>🔥</span>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:"#92400e" }}>
                    {newPostsCount} new post{newPostsCount !== 1 ? "s" : ""} from your family
                  </div>
                  <div style={{ fontSize:11, color:"#b45309", marginTop:1 }}>New activity since your last visit</div>
                </div>
              </div>
            ) : (
              <div style={{
                display:"flex", alignItems:"center", gap:10,
                padding:"10px 14px", borderRadius:10, marginBottom:14,
                background:"#f0fdf4", border:"1px solid #bbf7d0",
              }}>
                <span style={{ fontSize:16, flexShrink:0 }}>✓</span>
                <div style={{ fontSize:12, color:"#166534", fontWeight:500 }}>
                  You&apos;re caught up — no new posts since your last visit
                </div>
              </div>
            )}

            {feedPreviews.length > 0 && (
              <div style={{ marginBottom:14 }}>
                {feedPreviews.map((p, i) => {
                  const initials = `${p.author.firstName[0] ?? ""}${p.author.lastName[0] ?? ""}`.toUpperCase();
                  const snippet  = p.body.length > 88 ? p.body.slice(0, 88) + "…" : p.body;
                  const date     = new Date(p.createdAt).toLocaleDateString("en-US", { month:"short", day:"numeric" });
                  return (
                    <div key={p.id} style={{
                      display:"flex", alignItems:"flex-start", gap:9, padding:"9px 0",
                      borderBottom: i < feedPreviews.length - 1 ? "1px solid #f5f4f0" : "none",
                    }}>
                      <div style={{
                        width:28, height:28, borderRadius:"50%", flexShrink:0,
                        background:"#e0e7ff", display:"flex", alignItems:"center",
                        justifyContent:"center", fontSize:10, fontWeight:700, color:"#4f46e5",
                        overflow:"hidden",
                      }}>
                        {p.author.photoUrl
                          ? <img src={p.author.photoUrl} alt="" style={{ width:28, height:28, objectFit:"cover" }} />
                          : initials}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <span style={{ fontSize:12, fontWeight:600, color:"#1c1917" }}>
                          {p.author.firstName} {p.author.lastName}
                        </span>
                        <span style={{ fontSize:11, color:"#a8a29e", marginLeft:6 }}>{date}</span>
                        <div style={{ fontSize:12, color:"#57534e", lineHeight:1.4, marginTop:2 }}>{snippet}</div>
                        <div style={{ fontSize:10, fontWeight:700, color:"#6366f1", marginTop:4, letterSpacing:"0.02em" }}>
                          {p.scopeLabel}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <Link href="/family-vault/posts" style={{
              display:"flex", alignItems:"center", justifyContent:"center", gap:7,
              padding:"10px 16px",
              background:"linear-gradient(135deg,#4f46e5,#6366f1)",
              color:"white", borderRadius:10, textDecoration:"none",
              fontSize:13, fontWeight:700, width:"100%", boxSizing:"border-box",
            }}>
              <Users style={{ width:14, height:14 }} />
              View family feed →
            </Link>
          </div>
        )}

        {/* ── Pvt Feeds: private circles and trust unit conversations ── */}
        {tab === "pvt-feeds" && (
          <div>
            {newCommentsCount > 0 ? (
              <div style={{
                display:"flex", alignItems:"center", gap:10,
                padding:"12px 15px", borderRadius:12, marginBottom:18,
                background:"#faf5ff", border:"1px solid #e9d5ff",
              }}>
                <span style={{ fontSize:18, flexShrink:0 }}>💬</span>
                <div>
                  <div style={{ fontSize:14, fontWeight:700, color:"#5b21b6" }}>
                    {newCommentsCount} new conversation{newCommentsCount !== 1 ? "s" : ""} in your circles
                  </div>
                  <div style={{ fontSize:12, color:"#7c3aed", marginTop:1 }}>
                    Activity in your private spaces
                  </div>
                </div>
              </div>
            ) : (
              <div style={{
                display:"flex", alignItems:"center", gap:10,
                padding:"12px 15px", borderRadius:12, marginBottom:18,
                background:"#f5f3ff", border:"1px solid #ddd6fe",
              }}>
                <span style={{ fontSize:18, flexShrink:0 }}>🔒</span>
                <div style={{ fontSize:13, color:"#5b21b6", fontWeight:500 }}>
                  Your private circles — quiet for now
                </div>
              </div>
            )}

            <Link href="/family-vault/private" style={{
              display:"flex", alignItems:"center", justifyContent:"center", gap:8,
              padding:"13px 20px", marginBottom:10,
              background:"linear-gradient(135deg,#5b21b6,#7c3aed)",
              color:"white", borderRadius:12, textDecoration:"none",
              fontSize:14, fontWeight:700, width:"100%", boxSizing:"border-box",
            }}>
              <Lock style={{ width:16, height:16 }} />
              Open private feeds →
            </Link>

            <div style={{
              fontSize:12, color:"#78716c", textAlign:"center", marginTop:8, lineHeight:1.5,
            }}>
              Trust units · family circles · governed pods
            </div>
          </div>
        )}

        {/* ── My Posts: user-created content ── */}
        {tab === "my-posts" && (
          <div>
            {myPostPreviews.length > 0 ? (
              <>
                <div style={{ marginBottom:14 }}>
                  {myPostPreviews.map((p, i) => {
                    const snippet = p.body.length > 80 ? p.body.slice(0, 80) + "…" : p.body;
                    const date    = new Date(p.createdAt).toLocaleDateString("en-US", { month:"short", day:"numeric" });
                    return (
                      <div key={p.id} style={{
                        display:"flex", alignItems:"center", justifyContent:"space-between",
                        padding:"9px 0",
                        borderBottom: i < myPostPreviews.length - 1 ? "1px solid #f5f4f0" : "none",
                        gap:8,
                      }}>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:12, color:"#44403c", lineHeight:1.4 }}>{snippet}</div>
                          <div style={{ fontSize:11, color:"#a8a29e", marginTop:2 }}>{date}</div>
                        </div>
                        {(p._count.likes > 0 || p._count.comments > 0) && (
                          <div style={{ fontSize:11, color:"#78716c", flexShrink:0, display:"flex", gap:6 }}>
                            {p._count.likes > 0 && <span>❤️ {p._count.likes}</span>}
                            {p._count.comments > 0 && <span>💬 {p._count.comments}</span>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <Link href="/family-vault/posts" style={{ fontSize:12, color:"#6366f1", fontWeight:600, textDecoration:"none" }}>
                    View all posts →
                  </Link>
                  <Link href="/family-vault/posts" style={{ fontSize:12, color:"#6366f1", fontWeight:600, textDecoration:"none" }}>
                    ✏️ New post
                  </Link>
                </div>
              </>
            ) : (
              <div style={{ textAlign:"center", padding:"20px 0" }}>
                <div style={{ fontSize:14, fontWeight:700, color:"#1c1917", marginBottom:4 }}>My Timeline</div>
                <div style={{ fontSize:13, color:"#78716c", marginBottom:16 }}>
                  Posts, photos, and updates you&apos;ve shared with your family.
                </div>
                <Link href="/family-vault/posts" style={{
                  display:"inline-flex", alignItems:"center", gap:8,
                  padding:"10px 18px", background:"#1c1917", color:"white",
                  borderRadius:10, textDecoration:"none", fontSize:13, fontWeight:700,
                }}>
                  <User style={{ width:14, height:14 }} />
                  Write your first post
                </Link>
              </div>
            )}
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
