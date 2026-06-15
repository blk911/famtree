"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ADMIN_WORKSPACE_NAV,
  resolveAdminWorkspaceId,
} from "@/lib/admin/workspace-routes";

export function AdminWorkspaceNav() {
  const pathname = usePathname();
  const active = resolveAdminWorkspaceId(pathname);

  return (
    <nav
      aria-label="Platform admin workspaces"
      className="flex flex-wrap gap-1 rounded-lg border border-stone-200 bg-stone-50 p-1"
    >
      {ADMIN_WORKSPACE_NAV.map(({ id, label, href, product }) => {
        const isActive = active === id;
        return (
          <Link
            key={id}
            href={href}
            className={[
              "rounded-md px-3 py-2 text-xs font-semibold no-underline transition-colors sm:text-sm",
              isActive
                ? product
                  ? "bg-violet-900 text-white shadow-sm"
                  : "bg-stone-900 text-white shadow-sm"
                : "border border-transparent bg-white text-stone-600 hover:border-stone-300 hover:text-stone-900",
            ].join(" ")}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
