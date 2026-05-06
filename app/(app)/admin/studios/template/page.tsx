import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { StudioPresetLab } from "@/components/admin/StudioPresetLab";

export const metadata: Metadata = {
  title: "Studio presets (admin) — AIH Studios",
  description:
    "Neutral base + vertical presets — live embedded builder for founders/admins. Members still use /studios/start until we switch defaults.",
};

const isAdminRole = (role: string) => role === "founder" || role === "admin";

export default async function AdminStudioTemplatePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isAdminRole(user.role)) redirect("/dashboard");

  return (
    <div>
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "16px 20px 0",
          fontSize: 13,
          color: "#57534e",
          lineHeight: 1.55,
        }}
      >
        <Link href="/admin/studios" prefetch={false} style={{ fontWeight: 700, color: "#0f172a" }}>
          ← Studio management
        </Link>
        <span style={{ margin: "0 10px", color: "#d6d3d1" }}>|</span>
        <span>
          Docs:{" "}
          <code style={{ background: "#f5f5f4", padding: "2px 6px", borderRadius: 6, fontSize: 12 }}>
            docs/studio-templates.md
          </code>{" "}
          · Neutral envelope{" "}
          <code style={{ background: "#f5f5f4", padding: "2px 6px", borderRadius: 6, fontSize: 12 }}>
            lib/studio/templates/neutral-studio-template.ts
          </code>{" "}
          · Fitness envelope{" "}
          <code style={{ background: "#f5f5f4", padding: "2px 6px", borderRadius: 6, fontSize: 12 }}>
            lib/studio/templates/fitness-studio-template.ts
          </code>
        </span>
      </div>

      <StudioPresetLab />
    </div>
  );
}
