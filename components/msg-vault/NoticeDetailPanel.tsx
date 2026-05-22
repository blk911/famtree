"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import type { VaultNoticeItem } from "@/lib/msg-vault/api-client";
import { markVaultNoticeRead } from "@/lib/msg-vault/api-client";
import { formatRelativeTime } from "@/lib/msg-vault/display";
import { MsgNoticeStatus } from "@/types/msg-vault";

export function NoticeDetailPanel({
  notice,
  loading,
  onRead,
}: {
  notice: VaultNoticeItem | null;
  loading?: boolean;
  onRead: (notice: VaultNoticeItem) => void;
}) {
  if (loading) {
    return (
      <p className="flex-1 py-8 text-center text-[12px] text-stone-400">Loading notices…</p>
    );
  }

  if (!notice) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-10">
        <p className="m-0 text-[15px] font-medium text-stone-500">Select a notice.</p>
      </div>
    );
  }

  const n = notice;
  const unread = n.status === MsgNoticeStatus.UNREAD;

  async function handleMarkRead() {
    if (!unread) return;
    try {
      const updated = await markVaultNoticeRead(n.id);
      onRead({
        ...n,
        ...updated,
        source: n.source,
        sourceId: n.sourceId,
        href: n.href,
        contextLines: n.contextLines,
      });
    } catch {
      /* best-effort */
    }
  }

  return (
    <div style={{ padding: "20px 22px", overflow: "auto", flex: 1 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
        <Bell style={{ width: 20, height: 20, color: "#7c3aed", flexShrink: 0, marginTop: 2 }} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <h2 style={{ margin: "0 0 6px", fontSize: 17, fontWeight: 700, color: "#1c1917" }}>
            {n.title}
          </h2>
          <p style={{ margin: 0, fontSize: 12, color: "#a8a29e" }}>
            {formatRelativeTime(n.createdAt)} · {n.kind.replace(/_/g, " ")}
          </p>
        </div>
      </div>
      <p style={{ margin: "0 0 20px", fontSize: 14, color: "#44403c", lineHeight: 1.6 }}>
        {n.body}
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
        {unread && (
          <button
            type="button"
            onClick={() => void handleMarkRead()}
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "#6366f1",
              background: "#eef2ff",
              border: "1px solid #c7d2fe",
              borderRadius: 8,
              padding: "6px 12px",
              cursor: "pointer",
            }}
          >
            Mark as read
          </button>
        )}
        {n.href && (
          <Link
            href={n.href}
            style={{ fontSize: 12, fontWeight: 600, color: "#6366f1", textDecoration: "none" }}
          >
            Open related page →
          </Link>
        )}
      </div>
    </div>
  );
}
