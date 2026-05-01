"use client";
// components/AppShell.tsx
// Client shell: owns sidebar-open state, renders hamburger + backdrop.

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { AppSidebar } from "@/components/AppSidebar";
import { TopBarUser } from "@/components/TopBarUser";
import { AppPageHero } from "@/components/AppPageHero";
import type { User as PrismaUser } from "@prisma/client";

interface Props {
  user: PrismaUser;
  coverUrl: string | null;
  children: React.ReactNode;
}

export function AppShell({ user, coverUrl, children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Close drawer whenever route changes (nav tap on mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Mobile backdrop — taps outside close the drawer */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: "fixed", inset: 0,
            background: "rgba(0,0,0,0.52)",
            zIndex: 35,
          }}
          className="md:hidden"
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <AppSidebar user={user} open={sidebarOpen} />

      {/* Main content */}
      <main className="app-main" style={{ minHeight: "100vh", background: "#f8f7f4" }}>

        {/* Top bar */}
        <div style={{
          height: "60px", background: "white",
          borderBottom: "1px solid #ece9e3",
          display: "flex", alignItems: "center",
          padding: "0 16px", gap: "10px",
          position: "sticky", top: 0, zIndex: 30,
          boxShadow: "0 1px 8px rgba(0,0,0,0.04)",
        }}>
          {/* Hamburger — mobile only (hidden on md+) */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden"
            aria-label="Open menu"
            style={{
              padding: "7px", background: "transparent",
              border: "1px solid #e0ddd7", borderRadius: "9px",
              cursor: "pointer", flexShrink: 0, lineHeight: 0,
              color: "#57534e",
            }}
          >
            <Menu style={{ width: "18px", height: "18px" }} />
          </button>

          <TopBarUser user={user} />
        </div>

        {/* Page content */}
        <div className="app-content-pad" style={{ maxWidth: "900px", margin: "0 auto" }}>
          <AppPageHero
            user={{
              firstName: user.firstName,
              lastName: user.lastName,
              photoUrl: user.photoUrl,
            }}
            coverUrl={coverUrl}
          />
          {children}
        </div>
      </main>
    </>
  );
}
