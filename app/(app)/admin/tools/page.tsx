// app/(app)/admin/tools/page.tsx — founder/admin: ops catalog + runtime foundation snapshot
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { getRuntimeFoundationSnapshot } from "@/lib/admin/foundationSnapshot";
import { ADMIN_SCRIPT_OPS, ADMIN_TOOL_OPS } from "@/lib/admin/opsCatalog";
import { AdminToolsFoundation } from "@/components/admin/AdminToolsFoundation";

const card = {
  background: "white",
  borderRadius: "16px",
  border: "1px solid #ece9e3",
  overflow: "hidden" as const,
  boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
};

const isAdmin = (role: string) => role === "founder" || role === "admin";

export default async function AdminToolsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isAdmin(user.role)) redirect("/dashboard");

  const [snapshot, userCount, inviteCount, pendingInvites] = await Promise.all([
    Promise.resolve(getRuntimeFoundationSnapshot()),
    prisma.user.count(),
    prisma.invite.count(),
    prisma.invite.count({ where: { status: "PENDING" } }),
  ]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
      <div
        style={{
          ...card,
          padding: "18px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
          flexWrap: "wrap",
          background: "linear-gradient(135deg,#f0f9ff,#eef2ff)",
        }}
      >
        <div>
          <p style={{ fontSize: "11px", fontWeight: 700, color: "#0369a1", marginBottom: "4px", letterSpacing: "0.06em" }}>
            ADMIN · SETTINGS
          </p>
          <h1 style={{ margin: 0, fontSize: "20px", fontWeight: 800, color: "#0f1729" }}>Tools / Scripts / Services</h1>
          <p style={{ margin: "6px 0 0", fontSize: "13px", color: "#57534e", maxWidth: "520px", lineHeight: 1.45 }}>
            Foundation visibility for the next admin — versions, DB fingerprint, and where bond/TU maintenance scripts live.
          </p>
        </div>
        <Link
          href="/admin"
          style={{
            padding: "10px 16px",
            background: "#0f1729",
            color: "white",
            borderRadius: "10px",
            fontSize: "13px",
            fontWeight: 700,
            textDecoration: "none",
            whiteSpace: "nowrap",
          }}
        >
          ← Admin home
        </Link>
      </div>

      <AdminToolsFoundation
        snapshot={snapshot}
        userCount={userCount}
        inviteCount={inviteCount}
        pendingInvites={pendingInvites}
        scriptOps={ADMIN_SCRIPT_OPS}
        toolOps={ADMIN_TOOL_OPS}
      />
    </div>
  );
}
