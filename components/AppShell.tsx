"use client";
// components/AppShell.tsx

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Menu, Megaphone, X, Volume2 } from "lucide-react";
import { AppSidebar } from "@/components/AppSidebar";
import { TopBarUser } from "@/components/TopBarUser";
import { AppPageHero } from "@/components/AppPageHero";
import { SiteAnnouncementModal } from "@/components/SiteAnnouncementModal";
import type { User as PrismaUser } from "@prisma/client";

type Announcement = { id: string; title: string; body: string };
type AnnState = {
  announcement: Announcement;
  viewCount: number;
  dismissedAt: string | null;
} | null;

interface Props {
  user: PrismaUser;
  coverUrl: string | null;
  children: React.ReactNode;
}

export function AppShell({ user, coverUrl, children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [annState, setAnnState] = useState<AnnState>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalShowVoice, setModalShowVoice] = useState(false);
  const [bannerVisible, setBannerVisible] = useState(false);
  const pathname = usePathname();

  // Close drawer on nav
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // Fetch active announcement once on mount
  useEffect(() => {
    fetch("/api/announcement/current")
      .then((r) => r.json())
      .then((data) => {
        const raw = data?.announcement;
        if (!raw?.id) return;
        const announcement: Announcement = {
          id: String(raw.id),
          title: typeof raw.title === "string" ? raw.title : "",
          body: typeof raw.body === "string" ? raw.body : "",
        };
        const state: AnnState = {
          announcement,
          viewCount: data.viewCount ?? 0,
          dismissedAt: data.dismissedAt ?? null,
        };
        setAnnState(state);

        const { viewCount, dismissedAt } = state;
        if (dismissedAt || viewCount >= 2) return;

        // Login modal — fires once per browser session per announcement
        const sessionKey = `ann_shown_${announcement.id}`;
        if (!sessionStorage.getItem(sessionKey)) {
          sessionStorage.setItem(sessionKey, "1");
          // Capture BEFORE incrementing — this is what the modal needs to know
          const isFirstEverView = viewCount === 0;
          setModalShowVoice(isFirstEverView);
          // Log the view in background
          fetch(`/api/announcement/${announcement.id}/view`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
          });
          setAnnState((s) => s ? { ...s, viewCount: s.viewCount + 1 } : s);
          setTimeout(() => setModalOpen(true), 700);
        }
      })
      .catch(() => {});
  }, []); // mount only — intentionally no deps

  // Banner: show on vault pages if not dismissed and views < 2
  useEffect(() => {
    if (!annState) return;
    const { viewCount, dismissedAt } = annState;
    const onVault = pathname.startsWith("/family-vault");
    setBannerVisible(onVault && !dismissedAt && viewCount < 2);
  }, [pathname, annState]);

  const handleModalClose = () => setModalOpen(false);

  const handleDismissForever = async () => {
    if (!annState) return;
    setModalOpen(false);
    setBannerVisible(false);
    setAnnState((s) => s ? { ...s, dismissedAt: new Date().toISOString() } : s);
    fetch(`/api/announcement/${annState.announcement.id}/view`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dismiss: true }),
    });
  };

  const handleBannerDismiss = async () => {
    if (!annState) return;
    setBannerVisible(false);
    const newCount = annState.viewCount + 1;
    setAnnState((s) => s ? { ...s, viewCount: newCount } : s);
    fetch(`/api/announcement/${annState.announcement.id}/view`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
  };

  const handleBannerExpand = () => setModalOpen(true);

  const handleBannerPlayVoice = () => {
    setModalShowVoice(true);
    setModalOpen(true);
  };

  return (
    <>
      {/* Site announcement modal */}
      {modalOpen && annState && (
        <SiteAnnouncementModal
          announcement={annState.announcement}
          viewCount={annState.viewCount}
          showVoice={modalShowVoice}
          onClose={handleModalClose}
          onDismissForever={handleDismissForever}
        />
      )}

      {/* Mobile backdrop */}
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

          {/* Announcement banner — vault pages only */}
          {bannerVisible && annState && (
            <div style={{
              display: "flex", alignItems: "center", gap: "10px",
              background: "#fffbeb", border: "1px solid #fde68a",
              borderRadius: "12px", padding: "10px 14px", marginBottom: "16px",
            }}>
              <Megaphone style={{ width: 14, height: 14, color: "#d97706", flexShrink: 0 }} />

              {/* Clickable content → opens modal */}
              <button
                onClick={handleBannerExpand}
                style={{
                  flex: 1, minWidth: 0, textAlign: "left",
                  background: "none", border: "none", cursor: "pointer",
                  padding: 0, display: "flex", alignItems: "center", gap: "6px",
                }}
              >
                <span style={{
                  fontSize: "13px", fontWeight: 700, color: "#92400e",
                  whiteSpace: "nowrap", flexShrink: 0,
                }}>
                  {annState.announcement.title || "Announcement"}
                </span>
                <span style={{ fontSize: "13px", color: "#d97706", flexShrink: 0 }}>—</span>
                <span style={{
                  fontSize: "13px", color: "#78716c",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {(() => {
                    const body = annState.announcement.body ?? "";
                    return body.length > 90 ? `${body.slice(0, 90)}…` : body;
                  })()}
                </span>
                <span style={{ fontSize: "13px", color: "#b45309", flexShrink: 0 }}>→</span>
              </button>

              {/* Play voice */}
              <button
                onClick={handleBannerPlayVoice}
                title="Play voice message"
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  lineHeight: 0, padding: "2px", flexShrink: 0, color: "#d97706",
                }}
              >
                <Volume2 style={{ width: 14, height: 14 }} />
              </button>

              {/* Dismiss X */}
              <button
                onClick={handleBannerDismiss}
                title="Dismiss"
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  lineHeight: 0, padding: "2px", flexShrink: 0, color: "#b45309",
                }}
              >
                <X style={{ width: 13, height: 13 }} />
              </button>
            </div>
          )}

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
