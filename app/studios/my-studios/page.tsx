import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { STUDIOS_CARD_SHADOW, STUDIOS_INK, STUDIOS_LINE, STUDIOS_MUTED } from "@/lib/studios/visual";

export const metadata: Metadata = {
  title: "My studios — AIH Studios",
  description: "Studios you own — open your public studio pages or publish a new one.",
};

export const dynamic = "force-dynamic";

export default async function StudiosMinePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?returnTo=/studios/my-studios");
  }

  const studios = await prisma.studio.findMany({
    where: { ownerId: user.id },
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true, slug: true, updatedAt: true },
  });

  const ink = STUDIOS_INK;
  const muted = STUDIOS_MUTED;
  const line = STUDIOS_LINE;

  return (
    <div style={{ padding: "28px 20px 48px", maxWidth: "720px", margin: "0 auto" }}>
      <p style={{ fontSize: "11px", fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: muted }}>
        Member utilities
      </p>
      <h1 style={{ fontSize: "clamp(22px, 4vw, 28px)", fontWeight: 800, color: ink, margin: "6px 0 8px", letterSpacing: "-0.02em" }}>
        My studios
      </h1>
      <p style={{ fontSize: "14px", color: muted, lineHeight: 1.55, marginBottom: "20px", maxWidth: "52ch" }}>
        Published studios appear here as live pages visitors can explore after you approve access mechanics.
      </p>
      <div style={{ marginBottom: "22px" }}>
        <Link
          href="/studios/create"
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "9px 16px",
            borderRadius: "999px",
            background: ink,
            color: "#fff",
            fontSize: "13px",
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          Create another studio
        </Link>
      </div>

      {studios.length === 0 ? (
        <div
          style={{
            padding: "20px 18px",
            borderRadius: "14px",
            background: "#fff",
            border: `1px solid ${line}`,
            boxShadow: STUDIOS_CARD_SHADOW,
            fontSize: "14px",
            color: muted,
          }}
        >
          You don&apos;t have a published studio yet. Finish a draft from the builder, or start from templates.
        </div>
      ) : (
        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "10px" }}>
          {studios.map((s) => (
            <li key={s.id}>
              <Link
                href={`/studios/${encodeURIComponent(s.slug)}`}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                  padding: "14px 16px",
                  borderRadius: "12px",
                  background: "#fff",
                  border: `1px solid ${line}`,
                  boxShadow: STUDIOS_CARD_SHADOW,
                  textDecoration: "none",
                  color: ink,
                }}
              >
                <span style={{ fontSize: "14px", fontWeight: 800 }}>{s.name}</span>
                <span style={{ fontSize: "12px", color: muted }}>
                  /studios/{s.slug}
                  {" · "}
                  updated {new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(s.updatedAt)}
                </span>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "#b8956c", marginTop: "4px" }}>
                  View live studio →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
