import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import type { User } from "@prisma/client";

export function isAdminRole(role: string): boolean {
  return role === "founder" || role === "admin";
}

/** Guard for AIH admin / platform workspace pages. */
export async function requireAdminPage(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isAdminRole(user.role)) redirect("/dashboard");
  return user;
}
