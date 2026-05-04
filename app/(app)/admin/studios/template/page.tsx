import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Studio template (admin) — AIH Studios",
  description: "Admin pointer to canonical template — creator UI is only on /studios/start.",
};

const isAdminRole = (role: string) => role === "founder" || role === "admin";

/**
 * Intentionally does NOT embed `/studios/start` or any builder shell — avoids shipping the creator flow inside admin.
 */
export default async function AdminStudioTemplatePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isAdminRole(user.role)) redirect("/dashboard");

  return (
    <div style={{ maxWidth: 560, margin: "48px auto", padding: "0 24px" }}>
      <h1 style={{ fontSize: 26, fontWeight: 800, color: "#1c1917" }}>Studio template</h1>
      <p style={{ marginTop: 18, fontSize: 16, color: "#57534e", lineHeight: 1.65 }}>
        The Deb-style creator onboarding UI runs only at{" "}
        <Link href="/studios/start" prefetch={false} style={{ fontWeight: 700, color: "#0f172a" }}>
          /studios/start
        </Link>
        . This admin page does not mount that experience.
      </p>
      <p style={{ marginTop: 14, fontSize: 15, color: "#57534e", lineHeight: 1.65 }}>
        Canonical JSON lives in the repo:{" "}
        <code style={{ background: "#f5f5f4", padding: "3px 8px", borderRadius: 8, fontSize: 13 }}>
          lib/studio/templates/deb-dazzle-template.ts
        </code>
      </p>
      <p style={{ marginTop: 28 }}>
        <Link href="/admin/studios" prefetch={false} style={{ fontWeight: 700, color: "#0f172a" }}>
          ← Studio management
        </Link>
      </p>
    </div>
  );
}
