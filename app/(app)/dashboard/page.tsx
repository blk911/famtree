// app/(app)/dashboard/page.tsx
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getPendingTrustRequests } from "@/lib/trust";
import { TrustRequestsPanel } from "@/components/dashboard/TrustRequestsPanel";
import { ProfileCompletionPrompt } from "@/components/dashboard/ProfileCompletionPrompt";

const card = {
  background:"white", borderRadius:"16px",
  border:"1px solid #ece9e3", overflow:"hidden",
  boxShadow:"0 1px 4px rgba(0,0,0,0.05)",
};

const statCard = (color: string) => ({
  ...card,
  padding:"24px", cursor:"pointer",
  borderTop:`4px solid ${color}`,
  textDecoration:"none", display:"block",
  transition:"transform 0.15s, box-shadow 0.15s",
});

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  if (user.role === "founder" || user.role === "admin") redirect("/admin");

  const [totalMembers, myInvites, trustRequests, promptRows] = await Promise.all([
    prisma.user.count(),
    prisma.invite.findMany({ where:{ senderId:user.id }, orderBy:{ createdAt:"desc" }, take:6 }),
    getPendingTrustRequests(user.id),
    prisma.$queryRaw<Array<{
      dashboardProfilePromptDismissedAt: Date | null;
      dashboardProfilePromptSeenCount: number;
    }>>`
      SELECT "dashboardProfilePromptDismissedAt", "dashboardProfilePromptSeenCount"
      FROM "profiles"
      WHERE "userId" = ${user.id}
      LIMIT 1
    `,
  ]);

  const serializedTrustRequests = trustRequests.map((request: any) => ({
    id: request.id,
    createdBy: request.createdBy,
    members: request.members.map((member: any) => member.user),
  }));

  const pendingInvites  = myInvites.filter(i => i.status === "PENDING").length;
  const acceptedInvites = myInvites.filter(i => i.status === "ACCEPTED").length;
  const missingProfilePhoto = !user.photoUrl;
  const promptState = promptRows[0];
  const showProfilePrompt = missingProfilePhoto
    && !promptState?.dashboardProfilePromptDismissedAt
    && (promptState?.dashboardProfilePromptSeenCount ?? 0) < 3;

  if (showProfilePrompt) {
    await prisma.$executeRaw`
      UPDATE "profiles"
      SET "dashboardProfilePromptSeenCount" = "dashboardProfilePromptSeenCount" + 1,
          "updatedAt" = now()
      WHERE "userId" = ${user.id}
    `;
  }

  const STATUS_COLOR: Record<string,string> = {
    PENDING:"#f59e0b", ACCEPTED:"#10b981", EXPIRED:"#ef4444", CANCELLED:"#9ca3af",
  };
  const STATUS_BG: Record<string,string> = {
    PENDING:"#fef3c7", ACCEPTED:"#d1fae5", EXPIRED:"#fee2e2", CANCELLED:"#f3f4f6",
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"28px" }}>
      {/* Profile completion banner */}
      {showProfilePrompt && <ProfileCompletionPrompt />}

      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"16px" }}>
        {[
          { label:"Tree members",   value:totalMembers,    color:"#6366f1", href:"/tree",    icon:"👨‍👩‍👧‍👦" },
          { label:"Invites sent",   value:myInvites.length, color:"#f59e0b", href:"/invite",  icon:"✉️" },
          { label:"Joined via you", value:acceptedInvites,  color:"#10b981", href:"/invite",  icon:"🌱" },
        ].map(({ label, value, color, href, icon }) => (
          <Link key={label} href={href} style={statCard(color)}>
            <div style={{ fontSize:"28px", marginBottom:"8px" }}>{icon}</div>
            <div style={{ fontSize:"32px", fontWeight:700, color:"#1c1917", lineHeight:1 }}>{value}</div>
            <div style={{ fontSize:"14px", color:"#78716c", marginTop:"6px" }}>{label}</div>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div>
        <h2 style={{ fontSize:"17px", fontWeight:700, color:"#1c1917", marginBottom:"14px" }}>
          Quick actions
        </h2>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"14px" }}>
          <Link href="/invite" style={{
            ...card, padding:"20px 22px", textDecoration:"none",
            display:"flex", alignItems:"center", gap:"16px",
          }}>
            <div style={{
              width:"48px", height:"48px", borderRadius:"14px",
              background:"linear-gradient(135deg,#1a1a2e,#0f3460)",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:"22px", flexShrink:0,
            }}>✉️</div>
            <div>
              <p style={{ fontWeight:600, color:"#1c1917", fontSize:"16px" }}>Invite someone</p>
              <p style={{ color:"#a8a29e", fontSize:"13px", marginTop:"2px" }}>Send a photo invite</p>
            </div>
          </Link>
          <Link href="/settings" style={{
            ...card, padding:"20px 22px", textDecoration:"none",
            display:"flex", alignItems:"center", gap:"16px",
          }}>
            <div style={{
              width:"48px", height:"48px", borderRadius:"14px",
              background:"linear-gradient(135deg,#e96c50,#f4a261)",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:"22px", flexShrink:0,
            }}>👤</div>
            <div>
              <p style={{ fontWeight:600, color:"#1c1917", fontSize:"16px" }}>Update profile</p>
              <p style={{ color:"#a8a29e", fontSize:"13px", marginTop:"2px" }}>Bio, photos, timeline</p>
            </div>
          </Link>
        </div>
      </div>

      <TrustRequestsPanel requests={serializedTrustRequests} currentUserId={user.id} />

      {/* Recent invites */}
      {myInvites.length > 0 && (
        <div>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"14px" }}>
            <h2 style={{ fontSize:"17px", fontWeight:700, color:"#1c1917" }}>Recent invites</h2>
            <Link href="/invite" style={{ fontSize:"14px", color:"#6366f1", textDecoration:"none", fontWeight:500 }}>
              View all →
            </Link>
          </div>
          <div style={{ ...card, overflow:"hidden" }}>
            {myInvites.map((inv, i) => (
              <div key={inv.id} style={{
                display:"flex", alignItems:"center", justifyContent:"space-between",
                padding:"14px 20px",
                borderBottom: i < myInvites.length - 1 ? "1px solid #f5f4f0" : "none",
              }}>
                <div>
                  <span style={{ fontSize:"15px", fontWeight:500, color:"#1c1917" }}>
                    {inv.recipientEmail}
                  </span>
                  <span style={{ fontSize:"12px", color:"#a8a29e", marginLeft:"10px" }}>
                    {new Date(inv.createdAt).toLocaleDateString("en-US",{ month:"short", day:"numeric" })}
                  </span>
                </div>
                <span style={{
                  display:"inline-flex", alignItems:"center",
                  padding:"4px 12px", borderRadius:"999px",
                  fontSize:"12px", fontWeight:600,
                  color: STATUS_COLOR[inv.status] ?? "#78716c",
                  background: STATUS_BG[inv.status] ?? "#f5f5f4",
                }}>
                  {inv.status.charAt(0) + inv.status.slice(1).toLowerCase()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
