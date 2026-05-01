// app/(app)/layout.tsx
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { prisma } from "@/lib/db/prisma";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const profile = await prisma.profile.findUnique({
    where: { userId: user.id },
    select: { coverUrl: true },
  });

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f8f7f4" }}>
      <AppShell user={user} coverUrl={profile?.coverUrl ?? null}>
        {children}
      </AppShell>
    </div>
  );
}
