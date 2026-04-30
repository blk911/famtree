// app/(app)/layout.tsx
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AppSidebar } from "@/components/AppSidebar";
import { TopBarUser } from "@/components/TopBarUser";
import { AppPageHero } from "@/components/AppPageHero";
import { prisma } from "@/lib/db/prisma";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const profile = await prisma.profile.findUnique({
    where: { userId: user.id },
    select: { coverUrl: true },
  });

  return (
    <div style={{ display:"flex", minHeight:"100vh", background:"#f8f7f4" }}>
      <AppSidebar user={user} />
      <main style={{ flex:1, marginLeft:"260px", minHeight:"100vh" }}>
        {/* Top bar */}
        <div style={{
          height:"60px", background:"white",
          borderBottom:"1px solid #ece9e3",
          display:"flex", alignItems:"center",
          padding:"0 32px",
          position:"sticky", top:0, zIndex:30,
          boxShadow:"0 1px 8px rgba(0,0,0,0.04)",
        }}>
          <div style={{ flex:1 }} />
          {/* // Top bar — client component handles logout */}
          <TopBarUser user={user} />
        </div>

        {/* Page content */}
        <div style={{ maxWidth:"820px", margin:"0 auto", padding:"36px 32px" }}>
          <AppPageHero
            user={{
              firstName: user.firstName,
              lastName: user.lastName,
              photoUrl: user.photoUrl,
            }}
            coverUrl={profile?.coverUrl ?? null}
          />
          {children}
        </div>
      </main>
    </div>
  );
}
