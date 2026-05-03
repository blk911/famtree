"use client";

import { useEffect, useState } from "react";
import { Ban, Mail, Send, CheckCircle, Trash2 } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Member = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  status: string;
  relationship: string | null;
  invitedById: string | null;
  createdAt: Date | string;
};

const RELATIONSHIP_META: Record<string, { label: string; bg: string; color: string }> = {
  parent:  { label:"Parent",  bg:"#f5f3ff", color:"#7c3aed" },
  child:   { label:"Child",   bg:"#f5f3ff", color:"#7c3aed" },
  sibling: { label:"Sibling", bg:"#ecfeff", color:"#0891b2" },
  spouse:  { label:"Spouse",  bg:"#fdf2f8", color:"#be185d" },
  so:      { label:"S.O.",    bg:"#fdf2f8", color:"#be185d" },
  bf:      { label:"BF",      bg:"#fdf2f8", color:"#be185d" },
  gf:      { label:"GF",      bg:"#fdf2f8", color:"#be185d" },
  other:   { label:"Other",   bg:"#f5f4f0", color:"#78716c" },
};

function RelBadge({ value }: { value: string | null }) {
  if (!value) return null;
  const meta = RELATIONSHIP_META[value];
  if (!meta) return null;
  return (
    <span style={{
      background:meta.bg, color:meta.color,
      fontSize:"10px", fontWeight:700,
      padding:"2px 7px", borderRadius:"999px",
      border:`1px solid ${meta.color}33`,
      whiteSpace:"nowrap" as const,
      letterSpacing:"0.02em",
    }}>
      {meta.label}
    </span>
  );
}

type Invite = {
  id: string;
  recipientEmail: string;
  status: string; // PENDING | ACCEPTED | EXPIRED | CANCELLED
  createdAt: Date | string;
  expiresAt: Date | string;
  acceptedAt: Date | string | null;
  sender: { id: string; firstName: string; lastName: string };
};

type WaitlistPerson = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  createdAt: Date | string;
};

type Props = {
  members: Member[];
  invites: Invite[];
  waitlist: WaitlistPerson[];
};

// ─── Shared styles ────────────────────────────────────────────────────────────

const card = {
  background:"white", borderRadius:"16px",
  border:"1px solid #ece9e3", overflow:"hidden",
  boxShadow:"0 1px 4px rgba(0,0,0,0.05)",
};

const nameStyle = {
  minWidth:"130px", fontWeight:700, color:"#1c1917",
  fontSize:"14px", whiteSpace:"nowrap" as const,
};

const emailStyle = {
  flex:1, color:"#78716c", fontSize:"13px",
  overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" as const,
};

const metaStyle = {
  fontSize:"12px", color:"#a8a29e", whiteSpace:"nowrap" as const,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function shortDate(value: Date | string) {
  return new Date(value).toLocaleDateString("en-US", { month:"short", day:"numeric" });
}

function fullDate(value: Date | string) {
  return new Date(value).toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" });
}

function initials(firstName: string, lastName: string) {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
}

// ─── Status badges ────────────────────────────────────────────────────────────

const MEMBER_STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  active:    { bg:"#dcfce7", color:"#166534" },
  suspended: { bg:"#fef9c3", color:"#854d0e" },
  archived:  { bg:"#f1f5f9", color:"#475569" },
  blocked:   { bg:"#fee2e2", color:"#991b1b" },
};

const INVITE_STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  PENDING:   { bg:"#fef9c3", color:"#854d0e" },
  ACCEPTED:  { bg:"#dcfce7", color:"#166534" },
  EXPIRED:   { bg:"#f1f5f9", color:"#475569" },
  CANCELLED: { bg:"#fee2e2", color:"#991b1b" },
};

