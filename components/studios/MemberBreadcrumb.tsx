// components/studios/MemberBreadcrumb.tsx
// Renders ONLY when an authenticated AIH member views Studios pages.
// Public visitors (no session cookie) see nothing.
// This is a server component — no client JS, no flash, no leak.

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";

export async function MemberBreadcrumb() {
  const user = await getCurrentUser();
  if (!user) return null;

  return (
    <div
      style={{
        width: "100%",
        background: "rgba(255, 255, 255, 0.72)",
        borderBottom: "1px solid rgba(0, 0, 0, 0.06)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "10px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
        }}
      >
        <Link
          href="/dashboard"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            color: "#262626",
            fontSize: "13px",
            fontWeight: 600,
            textDecoration: "none",
            padding: "8px 14px",
            borderRadius: "999px",
            background: "#fff",
            border: "1px solid rgba(0, 0, 0, 0.08)",
            boxShadow: "0 1px 2px rgba(0, 0, 0, 0.04)",
          }}
        >
          <ArrowLeft style={{ width: "14px", height: "14px" }} />
          Return to AIH
        </Link>

        <span style={{ fontSize: "12px", color: "#737373", fontWeight: 500 }}>
          Logged in as{" "}
          <span style={{ color: "#262626" }}>
            {user.firstName} {user.lastName}
          </span>
        </span>
      </div>
    </div>
  );
}
