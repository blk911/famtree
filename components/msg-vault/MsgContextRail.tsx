"use client";

import Link from "next/link";
import { Bell, Shield } from "lucide-react";
import type { VaultNoticeItem } from "@/lib/msg-vault/api-client";
import type { GovernanceOverlayDTO } from "@/types/msg-vault";
import type { FamilySafeShellMode } from "@/components/aihsafe/roles/shellMode";
import { MsgNoticeStatus } from "@/types/msg-vault";
import { formatRelativeTime } from "@/lib/msg-vault/display";

interface Props {
  overlay: GovernanceOverlayDTO | null;
  selectedNotice: VaultNoticeItem | null;
  shellMode: FamilySafeShellMode;
  loading?: boolean;
}

export function MsgContextRail({ overlay, selectedNotice, shellMode, loading }: Props) {
  if (selectedNotice) {
    return <NoticeRail notice={selectedNotice} shellMode={shellMode} />;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <GovernanceCard overlay={overlay} loading={loading} />
      <FamilySafeHint shellMode={shellMode} />
    </div>
  );
}

function NoticeRail({
  notice,
  shellMode,
}: {
  notice: VaultNoticeItem;
  shellMode: FamilySafeShellMode;
}) {
  const unread = notice.status === MsgNoticeStatus.UNREAD;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div
        style={{
          background:   "#fff",
          borderRadius: 14,
          border:       "1px solid #ece9e3",
          padding:      "16px 18px",
          boxShadow:    "0 1px 3px rgba(0,0,0,0.04)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <Bell style={{ width: 16, height: 16, color: "#7c3aed" }} />
          <span
            style={{
              fontSize:      11,
              fontWeight:    700,
              color:         "#78716c",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            Notice context
          </span>
        </div>
        <h3 style={{ margin: "0 0 8px", fontSize: 15, fontWeight: 700, color: "#1c1917" }}>
          {notice.title}
        </h3>
        <p style={{ margin: "0 0 12px", fontSize: 13, color: "#57534e", lineHeight: 1.55 }}>
          {notice.body}
        </p>
        <ul
          style={{
            margin:     0,
            padding:    0,
            listStyle:  "none",
            fontSize:   12,
            color:      "#57534e",
            lineHeight: 1.65,
          }}
        >
          <li>
            <strong>Kind:</strong> {notice.kind.replace(/_/g, " ")}
          </li>
          <li>
            <strong>Source:</strong> {notice.source}
          </li>
          <li>
            <strong>When:</strong> {formatRelativeTime(notice.createdAt)}
          </li>
          <li>
            <strong>Status:</strong> {unread ? "Unread" : "Read"}
          </li>
          {notice.contextLines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        {notice.href && (
          <Link
            href={notice.href}
            style={{
              display:    "inline-block",
              marginTop:  14,
              fontSize:   13,
              fontWeight: 600,
              color:      "#4f46e5",
            }}
          >
            Open related page →
          </Link>
        )}
      </div>
      <FamilySafeHint shellMode={shellMode} />
    </div>
  );
}

function GovernanceCard({
  overlay,
  loading,
}: {
  overlay: GovernanceOverlayDTO | null;
  loading?: boolean;
}) {
  return (
    <div
      style={{
        background:   "#fff",
        borderRadius: 14,
        border:       "1px solid #ece9e3",
        padding:      "16px 18px",
        boxShadow:    "0 1px 3px rgba(0,0,0,0.04)",
      }}
    >
      <div
        style={{
          display:      "flex",
          alignItems:   "center",
          gap:          8,
          marginBottom: 12,
        }}
      >
        <Shield style={{ width: 16, height: 16, color: "#6366f1" }} />
        <span
          style={{
            fontSize:      11,
            fontWeight:    700,
            color:         "#78716c",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          Governance context
        </span>
      </div>

      {loading ? (
        <p style={{ margin: 0, fontSize: 13, color: "#a8a29e" }}>Loading context…</p>
      ) : overlay ? (
        <>
          <p style={{ margin: "0 0 12px", fontSize: 13, color: "#1c1917", lineHeight: 1.55 }}>
            {overlay.visibilityReason}
          </p>
          <ul
            style={{
              margin:     0,
              padding:    0,
              listStyle:  "none",
              fontSize:   12,
              color:      "#57534e",
              lineHeight: 1.6,
            }}
          >
            {overlay.visibilityScope && (
              <li>
                <strong>Scope:</strong> {overlay.visibilityScope}
              </li>
            )}
            {overlay.guardianOversightActive && (
              <li>
                <strong>Guardian visibility:</strong> active for this space
              </li>
            )}
            <li>
              <strong>External links:</strong>{" "}
              {overlay.externalSharingAllowed ? "allowed by policy" : "restricted for minors"}
            </li>
            {overlay.escalationPending && (
              <li style={{ color: "#b45309", fontWeight: 600 }}>
                Pending approval before this conversation is fully active.
              </li>
            )}
          </ul>
        </>
      ) : (
        <p style={{ margin: 0, fontSize: 13, color: "#78716c", lineHeight: 1.5 }}>
          Select a conversation to see why you can participate and what rules apply. Msg Vault never
          offers open DMs or public discovery.
        </p>
      )}
    </div>
  );
}

function FamilySafeHint({ shellMode }: { shellMode: FamilySafeShellMode }) {
  return (
    <div
      style={{
        background:   "#f5f3ff",
        borderRadius: 12,
        border:       "1px solid #e9d5ff",
        padding:      "14px 16px",
        fontSize:     12,
        color:        "#5b21b6",
        lineHeight:   1.5,
      }}
    >
      {shellMode === "child" ? (
        <>
          Messages here stay within approved family and trust relationships. Ask a guardian if you
          are unsure who you can talk to.
        </>
      ) : (
        <>
          Governed communication only — no stranger search, no open inbox. Manage policies in{" "}
          <Link href="/aihsafe" style={{ color: "#4f46e5", fontWeight: 600 }}>
            Family Safe
          </Link>
          .
        </>
      )}
    </div>
  );
}
