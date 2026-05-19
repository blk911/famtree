"use client";

import { Bell } from "lucide-react";
import type { MsgNoticeDTO } from "@/types/msg-vault";
import { MsgNoticeStatus } from "@/types/msg-vault";
import { formatRelativeTime } from "@/lib/msg-vault/display";
import { markVaultNoticeRead, MsgVaultApiError } from "@/lib/msg-vault/api-client";

interface Props {
  notices: MsgNoticeDTO[];
  loading?: boolean;
  onRead: (notice: MsgNoticeDTO) => void;
  shellMode?: "founder" | "member" | "child";
}

export function NoticesPanel({ notices, loading, onRead, shellMode = "member" }: Props) {
  async function handleMarkRead(notice: MsgNoticeDTO) {
    if (notice.status !== MsgNoticeStatus.UNREAD) return;
    try {
      const updated = await markVaultNoticeRead(notice.id);
      onRead(updated);
    } catch (err) {
      console.error(err instanceof MsgVaultApiError ? err.message : err);
    }
  }

  if (loading) {
    return <p style={{ padding: 20, fontSize: 13, color: "#a8a29e" }}>Loading notices…</p>;
  }

  if (notices.length === 0) {
    return (
      <div style={{ padding: 28, textAlign: "center" }}>
        <Bell style={{ width: 36, height: 36, color: "#c4b5fd", margin: "0 auto 12px" }} />
        <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "#1c1917" }}>
          No notices right now
        </p>
        <p style={{ margin: "8px auto 0", fontSize: 13, color: "#78716c", maxWidth: 320, lineHeight: 1.5 }}>
          {shellMode === "child"
            ? "When something needs your attention or guardian approval, it will show up here."
            : "Approvals, policy updates, and governance events appear here when they need your attention."}
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "4px 4px 16px" }}>
      {notices.map((notice) => {
        const unread = notice.status === MsgNoticeStatus.UNREAD;
        return (
          <article
            key={notice.id}
            style={{
              padding:      14,
              borderRadius: 12,
              border:       unread ? "1px solid #e9d5ff" : "1px solid #ece9e3",
              background:   unread ? "#faf5ff" : "#fff",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#1c1917" }}>
                {notice.title}
              </h3>
              <span style={{ fontSize: 11, color: "#a8a29e", flexShrink: 0 }}>
                {formatRelativeTime(notice.createdAt)}
              </span>
            </div>
            <p style={{ margin: "0 0 10px", fontSize: 13, color: "#57534e", lineHeight: 1.5 }}>
              {notice.body}
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: "#7c3aed",
                }}
              >
                {notice.kind.replace(/_/g, " ")}
              </span>
              {unread && (
                <button
                  type="button"
                  onClick={() => handleMarkRead(notice)}
                  style={{
                    marginLeft:   "auto",
                    fontSize:     12,
                    fontWeight:   600,
                    color:        "#6366f1",
                    background:   "none",
                    border:       "none",
                    cursor:       "pointer",
                    padding:      0,
                  }}
                >
                  Mark read
                </button>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
