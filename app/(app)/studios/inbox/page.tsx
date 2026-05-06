import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { ConciergeInboxClient, type InboxSession } from "@/components/concierge/ConciergeInboxClient";

export default async function StudioConciergeInboxPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const studios = await prisma.studio.findMany({
    where: { ownerId: user.id },
    select: { slug: true, name: true },
  });

  if (studios.length === 0) {
    return (
      <div style={{ padding: "40px 28px", maxWidth: "720px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 800 }}>Concierge inbox</h1>
        <p style={{ fontSize: "14px", color: "#57534e", lineHeight: 1.6 }}>
          No Postgres-linked studios on your account yet. The inbox lists live concierge threads for studio slugs you own.
        </p>
        <Link href="/studios/start" style={{ fontWeight: 700, color: "#0f172a" }}>
          Start a studio →
        </Link>
      </div>
    );
  }

  const slugs = studios.map((s) => s.slug);

  const rows = await prisma.conciergeChatSession.findMany({
    where: { contextKey: { in: slugs } },
    orderBy: { updatedAt: "desc" },
    take: 100,
    include: {
      messages: { orderBy: { createdAt: "desc" }, take: 5 },
      leads: { orderBy: { createdAt: "desc" }, take: 2 },
    },
  });

  const sessions = JSON.parse(JSON.stringify(rows)) as InboxSession[];

  return <ConciergeInboxClient studios={studios} sessions={sessions} currentUserId={user.id} />;
}
