// app/(app)/admin/activity/page.tsx
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { ActivityLogClient } from "@/components/admin/ActivityLogClient";

const isAdmin = (role: string) => role === "founder" || role === "admin";

export default async function ActivityLogPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isAdmin(user.role)) redirect("/dashboard");

  const logs = await (prisma as any).activityLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"20px" }}>
      <div>
        <h1 style={{ fontSize:"20px", fontWeight:800, color:"#1c1917", margin:0 }}>Activity Log</h1>
        <p style={{ fontSize:"13px", color:"#78716c", marginTop:"4px" }}>
          Admin audit trail — last 200 actions
        </p>
      </div>
      <ActivityLogClient logs={logs} />
    </div>
  );
}