function StatusBadge({ label, colors }: { label: string; colors: { bg: string; color: string } }) {
  return (
    <span style={{
      background:colors.bg, color:colors.color,
      fontSize:"11px", fontWeight:700, padding:"2px 8px",
      borderRadius:"999px", whiteSpace:"nowrap" as const,
      textTransform:"uppercase" as const, letterSpacing:"0.03em",
    }}>
      {label}
    </span>
  );
}

// ─── Admin action buttons ─────────────────────────────────────────────────────

const ACTION_BTN: Record<string, { label: string; bg: string; color: string; title?: string }> = {
  suspend:  { label:"Suspend",  bg:"#fef9c3", color:"#854d0e", title:"SITE-WIDE (admin only): blocks sign-in for this account everywhere" },
  archive:  { label:"Archive (legal hold)",  bg:"#f1f5f9", color:"#475569", title:"SITE-WIDE (admin only): retains audit data; user cannot sign in anywhere" },
  activate: { label:"Activate", bg:"#dcfce7", color:"#166534", title:"SITE-WIDE (admin): restore this account to active" },
};

type ActionKey = keyof typeof ACTION_BTN;

function actionForStatus(current: string): ActionKey[] {
  if (current === "active")    return ["suspend", "archive", "block"];
  if (current === "suspended") return ["activate", "archive", "block"];
  if (current === "archived")  return ["activate", "block"];
  if (current === "blocked")   return ["activate"];
  return [];
}

function statusForAction(action: ActionKey): string {
  if (action === "suspend")  return "suspended";
  if (action === "archive")  return "archived";
  if (action === "block")    return "blocked";
  return "active";
}

