"use client";

import { useEffect, useState } from "react";
import { Ban } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Member = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  status: string;
  createdAt: Date | string;
};

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

const ACTION_BTN: Record<string, { label: string; bg: string; color: string }> = {
  suspend:  { label:"Suspend",  bg:"#fef9c3", color:"#854d0e" },
  archive:  { label:"Archive",  bg:"#f1f5f9", color:"#475569" },
  block:    { label:"Block",    bg:"#fee2e2", color:"#991b1b" },
  activate: { label:"Activate", bg:"#dcfce7", color:"#166534" },
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

  // close modals on Escape
  useEffect(() => {
    if (!selectedMember && !selectedWaitlist) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setSelectedMember(null); setSelectedWaitlist(null); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedMember, selectedWaitlist]);

  // ─── Handle invite cancel ────────────────────────────────────────────────────

  const handleInviteCancel = async (inviteId: string) => {
    setInviteActioning(inviteId);
    try {
      const res = await fetch(`/api/invite/manage/${inviteId}`, { method: "PATCH" });
      if (res.ok) {
        // Hard delete — remove from view entirely
        setInvites((prev) => prev.filter((inv) => inv.id !== inviteId));
      }
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

                {/* Name */}
                <div style={nameStyle}>{member.firstName} {member.lastName}</div>

                {/* Email — hidden on mobile */}
                <div className="al-col-secondary" style={emailStyle}>{member.email}</div>

                {/* Role · Date — hidden on mobile */}
                <div className="al-col-secondary" style={metaStyle}>{member.role} · {shortDate(member.createdAt)}</div>

                {/* Status badge */}
                <StatusBadge label={member.status} colors={statusColors} />

                {/* Action buttons */}
                <div style={{display:"flex",gap:"4px",flexShrink:0}} onClick={(e) => e.stopPropagation()}>
                  {actions.map((action) => {
                    const btn = ACTION_BTN[action];
                    return (
                      <button
                        key={action}
                        className="al-action-btn"
                        disabled={loading}
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

                {/* Cancel button — pending only */}
                {isPending && (
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
              <InfoRow label="Member since">{fullDate(selectedMember.createdAt)}</InfoRow>
              <InfoRow label="Email">{selectedMember.email}</InfoRow>
            </div>

            {/* Action buttons in modal */}
            {actionForStatus(selectedMember.status).length > 0 && (
              <>
                <div style={{height:"1px",background:"#f5f4f0",margin:"20px 0"}} />
                <div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>
                  {actionForStatus(selectedMember.status).map((action) => {
                    const btn = ACTION_BTN[action];
                    const loading = actionLoading === selectedMember.id;
                    return (
                      <button
                        key={action}
                        className="al-action-btn"
                        disabled={loading}
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
