"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import type { VaultNoticeItem } from "@/lib/msg-vault/api-client";
import { markVaultNoticeRead } from "@/lib/msg-vault/api-client";
import { MsgNoticeStatus } from "@/types/msg-vault";
import { formatRelativeTime } from "@/lib/msg-vault/display";

interface Props {
  notices: VaultNoticeItem[];
  loading?: boolean;
  selectedId: string | null;
  onSelect: (notice: VaultNoticeItem) => void;
  onRead: (notice: VaultNoticeItem) => void;
  shellMode?: "founder" | "member" | "child";
}

export function NoticesPanel({
  notices,
  loading,
  selectedId,
  onSelect,
  onRead,
  shellMode = "member",
}: Props) {
  async function handleMarkRead(notice: VaultNoticeItem, e: React.MouseEvent) {
    e.stopPropagation();
    if (notice.status !== MsgNoticeStatus.UNREAD) return;
    try {
      const updated = await markVaultNoticeRead(notice.id);
      onRead({
        ...notice,
        ...updated,
        source:       notice.source,
        sourceId:     notice.sourceId,
        href:         notice.href,
        contextLines: notice.contextLines,
      });
    } catch {
      /* mark-read is best-effort; list state unchanged on failure */
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
          Notices will appear here when they need your attention.
        </p>
      </div>
    );
  }

  return (
    <NoticeList
      notices={notices}
      selectedId={selectedId}
      onSelect={onSelect}
      onMarkRead={handleMarkRead}
    />
  );
}

function NoticeList({
  notices,
  selectedId,
  onSelect,
  onMarkRead,
}: {
  notices: VaultNoticeItem[];
  selectedId: string | null;
  onSelect: (notice: VaultNoticeItem) => void;
  onMarkRead: (notice: VaultNoticeItem, e: React.MouseEvent) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "4px 4px 16px" }}>
      {notices.map((notice) => {
        const unread = notice.status === MsgNoticeStatus.UNREAD;
        const selected = notice.id === selectedId;
        return (
          <article
            key={notice.id}
            role="button"
            tabIndex={0}
            onClick={() => onSelect(notice)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(notice);
              }
            }}
            style={{
              padding:      14,
              borderRadius: 12,
              border:       selected
                ? "1px solid #6366f1"
                : unread
                  ? "1px solid #e9d5ff"
                  : "1px solid #ece9e3",
              background:   selected ? "#eef2ff" : unread ? "#faf5ff" : "#fff",
              cursor:       "pointer",
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
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span
                style={{
                  fontSize:         10,
                  fontWeight:       700,
                  textTransform:    "uppercase",
                  letterSpacing:    "0.05em",
                  color:            "#7c3aed",
                }}
              >
                {notice.kind.replace(/_/g, " ")}
              </span>
              <span style={{ fontSize: 10, color: "#a8a29e" }}>{notice.source}</span>
              {notice.href && (
                <Link
                  href={notice.href}
                  onClick={(e) => e.stopPropagation()}
                  style={{ fontSize: 12, fontWeight: 600, color: "#6366f1" }}
                >
                  Open
                </Link>
              )}
              {unread && (
                <button
                  type="button"
                  onClick={(e) => onMarkRead(notice, e)}
                  style={{
                    marginLeft: "auto",
                    fontSize:   12,
                    fontWeight: 600,
                    color:      "#6366f1",
                    background: "none",
                    border:     "none",
                    cursor:     "pointer",
                    padding:    0,
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
