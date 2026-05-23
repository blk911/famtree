import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { STUDIOS_CARD_SHADOW, STUDIOS_INK, STUDIOS_LINE, STUDIOS_MUTED } from "@/lib/studios/visual";

export const metadata: Metadata = {
  title: "Studio drafts — AIH Studios",
  description: "Resume or manage your unpublished studio builder drafts.",
};

export const dynamic = "force-dynamic";

export default async function StudiosDraftsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?returnTo=/studios/drafts");
  }

  const drafts = await prisma.studioBuilderDraft.findMany({
    where: { ownerUserId: user.id, status: { in: ["draft", "reviewed"] } },
    orderBy: { updatedAt: "desc" },
    take: 40,
    select: { id: true, templateType: true, status: true, updatedAt: true, builderStep: true },
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
        Studio drafts
      </h1>
      <p style={{ fontSize: "14px", color: muted, lineHeight: 1.55, marginBottom: "20px", maxWidth: "52ch" }}>
        Drafts stay private until you publish. Continue in the builder, or start a new path from templates.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "22px" }}>
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
          New draft
        </Link>
        <Link
          href="/studios/start"
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "9px 16px",
            borderRadius: "999px",
            background: "#fff",
            border: `1px solid ${line}`,
            color: ink,
            fontSize: "13px",
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          Open editor surface
        </Link>
      </div>

      {drafts.length === 0 ? (
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
          No open drafts yet. Start the builder whenever you&apos;re ready.
        </div>
      ) : (
        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "10px" }}>
          {drafts.map((d) => (
            <li key={d.id}>
              <Link
                href={`/studios/create?draftId=${encodeURIComponent(d.id)}`}
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
                <span style={{ fontSize: "14px", fontWeight: 800 }}>{d.templateType.replace(/-/g, " ")}</span>
                <span style={{ fontSize: "12px", color: muted }}>
                  {d.status} · step {d.builderStep.replace(/_/g, " ")} · updated{" "}
                  {new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(d.updatedAt)}
                </span>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "#b8956c", marginTop: "4px" }}>
                  Continue in builder →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
