// app/(app)/admin/markets/page.tsx

import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const isAdmin = (role: string) => role === "founder" || role === "admin";

const card = {
  background: "white",
  borderRadius: "16px",
  border: "1px solid #ece9e3",
  boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
};

export default async function AdminMarketsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isAdmin(user.role)) redirect("/dashboard");

  return (
    <div style={{ padding: "28px 20px 60px", maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 6px" }}>Markets</h1>
      <p style={{ fontSize: 13, color: "#78716c", margin: "0 0 24px", lineHeight: 1.55 }}>
        Operator market intelligence and outreach planning tools.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Link
          href="/admin/markets/sola"
          style={{
            ...card,
            display: "block",
            padding: "18px 20px",
            textDecoration: "none",
            color: "inherit",
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 800, color: "#1c1917", marginBottom: 4 }}>
            Sola Salon Studios
          </div>
          <p style={{ fontSize: 12, color: "#78716c", margin: 0, lineHeight: 1.5 }}>
            Suite-directory resolver import, manual review states, and reviewed-target export for
            Colorado Sola harvests.
          </p>
        </Link>
      </div>
    </div>
  );
}
