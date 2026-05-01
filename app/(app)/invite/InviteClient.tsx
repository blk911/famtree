"use client";
// app/(app)/invite/InviteClient.tsx

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Mail, Send, Clock, CheckCircle, XCircle, AlertCircle, RefreshCw, X, Ban, Trash2 } from "lucide-react";
import TrustUnitModal from "@/components/invite/TrustUnitModal";

interface Invite {
  id: string;
  recipientEmail: string;
  relationship: string | null;
  status: "PENDING" | "ACCEPTED" | "EXPIRED" | "CANCELLED";
  attempts: number;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
}

export interface Me {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  email: string;
}

type ExistingUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  photoUrl: string | null;
};

// ── Relationship options ──────────────────────────────────────────────────────

export const RELATIONSHIPS = [
  { value: "parent",  label: "Parent",  color: "#7c3aed" },
  { value: "child",   label: "Child",   color: "#7c3aed" },
  { value: "sibling", label: "Sibling", color: "#0891b2" },
  { value: "spouse",  label: "Spouse",  color: "#be185d" },
  { value: "so",      label: "S.O.",    color: "#be185d" },
  { value: "bf",      label: "BF",      color: "#be185d" },
  { value: "gf",      label: "GF",      color: "#be185d" },
  { value: "other",   label: "Other",   color: "#78716c" },
] as const;

function RelationshipPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const selected = RELATIONSHIPS.find((r) => r.value === value);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex", alignItems: "center", gap: "5px",
          padding: "3px 10px", borderRadius: "999px",
          border: selected ? `1px solid ${selected.color}55` : "1px dashed #c4b5fd",
          background: selected ? `${selected.color}12` : "transparent",
          color: selected ? selected.color : "#a78bfa",
          fontSize: "12px", fontWeight: 700, cursor: "pointer",
          transition: "all 0.12s",
        }}
      >
        {selected ? selected.label : "＋ tag"}
        {selected && (
          <span
            onClick={(e) => { e.stopPropagation(); onChange(""); }}
            style={{ fontSize: "11px", opacity: 0.65, marginLeft: "1px", lineHeight: 1 }}
          >×</span>
        )}
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 200,
          background: "white", borderRadius: "12px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.16)",
          border: "1px solid #ede9fe",
          padding: "10px",
          display: "flex", flexWrap: "wrap", gap: "6px",
          width: "210px",
        }}>
          {RELATIONSHIPS.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => { onChange(r.value); setOpen(false); }}
              style={{
                padding: "4px 11px", borderRadius: "999px",
                border: `1px solid ${r.color}44`,
                background: value === r.value ? r.color : `${r.color}12`,
                color: value === r.value ? "white" : r.color,
                fontSize: "12px", fontWeight: 700, cursor: "pointer",
                transition: "all 0.12s",
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const STATUS_CONFIG = {
  PENDING:   { label:"Pending",   icon:Clock,        color:"#f59e0b", bg:"#fffbeb", border:"#fde68a" },
  ACCEPTED:  { label:"Joined",    icon:CheckCircle,  color:"#16a34a", bg:"#f0fdf4", border:"#bbf7d0" },
  EXPIRED:   { label:"Expired",   icon:XCircle,      color:"#dc2626", bg:"#fef2f2", border:"#fecaca" },
  CANCELLED: { label:"Cancelled", icon:AlertCircle,  color:"#78716c", bg:"#fafaf9", border:"#e7e5e4" },
};

// ── Confirm modal (portalled to document.body) ────────────────────────────────

function ConfirmModal({
  recipientName, recipientEmail, relationship, sender, onConfirm, onCancel, sending,
}: {
  recipientName: string;
  recipientEmail: string;
  relationship: string;
  sender: Me;
  onConfirm: () => void;
  onCancel: () => void;
  sending: boolean;
}) {
  const initials = `${sender.firstName[0]}${sender.lastName[0]}`.toUpperCase();

  const modal = (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
      style={{
        position:"fixed", inset:0, zIndex:9999,
        background:"rgba(30,27,75,0.6)", backdropFilter:"blur(4px)",
        display:"flex", alignItems:"center", justifyContent:"center", padding:"24px",
      }}
    >
      <div style={{ background:"white", borderRadius:"22px", width:"100%", maxWidth:"420px", boxShadow:"0 24px 64px rgba(0,0,0,0.35)", overflow:"hidden" }}>

        {/* Header */}
        <div style={{ background:"linear-gradient(135deg,#7c3aed,#c026d3)", padding:"20px 24px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <p style={{ fontSize:"17px", fontWeight:800, color:"white", margin:0 }}>Review &amp; Confirm</p>
            <p style={{ fontSize:"13px", color:"rgba(255,255,255,0.75)", margin:"2px 0 0" }}>Confirm to send this invite</p>
          </div>
          <button onClick={onCancel} style={{ background:"rgba(255,255,255,0.2)", border:"none", borderRadius:"50%", width:32, height:32, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <X style={{ width:16, height:16, color:"white" }} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding:"24px" }}>

          {/* To / From / Subject / Relationship */}
          <div style={{ background:"#f8f7ff", borderRadius:"12px", padding:"14px 16px", marginBottom:"20px", border:"1px solid #ede9fe" }}>
            {([
              ["To",      recipientName ? `${recipientName} <${recipientEmail}>` : recipientEmail],
              ["From",    `${sender.firstName} ${sender.lastName} <noreply@AMIHUMAN.NET.app>`],
              ["Subject", `You've been invited to join the ${sender.lastName} Family`],
              ...(relationship ? [["Relation", RELATIONSHIPS.find((r) => r.value === relationship)?.label ?? relationship]] : []),
            ] as [string, string][]).map(([lbl, val], i, arr) => (
              <div key={lbl} style={{ fontSize:"13px", marginBottom: i < arr.length - 1 ? "7px" : 0 }}>
                <span style={{ fontWeight:700, color:"#374151", display:"inline-block", minWidth:52 }}>{lbl}:</span>
                <span style={{ color:"#1e1b4b" }}>{val}</span>
              </div>
            ))}
          </div>

          {/* Sender photo */}
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"8px", marginBottom:"20px" }}>
            <p style={{ fontSize:"12px", fontWeight:700, color:"#7c3aed", textTransform:"uppercase", letterSpacing:"0.06em", margin:0 }}>Photo they will see</p>
            <div style={{ width:80, height:80, borderRadius:"50%", overflow:"hidden", border:"3px solid #ede9fe", background:"linear-gradient(135deg,#7c3aed,#c026d3)", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 6px 24px rgba(124,58,237,0.22)" }}>
              {sender.photoUrl
                ? <img src={sender.photoUrl} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                : <span style={{ fontSize:"22px", fontWeight:800, color:"white" }}>{initials}</span>}
            </div>
            <p style={{ fontSize:"13px", fontWeight:600, color:"#44403c", margin:0 }}>{sender.firstName} {sender.lastName}</p>
          </div>

          {/* Checklist */}
          <div style={{ background:"#f0fdf4", borderRadius:"10px", padding:"12px 14px", marginBottom:"20px", border:"1px solid #bbf7d0" }}>
            {["Invite email sent immediately", "Recipient identifies you to unlock registration", "Their account links to yours in the tree", "Appears as Pending until they join"].map((line, i, arr) => (
              <div key={i} style={{ display:"flex", gap:"8px", marginBottom: i < arr.length - 1 ? "5px" : 0 }}>
                <span style={{ fontSize:"12px", color:"#16a34a", fontWeight:700 }}>✓</span>
                <span style={{ fontSize:"13px", color:"#166534" }}>{line}</span>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div style={{ display:"flex", gap:"10px" }}>
            <button onClick={onCancel} disabled={sending} style={{ flex:1, height:"44px", border:"1.5px solid #e7e5e4", borderRadius:"12px", background:"white", cursor:"pointer", fontSize:"14px", fontWeight:600, color:"#78716c" }}>
              Cancel
            </button>
            <button onClick={onConfirm} disabled={sending} style={{ flex:2, height:"44px", border:"none", borderRadius:"12px", cursor:"pointer", background:"linear-gradient(135deg,#7c3aed,#c026d3)", color:"white", fontSize:"15px", fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", gap:"8px", opacity: sending ? 0.75 : 1, boxShadow:"0 6px 20px rgba(124,58,237,0.3)" }}>
              <Send style={{ width:16, height:16 }} />
              {sending ? "Sending…" : "Send Invite"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(modal, document.body);
}

// ── Main client component ─────────────────────────────────────────────────────

export default function InviteClient({ me }: { me: Me }) {
  // ── state ──
  const [recipientName,    setRecipientName]    = useState("");
  const [recipientEmail,   setRecipientEmail]   = useState("");
  const [relationship,     setRelationship]     = useState("");
  const [emailError,       setEmailError]       = useState("");
  const [showModal,        setShowModal]        = useState(false);
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [showTrustModal,   setShowTrustModal]   = useState(false);
  const [sending,          setSending]          = useState(false);
  const [sendResult,       setSendResult]       = useState<{ type:"success"|"error"; msg:string; inviteeName?:string }|null>(null);
  const [invites,          setInvites]          = useState<Invite[]>([]);
  const [loadingInvites,   setLoadingInvites]   = useState(true);
  const [actioning,        setActioning]        = useState<string | null>(null);
  const [confirmDelete,    setConfirmDelete]    = useState<string | null>(null); // invite id pending delete confirm
  const [targetUser,       setTargetUser]       = useState<ExistingUser | null>(null);
  const [trustCandidates,  setTrustCandidates]  = useState<ExistingUser[]>([]);

  // ── derived values — computed BEFORE any handler that references them ──
  const hasEmail      = recipientEmail.includes("@");
  const senderInitials = `${me.firstName[0]}${me.lastName[0]}`.toUpperCase();
  const subject       = `You've been invited to join the ${me.lastName} Family`;
  const pendingCount  = invites.filter((i) => i.status === "PENDING").length;
  const acceptedCount = invites.filter((i) => i.status === "ACCEPTED").length;

  // ── handlers ──
  const loadInvites = () => {
    setLoadingInvites(true);
    return fetch("/api/invite")
      .then((r) => r.json())
      .then(({ invites: list }) => setInvites(list ?? []))
      .finally(() => setLoadingInvites(false));
  };

  useEffect(() => { loadInvites(); }, []);

  const handleCancel = async (id: string) => {
    setActioning(id);
    const res = await fetch(`/api/invite/manage/${id}`, { method: "PATCH" });
    if (res.ok) {
      // Hard delete — remove from list immediately
      setInvites((prev) => prev.filter((inv) => inv.id !== id));
    }
    setActioning(null);
  };

  const handleDelete = async (id: string) => {
    setActioning(id);
    setConfirmDelete(null);
    await fetch(`/api/invite/manage/${id}`, { method: "DELETE" });
    await loadInvites();
    setActioning(null);
  };

  const handleReviewClick = async () => {
    if (!hasEmail) {
      setEmailError("Please enter a valid email address first.");
      return;
    }
    setEmailError("");
    setSending(true);
    try {
      const lookupRes = await fetch("/api/users/lookup-by-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: recipientEmail }),
      });
      const lookupData = await lookupRes.json();

      if (!lookupRes.ok) {
        setSendResult({ type:"error", msg:lookupData.error ?? "Unable to check this email" });
        return;
      }

      if (!lookupData.user) {
        setShowModal(true);
        return;
      }

      const trustRes = await fetch("/api/trust/check-opportunity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentUserId: me.id,
          targetUserId: lookupData.user.id,
        }),
      });
      const trustData = await trustRes.json();

      if (trustRes.ok && trustData.canFormTrustUnit) {
        setTargetUser(lookupData.user);
        setTrustCandidates(trustData.members ?? []);
        setShowTrustModal(true);
        return;
      }

      setTargetUser(lookupData.user);
      setShowConnectionModal(true);
    } catch {
      setSendResult({ type:"error", msg:"Network error — please try again." });
    } finally {
      setSending(false);
    }
  };

  const handleConfirmSend = async () => {
    setSending(true);
    setSendResult(null);
    try {
      const res  = await fetch("/api/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientEmail, ...(relationship ? { relationship } : {}) }),
      });
      const data = await res.json();
      setShowModal(false);
      if (res.ok) {
        const inviteeName = recipientName.trim() || recipientEmail;
        setSendResult({ type:"success", msg:"Invite sent", inviteeName });
        setRecipientName("");
        setRecipientEmail("");
        setRelationship("");
        setEmailError("");
        loadInvites();
      } else {
        setSendResult({ type:"error", msg: data.error ?? "Failed to send invite" });
      }
    } catch {
      setShowModal(false);
      setSendResult({ type:"error", msg:"Network error — please try again." });
    } finally {
      setSending(false);
    }
  };

  const handleCreateConnection = async () => {
    if (!targetUser) return;
    setSending(true);
    try {
      const res = await fetch("/api/connections/create-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: targetUser.id }),
      });
      const data = await res.json();
      setShowConnectionModal(false);
      if (!res.ok) {
        setSendResult({ type:"error", msg:data.error ?? "Failed to send connection request" });
        return;
      }
      setSendResult({ type:"success", msg:"Connection request sent", inviteeName:`${targetUser.firstName} ${targetUser.lastName}` });
      setRecipientName("");
      setRecipientEmail("");
      setTargetUser(null);
    } catch {
      setSendResult({ type:"error", msg:"Network error — please try again." });
    } finally {
      setSending(false);
    }
  };

  const handleCreateTrustUnit = async () => {
    setSending(true);
    try {
      const memberIds = trustCandidates.map((member) => member.id);
      const res = await fetch("/api/trust/create-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberIds, createdBy: me.id }),
      });
      const data = await res.json();
      setShowTrustModal(false);
      if (!res.ok) {
        setSendResult({ type:"error", msg:data.error ?? "Failed to create Trust Unit request" });
        return;
      }
      setSendResult({ type:"success", msg:"Trust Unit request sent", inviteeName:trustCandidates.map((member) => member.firstName).join(" · ") });
      setRecipientName("");
      setRecipientEmail("");
      setTrustCandidates([]);
    } catch {
      setSendResult({ type:"error", msg:"Network error — please try again." });
    } finally {
      setSending(false);
    }
  };

  // ── render ──
  return (
    <>
      {/* Modal portalled to body so it's never clipped */}
      {showModal && (
        <ConfirmModal
          recipientName={recipientName}
          recipientEmail={recipientEmail}
          relationship={relationship}
          sender={me}
          onConfirm={handleConfirmSend}
          onCancel={() => setShowModal(false)}
          sending={sending}
        />
      )}

      {showConnectionModal && targetUser && createPortal(
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowConnectionModal(false); }}
          style={{ position:"fixed", inset:0, zIndex:9999, background:"rgba(30,27,75,0.6)", backdropFilter:"blur(4px)", display:"flex", alignItems:"center", justifyContent:"center", padding:"24px" }}
        >
          <div style={{ background:"white", borderRadius:"22px", width:"100%", maxWidth:"420px", boxShadow:"0 24px 64px rgba(0,0,0,0.35)", padding:"24px" }}>
            <h2 style={{ fontSize:"18px", fontWeight:800, color:"#1c1917", margin:0 }}>Member already exists</h2>
            <p style={{ fontSize:"14px", color:"#78716c", lineHeight:1.6, margin:"10px 0 18px" }}>
              {targetUser.firstName} is already on AMIHUMAN.NET. Send a connection request instead?
            </p>
            <div style={{ display:"flex", alignItems:"center", gap:"12px", padding:"12px", background:"#faf5ff", border:"1px solid #ede9fe", borderRadius:"14px", marginBottom:"18px" }}>
              <div style={{ width:"44px", height:"44px", borderRadius:"50%", overflow:"hidden", background:"linear-gradient(135deg,#7c3aed,#c026d3)", display:"flex", alignItems:"center", justifyContent:"center", color:"white", fontWeight:800 }}>
                {targetUser.photoUrl
                  ? <img src={targetUser.photoUrl} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                  : `${targetUser.firstName[0] ?? ""}${targetUser.lastName[0] ?? ""}`.toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize:"14px", fontWeight:800, color:"#1c1917" }}>{targetUser.firstName} {targetUser.lastName}</div>
                <div style={{ fontSize:"12px", color:"#78716c" }}>{targetUser.email}</div>
              </div>
            </div>
            <div style={{ display:"flex", gap:"10px" }}>
              <button onClick={() => setShowConnectionModal(false)} disabled={sending} style={{ flex:1, height:"44px", border:"1px solid #e7e5e4", borderRadius:"12px", background:"white", color:"#78716c", fontWeight:700, cursor:"pointer" }}>Cancel</button>
              <button onClick={handleCreateConnection} disabled={sending} style={{ flex:1, height:"44px", border:"none", borderRadius:"12px", background:"linear-gradient(135deg,#7c3aed,#c026d3)", color:"white", fontWeight:800, cursor:"pointer", opacity:sending ? 0.7 : 1 }}>{sending ? "Sending…" : "Send Connection"}</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {showTrustModal && createPortal(
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowTrustModal(false); }}
          style={{ position:"fixed", inset:0, zIndex:9999, background:"rgba(30,27,75,0.6)", backdropFilter:"blur(4px)", display:"flex", alignItems:"center", justifyContent:"center", padding:"24px" }}
        >
          <div style={{ background:"white", borderRadius:"22px", width:"100%", maxWidth:"460px", boxShadow:"0 24px 64px rgba(0,0,0,0.35)", overflow:"hidden" }}>
            <TrustUnitModal
              members={trustCandidates}
              sending={sending}
              onConfirm={handleCreateTrustUnit}
              onFallback={() => {
                setShowTrustModal(false);
                setShowConnectionModal(!!targetUser);
              }}
            />
          </div>
        </div>,
        document.body
      )}

      <div style={{ display:"flex", flexDirection:"column", gap:"32px" }}>

        {/* Two-column grid — stacks to 1-col on mobile */}
        <div className="invite-two-col">

          {/* LEFT: compose-as-preview */}
          <div>
            {sendResult?.type === "success" && (
              <p className="text-base mt-2">
                <span className="font-semibold">
                  Invite sent to {sendResult.inviteeName || sendResult.msg}
                </span>
              </p>
            )}
            {sendResult?.type === "error" && (
              <div style={{ padding:"12px 14px", borderRadius:"10px", fontSize:"14px", marginBottom:"14px", background:"#fef2f2", borderLeft:"4px solid #dc2626", color:"#dc2626" }}>
                {sendResult.msg}
              </div>
            )}

            <div style={{ borderRadius:"20px", border:"1px solid #e5e7eb", overflow:"hidden", boxShadow:"0 4px 28px rgba(0,0,0,0.09)" }}>

              {/* Email chrome header */}
              <div style={{ background:"#f8f7ff", borderBottom:"1px solid #ede9fe" }}>

                <div style={{ padding:"12px 18px 0", display:"flex", alignItems:"center", gap:"8px" }}>
                  <div style={{ width:26, height:26, borderRadius:"7px", background:"linear-gradient(135deg,#7c3aed,#c026d3)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <span style={{ fontSize:"12px" }}>🌳</span>
                  </div>
                  <span style={{ fontSize:"14px", fontWeight:800, color:"#1e1b4b" }}>AMIHUMAN.NET</span>
                  <span style={{ fontSize:"12px", color:"#9ca3af", marginLeft:"4px" }}>&lt;noreply@AMIHUMAN.NET.app&gt;</span>
                </div>

                <div style={{ display:"flex", alignItems:"center", borderTop:"1px solid #ede9fe", margin:"10px 0 0", padding:"10px 18px" }}>
                  <span style={{ fontSize:"13px", fontWeight:700, color:"#374151", minWidth:58, flexShrink:0 }}>To:</span>
                  <input
                    type="text"
                    placeholder="Their name (e.g. Jane Smith)"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    style={{ flex:1, border:"none", outline:"none", background:"transparent", fontSize:"14px", color:"#1c1917", fontWeight:600 }}
                  />
                </div>

                <div style={{ display:"flex", alignItems:"center", borderTop:"1px solid #ede9fe", padding:"10px 18px" }}>
                  <span style={{ fontSize:"13px", fontWeight:700, color:"#374151", minWidth:58, flexShrink:0 }}>Email:</span>
                  <input
                    type="email"
                    placeholder="jane@example.com"
                    value={recipientEmail}
                    onChange={(e) => { setRecipientEmail(e.target.value); setSendResult(null); setEmailError(""); }}
                    style={{ flex:1, border:"none", outline:"none", background:"transparent", fontSize:"14px", color:"#1c1917" }}
                  />
                </div>

                <div style={{ display:"flex", alignItems:"center", borderTop:"1px solid #ede9fe", padding:"10px 18px" }}>
                  <span style={{ fontSize:"13px", fontWeight:700, color:"#374151", minWidth:58, flexShrink:0 }}>Subject:</span>
                  <span style={{ fontSize:"13px", color:"#374151" }}>{subject}</span>
                </div>

                <div style={{ display:"flex", alignItems:"center", borderTop:"1px solid #ede9fe", padding:"8px 18px", gap:"8px" }}>
                  <span style={{ fontSize:"13px", fontWeight:700, color:"#374151", minWidth:58, flexShrink:0 }}>Relation:</span>
                  <RelationshipPicker value={relationship} onChange={setRelationship} />
                </div>
              </div>

              {/* Email body */}
              <div style={{ background:"white", padding:"28px 24px", textAlign:"center" }}>
                <p style={{ fontSize:"15px", fontWeight:600, color:"#1e1b4b", margin:"0 0 4px" }}>
                  {recipientName ? `Hi ${recipientName.split(" ")[0]},` : "Someone in your family network"}
                </p>
                <p style={{ fontSize:"13px", color:"#6b7280", margin:"0 0 22px", lineHeight:1.6 }}>
                  {recipientName
                    ? `you've been personally invited to join the ${me.lastName} family tree.`
                    : "has invited you to join the family tree."}
                  <br />Can you identify who invited you?
                </p>

                <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"10px" }}>
                  <div style={{ width:110, height:110, borderRadius:"50%", overflow:"hidden", border:"4px solid #ede9fe", background:"linear-gradient(135deg,#7c3aed,#c026d3)", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 8px 32px rgba(124,58,237,0.25)" }}>
                    {me.photoUrl
                      ? <img src={me.photoUrl} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                      : <span style={{ fontSize:"32px", fontWeight:800, color:"white", letterSpacing:"-1px" }}>{senderInitials}</span>}
                  </div>
                  <p style={{ fontSize:"12px", color:"#9ca3af", margin:0 }}>Your photo only — your name is hidden from the recipient</p>
                </div>
              </div>

              {/* Send bar */}
              <div style={{ background:"#faf5ff", borderTop:"1px solid #ede9fe", padding:"16px 20px", display:"flex", flexDirection:"column", gap:"8px" }}>
                {emailError && (
                  <p style={{ fontSize:"13px", color:"#dc2626", textAlign:"center", margin:0, fontWeight:600 }}>{emailError}</p>
                )}
                <button
                  type="button"
                  onClick={handleReviewClick}
                  style={{
                    width:"100%", display:"flex", alignItems:"center", justifyContent:"center", gap:"8px",
                    height:"50px", border:"none", borderRadius:"12px", cursor:"pointer",
                    background: hasEmail ? "linear-gradient(135deg,#7c3aed,#c026d3)" : "#e5e7eb",
                    color: hasEmail ? "white" : "#9ca3af",
                    fontSize:"15px", fontWeight:700,
                    boxShadow: hasEmail ? "0 8px 24px rgba(124,58,237,0.3)" : "none",
                    transition:"all 0.2s",
                  }}
                >
                  <Send style={{ width:17, height:17 }} />
                  {sending ? "Checking…" : "Review & Send Invite →"}
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT: How it works */}
          <div style={{ display:"flex", flexDirection:"column", gap:"20px" }}>
            <div style={{ background:"#faf5ff", borderRadius:"16px", padding:"24px 22px", border:"1px solid #ede9fe" }}>
              <p style={{ fontSize:"13px", fontWeight:800, color:"#7c3aed", textTransform:"uppercase", letterSpacing:"0.08em", margin:"0 0 18px" }}>How it works</p>
              {[
                { title:"Fill in their name & email",    desc:"Enter who you're inviting — the name personalises the greeting." },
                { title:"They receive your photo only",  desc:"Your photo is sent but NOT your name — they must identify you." },
                { title:"They type your name to unlock", desc:"3 wrong guesses and the invite expires automatically." },
                { title:"They create their account",     desc:"Once verified they join the tree, linked directly to you." },
              ].map((step, i) => (
                <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:"14px", marginBottom: i < 3 ? "18px" : 0 }}>
                  <span style={{ width:28, height:28, borderRadius:"50%", flexShrink:0, background:"linear-gradient(135deg,#7c3aed,#c026d3)", color:"white", fontSize:"13px", fontWeight:800, display:"flex", alignItems:"center", justifyContent:"center" }}>{i + 1}</span>
                  <div style={{ paddingTop:"2px" }}>
                    <p style={{ fontSize:"14px", fontWeight:700, color:"#1c1917", margin:"0 0 3px" }}>{step.title}</p>
                    <p style={{ fontSize:"13px", color:"#78716c", margin:0, lineHeight:1.55 }}>{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ background:"#fff7ed", borderRadius:"14px", padding:"18px 20px", border:"1px solid #fed7aa" }}>
              <p style={{ fontSize:"13px", fontWeight:700, color:"#c2410c", margin:"0 0 8px" }}>🔒 Privacy by design</p>
              <p style={{ fontSize:"13px", color:"#7c3501", margin:0, lineHeight:1.6 }}>Your name is never revealed in the invite email. Only your photo is shared — making the identity challenge the key to joining.</p>
            </div>
          </div>
        </div>

        {/* Sent invites */}
        <div>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"16px" }}>
            <div>
              <h2 style={{ fontSize:"18px", fontWeight:700, color:"#1c1917", margin:0 }}>Sent invites</h2>
              <p style={{ fontSize:"13px", color:"#78716c", marginTop:"3px" }}>{pendingCount} pending · {acceptedCount} joined</p>
            </div>
            <button onClick={loadInvites} disabled={loadingInvites} style={{ display:"flex", alignItems:"center", gap:"6px", padding:"8px 14px", border:"1px solid #e7e5e4", borderRadius:"10px", background:"white", cursor:"pointer", fontSize:"13px", fontWeight:600, color:"#78716c" }}>
              <RefreshCw style={{ width:13, height:13 }} className={loadingInvites ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>

          {loadingInvites ? (
            <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
              {[1,2,3].map((i) => <div key={i} style={{ height:64, borderRadius:"14px", background:"#f5f4f0" }} />)}
            </div>
          ) : invites.length === 0 ? (
            <div style={{ textAlign:"center", padding:"48px 0", color:"#a8a29e" }}>
              <Mail style={{ width:36, height:36, margin:"0 auto 12px", color:"#d6d3d1" }} />
              <p style={{ fontSize:"15px", margin:0 }}>No invites sent yet</p>
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
              {invites.map((invite) => {
                const cfg = STATUS_CONFIG[invite.status];
                const Icon = cfg.icon;
                const sentAt    = new Date(invite.createdAt).toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" });
                const expiresAt = new Date(invite.expiresAt).toLocaleDateString("en-US", { month:"short", day:"numeric" });
                const isActioning = actioning === invite.id;
                const isPending = invite.status === "PENDING";
                return (
                  <div key={invite.id} style={{ display:"flex", alignItems:"center", gap:"12px", padding:"14px 20px", background:"white", borderRadius:"14px", border:"1px solid #e7e5e4", boxShadow:"0 1px 4px rgba(0,0,0,0.04)", opacity: isActioning ? 0.6 : 1, transition:"opacity 0.2s" }}>
                    {/* Info */}
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"2px" }}>
                        <p style={{ fontSize:"15px", fontWeight:600, color:"#1c1917", margin:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{invite.recipientEmail}</p>
                        {invite.relationship && (() => {
                          const rel = RELATIONSHIPS.find((r) => r.value === invite.relationship);
                          return rel ? (
                            <span style={{ fontSize:"11px", fontWeight:700, padding:"1px 8px", borderRadius:"999px", background:`${rel.color}12`, color:rel.color, border:`1px solid ${rel.color}33`, flexShrink:0 }}>
                              {rel.label}
                            </span>
                          ) : null;
                        })()}
                      </div>
                      <p style={{ fontSize:"13px", color:"#a8a29e", margin:"3px 0 0" }}>
                        Sent {sentAt}
                        {isPending && ` · expires ${expiresAt}`}
                        {invite.status === "ACCEPTED" && invite.acceptedAt && ` · joined ${new Date(invite.acceptedAt).toLocaleDateString("en-US", { month:"short", day:"numeric" })}`}
                        {invite.attempts > 0 && ` · ${invite.attempts} attempt${invite.attempts !== 1 ? "s" : ""}`}
                      </p>
                    </div>

                    {/* Status badge */}
                    <span style={{ display:"flex", alignItems:"center", gap:"5px", fontSize:"12px", fontWeight:700, padding:"5px 11px", borderRadius:"999px", background:cfg.bg, color:cfg.color, border:`1px solid ${cfg.border}`, flexShrink:0 }}>
                      <Icon style={{ width:12, height:12 }} />
                      {cfg.label}
                    </span>

                    {/* Actions */}
                    <div style={{ display:"flex", gap:"6px", flexShrink:0 }}>
                      {/* Cancel — pending only */}
                      {isPending && (
                        <button
                          onClick={() => handleCancel(invite.id)}
                          disabled={isActioning}
                          style={{ display:"flex", alignItems:"center", gap:"5px", padding:"5px 10px", border:"1px solid #fecaca", borderRadius:"8px", background:"#fef2f2", color:"#dc2626", fontSize:"12px", fontWeight:700, cursor:"pointer" }}
                        >
                          <Ban style={{ width:13, height:13 }} />
                          {isActioning ? "…" : "Cancel"}
                        </button>
                      )}

                      {/* Delete — not on accepted */}
                      {invite.status !== "ACCEPTED" && (
                        confirmDelete === invite.id ? (
                          <div style={{ display:"flex", gap:"4px" }}>
                            <button
                              onClick={() => handleDelete(invite.id)}
                              disabled={isActioning}
                              style={{ padding:"5px 10px", border:"1px solid #dc2626", borderRadius:"8px", background:"#dc2626", color:"white", fontSize:"12px", fontWeight:700, cursor:"pointer" }}
                            >
                              {isActioning ? "…" : "Confirm"}
                            </button>
                            <button
                              onClick={() => setConfirmDelete(null)}
                              style={{ padding:"5px 8px", border:"1px solid #e7e5e4", borderRadius:"8px", background:"white", color:"#78716c", fontSize:"12px", cursor:"pointer" }}
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDelete(invite.id)}
                            disabled={isActioning}
                            style={{ display:"flex", alignItems:"center", gap:"5px", padding:"5px 10px", border:"1px solid #fecaca", borderRadius:"8px", background:"#fef2f2", color:"#dc2626", fontSize:"12px", fontWeight:700, cursor:"pointer" }}
                          >
                            <Trash2 style={{ width:13, height:13 }} />
                            {isActioning ? "…" : "Delete"}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

