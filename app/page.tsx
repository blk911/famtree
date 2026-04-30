import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { HomeClient } from "@/components/HomeClient";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (user) redirect(user.role === "founder" || user.role === "admin" ? "/admin" : "/dashboard");

  return <HomeClient />;
}
