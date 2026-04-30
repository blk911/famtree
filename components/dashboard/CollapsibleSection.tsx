"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

interface Props {
  title: string;
  defaultOpen?: boolean;
  count?: number;
  rightLabel?: React.ReactNode;
  children: React.ReactNode;
}

export function CollapsibleSection({ title, defaultOpen = true, count, rightLabel, children }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div style={{ background:"white", borderRadius:"16px", border:"1px solid #ece9e3", overflow:"hidden", boxShadow:"0 1px 4px rgba(0,0,0,0.05)" }}>
      {/* Header */}
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between",
          padding:"13px 20px", background:"none", border:"none", cursor:"pointer",
          borderBottom: open ? "1px solid #f5f4f0" : "none",
        }}
      >
        <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
          {open
            ? <ChevronDown style={{ width:15, height:15, color:"#a8a29e" }} />
            : <ChevronRight style={{ width:15, height:15, color:"#a8a29e" }} />
          }
          <span style={{ fontSize:"14px", fontWeight:700, color:"#1c1917" }}>{title}</span>
          {count !== undefined && (
            <span style={{ fontSize:"11px", fontWeight:700, color:"#78716c", background:"#f5f4f0", borderRadius:"999px", padding:"2px 8px" }}>
              {count}
            </span>
          )}
        </div>
        {rightLabel && (
          <span style={{ fontSize:"13px", color:"#6366f1", fontWeight:500 }}>{rightLabel}</span>
        )}
      </button>

      {/* Body */}
      {open && (
        <div style={{ padding:"16px 20px" }}>
          {children}
        </div>
      )}
    </div>
  );
}
