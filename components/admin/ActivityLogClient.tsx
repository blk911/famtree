"use client";

import { useState } from "react";
import { RefreshCw, ScrollText } from "lucide-react";

type LogEntry = {
  id: string;
  actorName: string;
  action: string;
  detail: string;
  createdAt: string | Date;
};

const ACTION_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  "invite.cancel":   { bg:"#fef2f2", color:"#dc2626", label:"Invite Cancelled" },
  "invite.delete":   { bg:"#fef2f2", color:"#dc2626", label:"Invite Deleted" },
  "member.suspended":{ bg:"#fef9c3", color:"#854d0e", label:"Suspended" },
  "member.archived": { bg:"#f1f5f9", color:"#475569", label:"Archived" },
  "member.blocked":  { bg:"#fee2e2", color:"#991b1b", label:"Blocked" },
  "member.active":   { bg:"#dcfce7", color:"#166534", label:"Activated" },
};

function ActionBadge({ action }: { action: string }) {
  const cfg = ACTION_COLORS[action] ?? { bg:"#f5f4f0", color:"#78716c", label: action };
  return (
    <span style={{
      background: cfg.bg, color: cfg.color,
      fontSize:"10px", fontWeight:700,
      padding:"2px 7px", borderRadius:"999px",
      textTransform:"uppercase", letterSpacing:"0.04em",
      whiteSpace:"nowrap", flexShrink:0,
    }}>
      {cfg.label}
    </span>
  );
}

function formatTs(value: string | Date) {
  const d = new Date(value);
  return d.toLocaleString("en-US", {
    month:"short", day:"numeric", year:"numeric",
    hour:"numeric", minute:"2-digit", hour12:true,
  });
}

export function ActivityLogClient({ logs: initialLogs }: { logs: LogEntry[] }) {
  const [logs, setLogs] = useState<LogEntry[]>(initialLogs);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/activity");
      const data = await res.json();
      if (data.logs) setLogs(data.logs);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      background:"white", borderRadius:"16px",
      border:"1px solid #ece9e3", overflow:"hidden",
      boxShadow:"0 1px 4px rgba(0,0,0,0.05)",
    }}>
      {/* Header */}
      <div style={{
        display:"flex", alignItems:"center", gap:"10px",
        padding:"12px 20px", borderBottom:"1px solid #f5f4f0",
      }}>
        <ScrollText style={{ width:"16px", height:"16px", color:"#a8a29e", flexShrink:0 }} />
        <span style={{ fontSize:"14px", fontWeight:700, color:"#1c1917", flex:1 }}>
          {logs.length} {logs.length === 1 ? "entry" : "entries"}
        </span>
        <button
          onClick={refresh}
          disabled={loading}
          style={{
            display:"flex", alignItems:"center", gap:"5px",
            padding:"6px 12px", border:"1px solid #e7e5e4",
            borderRadius:"8px", background:"white", cursor:"pointer",
            fontSize:"12px", fontWeight:600, color:"#78716c",
          }}
        >
          <RefreshCw style={{ width:"12px", height:"12px" }} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Log entries */}
      {logs.length === 0 ? (
        <div style={{ padding:"40px", textAlign:"center", color:"#a8a29e", fontSize:"14px" }}>
          No activity recorded yet.
        </div>
      ) : (
        <div>
          {logs.map((entry, index) => (
            <div
              key={entry.id}
              style={{
                display:"flex", alignItems:"center", gap:"12px",
                padding:"10px 20px",
                borderBottom: index === logs.length - 1 ? "none" : "1px solid #f5f4f0",
                fontSize:"13px",
              }}
            >
              {/* Timestamp */}
              <div style={{ color:"#a8a29e", whiteSpace:"nowrap", flexShrink:0, minWidth:"140px", fontSize:"12px" }}>
                {formatTs(entry.createdAt)}
              </div>

              {/* Actor */}
              <div style={{ fontWeight:700, color:"#1c1917", whiteSpace:"nowrap", flexShrink:0, minWidth:"120px", overflow:"hidden", textOverflow:"ellipsis" }}>
                {entry.actorName}
              </div>

              {/* Detail */}
              <div style={{ flex:1, color:"#44403c", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                {entry.detail}
              </div>

              {/* Badge */}
              <ActionBadge action={entry.action} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
