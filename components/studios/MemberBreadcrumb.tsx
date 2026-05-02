// components/studios/MemberBreadcrumb.tsx
// Renders ONLY when an authenticated AIH member views Studios pages.
// Public visitors (no session cookie) see nothing.
// This is a server component — no client JS, no flash, no leak.

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";

export async function MemberBreadcrumb() {
  const user = await getCurrentUser();
  if (!user) return null; // public visitor — no breadcrumb

  return (
    <div style={{
      width: "100%",
      background: "rgba(255,255,255,0.04)",
      borderBottom: "1px solid rgba(255,255,255,0.08)",
      backdropFilter: "blur(8px)",
      WebkitBackdropFilter: "blur(8px)",
    }}>
      <div style={{
        maxWidth: "1200px",
        margin: "0 auto",
        padding: "10px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "16px",
      }}>
        <Link
          href="/dashboard"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            color: "rgba(255,255,255,0.85)",
            fontSize: "13px",
            fontWeight: 500,
            textDecoration: "none",
            padding: "6px 12px",
            borderRadius: "8px",
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            transition: "background 0.15s",
          }}
        >
          <ArrowLeft style={{ width: "14px", height: "14px" }} />
          Return to AIH
        </Link>

        <span style={{
          fontSize: "12px",
          color: "rgba(255,255,255,0.45)",
          fontWeight: 500,
        }}>
          Logged in as <span style={{ color: "rgba(255,255,255,0.75)" }}>{user.firstName} {user.lastName}</span>
        </span>
      </div>
    </div>
  );
}
