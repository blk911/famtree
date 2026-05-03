// app/(app)/layout.tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session-cookie";
import { AppShell } from "@/components/AppShell";
import { prisma } from "@/lib/db/prisma";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    if (cookies().get(SESSION_COOKIE_NAME)?.value) {
      redirect("/api/auth/clear-stale-session");
    }
    redirect("/login");
  }

  let coverUrl: string | null = null;
  try {
    const profile = await prisma.profile.findUnique({
      where: { userId: user.id },
      select: { coverUrl: true },
    });
    coverUrl = profile?.coverUrl ?? null;
  } catch (err) {
    console.error("[AppLayout] profile lookup failed", err);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f8f7f4" }}>
      <AppShell user={user} coverUrl={coverUrl}>
        {children}
      </AppShell>
    </div>
  );
}