// ─── InfoRow helper for modals ────────────────────────────────────────────────

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:"16px",fontSize:"14px"}}>
      <span style={{color:"#78716c",fontWeight:600}}>{label}</span>
      <span style={{color:"#1c1917",fontWeight:600,textAlign:"right",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{children}</span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AdminLists({ members: initialMembers, invites: initialInvites, waitlist }: Props) {
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [invites, setInvites] = useState<Invite[]>(initialInvites);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [selectedWaitlist, setSelectedWaitlist] = useState<WaitlistPerson | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null); // memberId
  const [inviteActioning, setInviteActioning] = useState<string | null>(null); // inviteId

  // Message compose state
  const [messagingMember, setMessagingMember] = useState<Member | null>(null);
  const [messageBody, setMessageBody] = useState("");
  const [messageSending, setMessageSending] = useState(false);
  const [messageSent, setMessageSent] = useState(false);

  // Link-parent state
  const [linkingMember, setLinkingMember] = useState<Member | null>(null);
  const [linkParentId, setLinkParentId] = useState("");
  const [linkSaving, setLinkSaving] = useState(false);

  // close modals on Escape
  useEffect(() => {
    if (!selectedMember && !selectedWaitlist && !messagingMember) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedMember(null);
        setSelectedWaitlist(null);
        setMessagingMember(null);
        setMessageBody("");
        setMessageSent(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedMember, selectedWaitlist, messagingMember]);

  const openMessageModal = (member: Member, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedMember(null);
    setMessageBody("");
    setMessageSent(false);
    setMessagingMember(member);
  };

  const handleSendMessage = async () => {
    if (!messagingMember || !messageBody.trim() || messageSending) return;
    setMessageSending(true);
    try {
      const res = await fetch("/api/admin/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId: messagingMember.id, body: messageBody.trim() }),
      });
      if (res.ok) {
        setMessageSent(true);
        setMessageBody("");
        setTimeout(() => {
          setMessagingMember(null);
          setMessageSent(false);
        }, 2200);
      }
    } finally {
      setMessageSending(false);
    }
  };

  // ─── Handle link-parent ──────────────────────────────────────────────────────

  const handleLinkParent = async () => {
    if (!linkingMember || !linkParentId || linkSaving) return;
    setLinkSaving(true);
    try {
      const res = await fetch("/api/admin/link-parent", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: linkingMember.id, parentId: linkParentId }),
      });
      if (res.ok) {
        setMembers((prev) =>
          prev.map((m) => m.id === linkingMember.id ? { ...m, invitedById: linkParentId } : m)
        );
        setLinkingMember(null);
        setLinkParentId("");
      }
    } finally {
      setLinkSaving(false);
    }
  };

  // ─── Handle invite cancel (pending) / delete (any status) ──────────────────

  const handleInviteCancel = async (inviteId: string) => {
    setInviteActioning(inviteId);
    try {
      const res = await fetch(`/api/invite/manage/${inviteId}`, { method: "PATCH" });
      if (res.ok) setInvites((prev) => prev.filter((inv) => inv.id !== inviteId));
    } finally {
      setInviteActioning(null);
    }
  };

  const handleInviteDelete = async (inviteId: string) => {
    setInviteActioning(inviteId);
    try {
      const res = await fetch(`/api/invite/manage/${inviteId}`, { method: "DELETE" });
      if (res.ok) setInvites((prev) => prev.filter((inv) => inv.id !== inviteId));
    } finally {
      setInviteActioning(null);
    }
  };

  // ─── Handle member status action ────────────────────────────────────────────

  const handleAction = async (member: Member, action: ActionKey, e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = statusForAction(action);
    setActionLoading(member.id);
    try {
      const res = await fetch("/api/admin/members", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: member.id, status: newStatus }),
      });
      if (res.ok) {
        setMembers((prev) =>
          prev.map((m) => m.id === member.id ? { ...m, status: newStatus } : m)
        );
        if (selectedMember?.id === member.id) {
          setSelectedMember((prev) => prev ? { ...prev, status: newStatus } : null);
        }
      }
    } finally {
      setActionLoading(null);
    }
  };

  // ─── Invite status counts ────────────────────────────────────────────────────

  const pendingCount = invites.filter((i) => i.status === "PENDING").length;

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        .al-row:hover { background:#fafaf9; }
        .al-action-btn:hover { filter: brightness(0.93); }
      `}</style>

      <div style={{display:"flex",flexDirection:"column",gap:"18px",width:"100%"}}>

        {/* ── MEMBERS ─────────────────────────────────────────────────────────── */}
        <section style={card}>
          <div style={{padding:"12px 20px",borderBottom:"1px solid #f5f4f0",display:"flex",alignItems:"center",gap:"10px"}}>
            <h2 style={{fontSize:"15px",fontWeight:800,color:"#1c1917",flex:1}}>Members</h2>
            <span style={{fontSize:"12px",color:"#a8a29e"}}>{members.length} shown</span>
          </div>

          {members.length === 0 ? (
            <div style={{padding:"24px",fontSize:"14px",color:"#a8a29e",textAlign:"center"}}>No members yet.</div>
          ) : members.map((member, index) => {
            const statusColors = MEMBER_STATUS_COLORS[member.status] ?? MEMBER_STATUS_COLORS.active;
            const actions = actionForStatus(member.status);
            const isLast = index === members.length - 1;
            const loading = actionLoading === member.id;

            return (
              <div
                key={member.id}
                className="al-row"
                onClick={() => setSelectedMember(member)}
                style={{
                  display:"flex", alignItems:"center", gap:"12px",
                  padding:"10px 20px",
                  borderBottom: isLast ? "none" : "1px solid #f5f4f0",
                  cursor:"pointer", transition:"background 0.1s",
                  opacity: loading ? 0.6 : 1,
                }}
              >
                {/* Avatar */}
                <div style={{
                  width:"32px",height:"32px",borderRadius:"50%",flexShrink:0,
                  background:"#0f1729",display:"flex",alignItems:"center",justifyContent:"center",
                  color:"white",fontSize:"11px",fontWeight:700,
                }}>
                  {initials(member.firstName, member.lastName)}
                </div>

                {/* Name + relationship */}
                <div style={{ display:"flex", alignItems:"center", gap:"6px", minWidth:"130px" }}>
                  <span style={nameStyle}>{member.firstName} {member.lastName}</span>
                  <RelBadge value={member.relationship} />
                </div>

                {/* Email — hidden on mobile */}
                <div className="al-col-secondary" style={emailStyle}>{member.email}</div>

                {/* Role · Date — hidden on mobile */}
                <div className="al-col-secondary" style={metaStyle}>{member.role} · {shortDate(member.createdAt)}</div>

                {/* Status badge */}
                <StatusBadge label={member.status} colors={statusColors} />

                {/* Action buttons */}
                <div style={{display:"flex",gap:"4px",flexShrink:0}} onClick={(e) => e.stopPropagation()}>
                  {/* Mail icon */}
                  <button
                    title={`Message ${member.firstName}`}
                    onClick={(e) => openMessageModal(member, e)}
                    style={{
                      display:"flex", alignItems:"center", justifyContent:"center",
                      width:"26px", height:"26px", borderRadius:"6px",
                      background:"#eff6ff", color:"#1d4ed8",
                      border:"none", cursor:"pointer", flexShrink:0,
                      transition:"filter 0.1s",
                    }}
                  >
                    <Mail style={{width:"12px",height:"12px"}} />
                  </button>
                  {/* Link-parent icon — repair orphan tree placement */}
                  <button
                    title={member.invitedById ? "Re-link tree parent" : "Link to tree parent"}
                    onClick={(e) => { e.stopPropagation(); setLinkingMember(member); setLinkParentId(member.invitedById ?? ""); }}
                    style={{
                      display:"flex", alignItems:"center", justifyContent:"center",
                      width:"26px", height:"26px", borderRadius:"6px",
                      background: member.invitedById ? "#f0fdf4" : "#fff7ed",
                      color: member.invitedById ? "#16a34a" : "#c2410c",
                      border:"none", cursor:"pointer", flexShrink:0,
                      transition:"filter 0.1s",
                    }}
                  >
                    <Send style={{width:"11px",height:"11px"}} />
                  </button>
                  {actions.map((action) => {
                    const btn = ACTION_BTN[action];
                    return (
                      <button
                        key={action}
                        className="al-action-btn"
                        disabled={loading}
                        title={btn.title}
                        onClick={(e) => handleAction(member, action, e)}
                        style={{
                          background:btn.bg, color:btn.color,
                          border:"none", borderRadius:"6px",
                          fontSize:"11px", fontWeight:700,
                          padding:"3px 8px", cursor:"pointer",
                          transition:"filter 0.1s",
                        }}
                      >
                        {btn.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </section>

        {/* ── INVITES ─────────────────────────────────────────────────────────── */}
        <section style={card}>
          <div style={{padding:"12px 20px",borderBottom:"1px solid #f5f4f0",display:"flex",alignItems:"center",gap:"10px"}}>
            <h2 style={{fontSize:"15px",fontWeight:800,color:"#1c1917",flex:1}}>Invites</h2>
            {pendingCount > 0 && (
              <span style={{
                background:"#fef9c3",color:"#854d0e",
                fontSize:"11px",fontWeight:700,
                padding:"2px 9px",borderRadius:"999px",
              }}>
                {pendingCount} pending
              </span>
            )}
            <span style={{fontSize:"12px",color:"#a8a29e"}}>{invites.length} shown</span>
          </div>

          {invites.length === 0 ? (
            <div style={{padding:"24px",fontSize:"14px",color:"#a8a29e",textAlign:"center"}}>No invites sent yet.</div>
          ) : invites.map((invite, index) => {
            const statusColors = INVITE_STATUS_COLORS[invite.status] ?? INVITE_STATUS_COLORS.PENDING;
            const isLast = index === invites.length - 1;
            const isPending = invite.status === "PENDING";
            const loading = inviteActioning === invite.id;
            return (
              <div
                key={invite.id}
                style={{
                  display:"flex", alignItems:"center", gap:"12px",
                  padding:"10px 20px",
                  borderBottom: isLast ? "none" : "1px solid #f5f4f0",
                  opacity: loading ? 0.6 : 1,
                  transition:"opacity 0.15s",
                }}
              >
                {/* Recipient email */}
                <div style={{...emailStyle, minWidth:"170px", flex:"none", fontWeight:600, color:"#1c1917"}}>
                  {invite.recipientEmail}
                </div>

                {/* Sent by — hidden on mobile */}
                <div className="al-col-secondary" style={{...emailStyle, fontSize:"12px"}}>
                  sent by {invite.sender.firstName} {invite.sender.lastName}
                </div>

                {/* Date — hidden on mobile */}
                <div className="al-col-secondary" style={metaStyle}>{shortDate(invite.createdAt)}</div>

                {/* Status badge */}
                <StatusBadge label={invite.status} colors={statusColors} />

                {/* Cancel (pending) or Delete (accepted/expired) */}
                {isPending ? (
                  <button
                    disabled={loading}
                    onClick={() => handleInviteCancel(invite.id)}
                    style={{
                      display:"flex", alignItems:"center", gap:"4px",
                      background:"#fef2f2", color:"#dc2626",
                      border:"1px solid #fecaca", borderRadius:"6px",
                      fontSize:"11px", fontWeight:700,
                      padding:"3px 8px", cursor:"pointer", flexShrink:0,
                    }}
                  >
                    <Ban style={{width:"11px",height:"11px"}} />
                    {loading ? "…" : "Cancel"}
                  </button>
                ) : (
                  <button
                    disabled={loading}
                    onClick={() => handleInviteDelete(invite.id)}
                    style={{
                      display:"flex", alignItems:"center", gap:"4px",
                      background:"#f5f5f4", color:"#78716c",
                      border:"1px solid #e7e5e4", borderRadius:"6px",
                      fontSize:"11px", fontWeight:700,
                      padding:"3px 8px", cursor:"pointer", flexShrink:0,
                    }}
                  >
                    <Trash2 style={{width:"11px",height:"11px"}} />
                    {loading ? "…" : "Delete"}
                  </button>
                )}
              </div>
            );
          })}
        </section>

        {/* ── WAITLIST ─────────────────────────────────────────────────────────── */}
        <section style={card}>
          <div style={{padding:"12px 20px",borderBottom:"1px solid #f5f4f0"}}>
            <h2 style={{fontSize:"15px",fontWeight:800,color:"#1c1917"}}>Waitlist</h2>
          </div>
          {waitlist.length === 0 ? (
            <div style={{padding:"24px",fontSize:"14px",color:"#a8a29e",textAlign:"center"}}>
              No waitlist requests yet.
            </div>
          ) : waitlist.map((person, index) => (
            <div
              key={person.id}
              className="al-row"
              onClick={() => setSelectedWaitlist(person)}
              style={{
                display:"flex", alignItems:"center", gap:"12px",
                padding:"10px 20px",
                borderBottom: index === waitlist.length - 1 ? "none" : "1px solid #f5f4f0",
                cursor:"pointer", transition:"background 0.1s",
              }}
            >
              <div style={nameStyle}>{person.firstName} {person.lastName}</div>
              <div className="al-col-secondary" style={emailStyle}>{person.email}</div>
              <div className="al-col-secondary" style={metaStyle}>{person.phone ?? "—"} · {shortDate(person.createdAt)}</div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  window.location.href = `/invite?prefill=${encodeURIComponent(person.email)}`;
                }}
                style={{
                  background:"#0f1729", color:"white", border:"none",
                  borderRadius:"7px", fontSize:"11px", fontWeight:700,
                  padding:"4px 10px", cursor:"pointer", flexShrink:0,
                }}
              >
                Invite →
              </button>
            </div>
          ))}
        </section>

      </div>

      {/* ── Modal — member detail ──────────────────────────────────────────────── */}
      {selectedMember && (
        <div
          onClick={(e) => e.target === e.currentTarget && setSelectedMember(null)}
          style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:50,display:"flex",alignItems:"center",justifyContent:"center"}}
        >
          <div style={{position:"relative",background:"white",maxWidth:"420px",width:"90vw",borderRadius:"18px",padding:"32px",boxShadow:"0 24px 64px rgba(0,0,0,0.18)"}}>
            <button
              onClick={() => setSelectedMember(null)}
              style={{position:"absolute",top:"16px",right:"20px",border:"none",background:"transparent",fontSize:"20px",color:"#a8a29e",cursor:"pointer"}}
            >×</button>

            <div style={{width:"48px",height:"48px",borderRadius:"50%",background:"#0f1729",display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontWeight:700}}>
              {initials(selectedMember.firstName, selectedMember.lastName)}
            </div>
            <h2 style={{fontSize:"22px",fontWeight:800,color:"#1c1917",marginTop:"12px"}}>
              {selectedMember.firstName} {selectedMember.lastName}
            </h2>
            <p style={{fontSize:"14px",color:"#78716c",marginTop:"4px"}}>{selectedMember.email}</p>

            <div style={{height:"1px",background:"#f5f4f0",margin:"20px 0"}} />

            <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
              <InfoRow label="Role">
                <span style={{background:"#fff7ed",color:"#92400e",padding:"2px 10px",borderRadius:"999px",fontSize:"12px",fontWeight:700}}>
                  {selectedMember.role}
                </span>
              </InfoRow>
              <InfoRow label="Status">
                <StatusBadge
                  label={selectedMember.status}
                  colors={MEMBER_STATUS_COLORS[selectedMember.status] ?? MEMBER_STATUS_COLORS.active}
                />
              </InfoRow>
              {selectedMember.relationship && (
                <InfoRow label="Relationship">
                  <RelBadge value={selectedMember.relationship} />
                </InfoRow>
              )}
              <InfoRow label="Member since">{fullDate(selectedMember.createdAt)}</InfoRow>
              <InfoRow label="Email">{selectedMember.email}</InfoRow>
            </div>

            {/* Message button */}
            <div style={{height:"1px",background:"#f5f4f0",margin:"20px 0"}} />
            <button
              onClick={(e) => openMessageModal(selectedMember, e)}
              style={{
                width:"100%", height:"40px",
                display:"flex", alignItems:"center", justifyContent:"center", gap:"8px",
                background:"#eff6ff", color:"#1d4ed8",
                border:"1px solid #bfdbfe", borderRadius:"10px",
                fontSize:"13px", fontWeight:700, cursor:"pointer",
              }}
            >
              <Mail style={{width:"14px",height:"14px"}} />
              Send private message
            </button>

            {/* Status action buttons in modal */}
            {actionForStatus(selectedMember.status).length > 0 && (
              <>
                <div style={{height:"1px",background:"#f5f4f0",margin:"16px 0"}} />
                <div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>
                  {actionForStatus(selectedMember.status).map((action) => {
                    const btn = ACTION_BTN[action];
                    const loading = actionLoading === selectedMember.id;
                    return (
                      <button
                        key={action}
                        className="al-action-btn"
                        disabled={loading}
                        title={btn.title}
                        onClick={(e) => handleAction(selectedMember, action, e)}
                        style={{
                          flex:1, height:"38px",
                          background:btn.bg, color:btn.color,
                          border:`1px solid ${btn.color}22`,
                          borderRadius:"9px", fontSize:"13px", fontWeight:700,
                          cursor:"pointer", transition:"filter 0.1s",
                        }}
                      >
                        {loading ? "..." : btn.label}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Modal — link tree parent ─────────────────────────────────────────── */}
      {linkingMember && (
        <div
          onClick={(e) => e.target === e.currentTarget && (setLinkingMember(null), setLinkParentId(""))}
          style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:50,display:"flex",alignItems:"center",justifyContent:"center",padding:"16px"}}
        >
          <div style={{background:"white",borderRadius:"16px",padding:"24px",width:"100%",maxWidth:"400px",display:"flex",flexDirection:"column",gap:"16px"}}>
            <div>
              <h3 style={{fontSize:"15px",fontWeight:800,color:"#1c1917",margin:0}}>Link tree parent</h3>
              <p style={{fontSize:"13px",color:"#78716c",margin:"4px 0 0"}}>
                Set who invited <strong>{linkingMember.firstName} {linkingMember.lastName}</strong> into the tree.
              </p>
            </div>
            <div>
              <label style={{fontSize:"12px",fontWeight:700,color:"#78716c",display:"block",marginBottom:"6px"}}>INVITED BY</label>
              <select
                value={linkParentId}
                onChange={(e) => setLinkParentId(e.target.value)}
                style={{width:"100%",padding:"9px 12px",borderRadius:"8px",border:"1px solid #e7e5e4",fontSize:"14px",background:"white",color:"#1c1917"}}
              >
                <option value="">— select a member —</option>
                {members
                  .filter((m) => m.id !== linkingMember.id)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.firstName} {m.lastName} ({m.email})
                    </option>
                  ))}
              </select>
            </div>
            <div style={{display:"flex",gap:"8px",justifyContent:"flex-end"}}>
              <button
                onClick={() => { setLinkingMember(null); setLinkParentId(""); }}
                style={{padding:"8px 16px",borderRadius:"8px",border:"1px solid #e7e5e4",background:"white",fontSize:"13px",fontWeight:700,cursor:"pointer",color:"#78716c"}}
              >
                Cancel
              </button>
              <button
                disabled={!linkParentId || linkSaving}
                onClick={handleLinkParent}
                style={{padding:"8px 16px",borderRadius:"8px",border:"none",background:"#0f1729",color:"white",fontSize:"13px",fontWeight:700,cursor:linkParentId ? "pointer" : "not-allowed",opacity:linkParentId ? 1 : 0.5}}
              >
                {linkSaving ? "Saving…" : "Save link"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal — admin compose message ─────────────────────────────────────── */}
      {messagingMember && (
        <div
          onClick={(e) => e.target === e.currentTarget && (setMessagingMember(null), setMessageBody(""), setMessageSent(false))}
          style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:50,display:"flex",alignItems:"center",justifyContent:"center"}}
        >
          <div style={{position:"relative",background:"white",maxWidth:"440px",width:"90vw",borderRadius:"18px",overflow:"hidden",boxShadow:"0 24px 64px rgba(0,0,0,0.18)"}}>
            {/* Header */}
            <div style={{background:"#1a1a2e",padding:"18px 24px",display:"flex",alignItems:"center",gap:"10px"}}>
              <Mail style={{width:15,height:15,color:"#93c5fd"}} />
              <span style={{fontSize:"13px",fontWeight:700,color:"white"}}>
                Private message to {messagingMember.firstName} {messagingMember.lastName}
              </span>
              <button
                onClick={() => { setMessagingMember(null); setMessageBody(""); setMessageSent(false); }}
                style={{marginLeft:"auto",background:"rgba(255,255,255,0.12)",border:"none",borderRadius:"6px",padding:"4px 6px",cursor:"pointer",color:"white",fontSize:"16px",lineHeight:1}}
              >×</button>
            </div>

            <div style={{padding:"24px"}}>
              {messageSent ? (
                <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"10px",padding:"12px 0"}}>
                  <CheckCircle style={{width:36,height:36,color:"#16a34a"}} />
                  <p style={{fontWeight:700,color:"#1c1917",fontSize:"15px",margin:0}}>Message sent!</p>
                  <p style={{fontSize:"13px",color:"#78716c",margin:0,textAlign:"center"}}>
                    Delivered to {messagingMember.firstName}&apos;s Private Feed and inbox.
                  </p>
                </div>
              ) : (
                <>
                  <p style={{fontSize:"13px",color:"#78716c",margin:"0 0 14px"}}>
                    This will appear in their <strong>Private Feed</strong> as a DM and trigger an <strong>email notification</strong>.
                  </p>
                  <textarea
                    value={messageBody}
                    onChange={(e) => setMessageBody(e.target.value)}
                    placeholder={`Write your message to ${messagingMember.firstName}…`}
                    rows={5}
                    maxLength={1000}
                    autoFocus
                    style={{
                      width:"100%", padding:"10px 12px", borderRadius:"10px",
                      border:"1px solid #e7e5e4", fontSize:"14px",
                      resize:"vertical", outline:"none", boxSizing:"border-box",
                      lineHeight:1.6,
                    }}
                  />
                  <div style={{marginTop:"14px",display:"flex",justifyContent:"flex-end",gap:"10px"}}>
                    <button
                      onClick={() => { setMessagingMember(null); setMessageBody(""); }}
                      style={{padding:"9px 18px",borderRadius:"10px",background:"#f5f4f0",color:"#78716c",border:"none",fontSize:"13px",fontWeight:600,cursor:"pointer"}}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSendMessage}
                      disabled={messageSending || !messageBody.trim()}
                      style={{
                        padding:"9px 20px",borderRadius:"10px",background:"#1a1a2e",color:"white",
                        border:"none",fontSize:"13px",fontWeight:700,cursor:"pointer",
                        display:"flex",alignItems:"center",gap:"7px",
                        opacity: messageSending || !messageBody.trim() ? 0.5 : 1,
                      }}
                    >
                      <Send style={{width:13,height:13}} />
                      {messageSending ? "Sending…" : "Send message"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal — waitlist detail ────────────────────────────────────────────── */}
      {selectedWaitlist && (
        <div
          onClick={(e) => e.target === e.currentTarget && setSelectedWaitlist(null)}
          style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:50,display:"flex",alignItems:"center",justifyContent:"center"}}
        >
          <div style={{position:"relative",background:"white",maxWidth:"420px",width:"90vw",borderRadius:"18px",padding:"32px",boxShadow:"0 24px 64px rgba(0,0,0,0.18)"}}>
            <button
              onClick={() => setSelectedWaitlist(null)}
              style={{position:"absolute",top:"16px",right:"20px",border:"none",background:"transparent",fontSize:"20px",color:"#a8a29e",cursor:"pointer"}}
            >×</button>

            <div style={{width:"48px",height:"48px",borderRadius:"50%",background:"linear-gradient(135deg,#f59e0b,#f43f5e)",display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontWeight:700}}>
              {initials(selectedWaitlist.firstName, selectedWaitlist.lastName)}
            </div>
            <h2 style={{fontSize:"22px",fontWeight:800,color:"#1c1917",marginTop:"12px"}}>
              {selectedWaitlist.firstName} {selectedWaitlist.lastName}
            </h2>
            <p style={{fontSize:"14px",color:"#78716c",marginTop:"4px"}}>{selectedWaitlist.email}</p>

            <div style={{height:"1px",background:"#f5f4f0",margin:"20px 0"}} />

            <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
              <InfoRow label="Phone">{selectedWaitlist.phone ?? "Not provided"}</InfoRow>
              <InfoRow label="Requested">{fullDate(selectedWaitlist.createdAt)}</InfoRow>
              <InfoRow label="Email">{selectedWaitlist.email}</InfoRow>
            </div>

            <button
              onClick={() => { window.location.href = `/invite?prefill=${encodeURIComponent(selectedWaitlist.email)}`; }}
              style={{width:"100%",height:"44px",background:"#0f1729",color:"white",fontWeight:700,borderRadius:"10px",fontSize:"14px",border:"none",cursor:"pointer",marginTop:"24px"}}
            >
              Send Invite →
            </button>
          </div>
        </div>
      )}
    </>
  );
}
