"use client";

import Link from "next/link";
import { useState } from "react";
import { X } from "lucide-react";

export function ProfileCompletionPrompt() {
  const [hidden, setHidden] = useState(false);

  const dismiss = async () => {
    setHidden(true);
    await fetch("/api/dashboard/profile-prompt/dismiss", { method: "POST" }).catch(() => null);
  };

  if (hidden) return null;

  return (
    <div style={{
      background:"linear-gradient(135deg,#eff6ff,#dbeafe)",
      border:"1px solid #bfdbfe", borderRadius:"14px",
      padding:"18px 22px", display:"flex",
      alignItems:"center", justifyContent:"space-between", gap:"16px",
    }}>
      <div>
        <p style={{ fontWeight:600, color:"#1e40af", fontSize:"15px", marginBottom:"4px" }}>
          Complete your profile
        </p>
        <p style={{ color:"#3b82f6", fontSize:"14px" }}>
          Add a photo and bio so family members can recognise you when they receive your invites.
        </p>
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:"10px", flexShrink:0 }}>
        <Link href="/settings" style={{
          padding:"10px 20px", background:"#2563eb", color:"white",
          borderRadius:"10px", fontWeight:600, fontSize:"14px",
          textDecoration:"none", whiteSpace:"nowrap",
        }}>
          Edit profile →
        </Link>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss profile prompt"
          style={{
            width:"34px", height:"34px", borderRadius:"999px",
            border:"1px solid #bfdbfe", background:"rgba(255,255,255,0.75)",
            color:"#2563eb", display:"flex", alignItems:"center",
            justifyContent:"center", cursor:"pointer",
          }}
        >
          <X style={{ width:"16px", height:"16px" }} />
        </button>
      </div>
    </div>
  );
}
