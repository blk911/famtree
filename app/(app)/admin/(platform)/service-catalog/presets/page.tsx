import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function AdminServicePresetCardsPage() {
  redirect("/admin/service-catalog");
}
