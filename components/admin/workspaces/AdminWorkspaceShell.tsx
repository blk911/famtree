import type { ReactNode } from "react";
import { AdminWorkspaceNav } from "@/components/admin/workspaces/AdminWorkspaceNav";

type Props = {
  children: ReactNode;
};

/** Canonical shell for platform admin workspaces — single width, padding, and nav chrome. */
export function AdminWorkspaceShell({ children }: Props) {
  return (
    <div className="vmb-admin-workspace">
      <header className="vmb-admin-workspace__chrome">
        <p className="vmb-admin-workspace__kicker">AIH Platform Admin</p>
        <AdminWorkspaceNav />
      </header>
      <div className="vmb-admin-workspace__body">{children}</div>
    </div>
  );
}
