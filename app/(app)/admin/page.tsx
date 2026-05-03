// app/(app)/admin/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { AdminLists } from "@/components/admin/AdminLists";
import { AnnouncementComposer } from "@/components/admin/AnnouncementComposer";

const card = {
  background:"white", borderRadius:"16px",
  border:"1px solid #ece9e3", overflow:"hidden",
  boxShadow:"0 1px 4px rgba(0,0,0,0.05)",
};

const isAdmin = (role: string) => role === "founder" || role === "admin";

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isAdmin(user.role)) redirect("/dashboard");

  const [totalMembers, totalInvites, pendingInvites, waitlistCount, recentMembers, recentInvites, recentWaitlist] = await Promise.all([
    prisma.user.count(),
    prisma.invite.count(),
    prisma.invite.count({ where:{ status:"PENDING" } }),
    prisma.waitlist.count(),
    prisma.user.findMany({
      orderBy:{ createdAt:"desc" },
      take: 50,
      select:{ id:true, firstName:true, lastName:true, email:true, role:true, status:true, relationship:true, invitedById:true, createdAt:true },
    }),
    prisma.invite.findMany({
      orderBy:{ createdAt:"desc" },
      take: 50,
      select:{
        id:true, recipientEmail:true, status:true, createdAt:true, expiresAt:true, acceptedAt:true,
        sender:{ select:{ id:true, firstName:true, lastName:true } },
      },
    }),
    prisma.waitlist.findMany({
      orderBy:{ createdAt:"desc" },
      take: 10,
      select:{ id:true, firstName:true, lastName:true, email:true, phone:true, createdAt:true },
    }),
  ]);

  const stats = [
    { label:"Members", value:totalMembers, color:"#6366f1", hint:"Accounts in the family network" },
    { label:"Invites", value:totalInvites, color:"#f59e0b", hint:`${pendingInvites} pending` },
    { label:"Waitlist", value:waitlistCount, color:"#f43f5e", hint:"People waiting for an invite" },
  ];

  return (
    <div style={{display:"flex",flexDirection:"column",gap:"28px"}}>
      <div style={{...card,padding:"22px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:"18px",background:"linear-gradient(135deg,#fff7ed,#fff1f2)"}}>
        <div>
          <p style={{fontSize:"14px",fontWeight:700,color:"#9a3412",marginBottom:"4px"}}>
            Signed in as admin
          </p>
          <p style={{fontSize:"18px",fontWeight:800,color:"#0f1729"}}>
            {user.firstName} {user.lastName}
          </p>
          <p style={{fontSize:"14px",color:"#78716c",marginTop:"2px"}}>
            {user.email} · {user.role}
          </p>
        </div>
        <Link href="/profile" style={{padding:"10px 18px",background:"#0f1729",color:"white",borderRadius:"10px",fontSize:"14px",fontWeight:700,textDecoration:"none",whiteSpace:"nowrap"}}>
          View profile →
        </Link>
      </div>

      <div className="admin-stats-grid">
        {stats.map((stat) => (
          <div key={stat.label} style={{...card, padding:"12px 16px", borderLeft:`4px solid ${stat.color}`}}>
            <div style={{display:"flex",alignItems:"baseline",gap:"8px"}}>
              <span style={{fontSize:"22px",fontWeight:800,color:"#1c1917",lineHeight:1}}>{stat.value}</span>
              <span style={{fontSize:"13px",fontWeight:700,color:"#1c1917"}}>{stat.label}</span>
            </div>
            <div style={{fontSize:"12px",color:"#78716c",marginTop:"3px"}}>{stat.hint}</div>
          </div>
        ))}
      </div>

      <AnnouncementComposer />
      <AdminLists members={recentMembers} invites={recentInvites} waitlist={recentWaitlist} />
    </div>
  );
}
