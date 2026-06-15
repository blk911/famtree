import type { ReactNode } from "react";
import { AdminWorkspaceShell } from "@/components/admin/workspaces/AdminWorkspaceShell";
import { requireAdminPage } from "@/lib/admin/require-admin-page";

type Props = {
  children: ReactNode;
};

export default async function AdminPlatformLayout({ children }: Props) {
  await requireAdminPage();
  return <AdminWorkspaceShell>{children}</AdminWorkspaceShell>;
}
