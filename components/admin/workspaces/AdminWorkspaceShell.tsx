import type { ReactNode } from "react";
import { MarketIntelPageShell } from "@/components/admin/MarketIntelPageShell";
import { AdminWorkspaceNav } from "@/components/admin/workspaces/AdminWorkspaceNav";

type Props = {
  children: ReactNode;
};

/** Shared chrome for AIH platform admin workspaces (Discovery, Social, Operators, …). */
export function AdminWorkspaceShell({ children }: Props) {
  return (
    <MarketIntelPageShell>
      <div className="mb-5 space-y-2 border-b border-stone-200 pb-4">
        <p className="m-0 text-[11px] font-bold uppercase tracking-wide text-stone-500">
          AIH Platform Admin
        </p>
        <AdminWorkspaceNav />
      </div>
      {children}
    </MarketIntelPageShell>
  );
}
