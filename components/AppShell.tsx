"use client";
// components/AppShell.tsx

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Menu, Megaphone, X, Volume2 } from "lucide-react";
import { AppSidebar } from "@/components/AppSidebar";
import { TopBarUser } from "@/components/TopBarUser";
import { AppPageHero } from "@/components/AppPageHero";
import { SiteAnnouncementModal } from "@/components/SiteAnnouncementModal";
import { IdleSessionGuard } from "@/components/IdleSessionGuard";
import {
  AppAnnouncementBanner,
  AppBannerExpandButton,
  AppBannerIconButton,
  AppContentWrap,
  AppMain,
  AppMenuButton,
  AppMobileBackdrop,
  AppTopBar,
} from "@/components/ui/app-chrome";
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
  vaultNotificationCount?: number;
}

export function AppShell({ user, coverUrl, children, vaultNotificationCount = 0 }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [annState, setAnnState] = useState<AnnState>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalShowVoice, setModalShowVoice] = useState(false);
  const [bannerVisible, setBannerVisible] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

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

        const sessionKey = `ann_shown_${announcement.id}`;
        if (!sessionStorage.getItem(sessionKey)) {
          sessionStorage.setItem(sessionKey, "1");
          const isFirstEverView = viewCount === 0;
          setModalShowVoice(isFirstEverView);
          fetch(`/api/announcement/${announcement.id}/view`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
          });
          setAnnState((s) => (s ? { ...s, viewCount: s.viewCount + 1 } : s));
          setTimeout(() => setModalOpen(true), 700);
        }
      })
      .catch(() => {});
  }, []);

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
    setAnnState((s) => (s ? { ...s, dismissedAt: new Date().toISOString() } : s));
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
    setAnnState((s) => (s ? { ...s, viewCount: newCount } : s));
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
      <IdleSessionGuard idleTimeoutMinutes={user.idleTimeoutMinutes ?? 5} />

      {modalOpen && annState && (
        <SiteAnnouncementModal
          announcement={annState.announcement}
          viewCount={annState.viewCount}
          showVoice={modalShowVoice}
          onClose={handleModalClose}
          onDismissForever={handleDismissForever}
        />
      )}

      {sidebarOpen && <AppMobileBackdrop onClick={() => setSidebarOpen(false)} />}

      <AppSidebar user={user} open={sidebarOpen} vaultNotificationCount={vaultNotificationCount} />

      <AppMain>
        <AppTopBar>
          <AppMenuButton onClick={() => setSidebarOpen(true)} aria-label="Open menu">
            <Menu className="h-[18px] w-[18px]" />
          </AppMenuButton>

          {/* Temp admin shortcut — Creator Intelligence */}
          {(user.role === "admin" || user.role === "founder") && (
            <Link
              href="/admin/studios/creator-lab"
              style={{
                marginLeft: "auto",
                marginRight: 10,
                fontSize: 12,
                fontWeight: 700,
                color: "#9d174d",
                background: "#fdf2f8",
                border: "1px solid #fbcfe8",
                borderRadius: 20,
                padding: "5px 12px",
                textDecoration: "none",
                whiteSpace: "nowrap",
                letterSpacing: "0.02em",
              }}
            >
              🧪 Creator Intelligence
            </Link>
          )}

          <TopBarUser user={user} />
        </AppTopBar>

        {pathname.startsWith("/discovery") ||
        pathname.startsWith("/admin/studios") ||
        pathname.startsWith("/admin/markets") ||
        pathname.startsWith("/admin/action-items") ? (
          // Full-bleed layout for Discovery, admin Studio tools, and market inspectors
          children
        ) : (
          <AppContentWrap className={pathname === "/invite" ? "app-content-pad--invite" : undefined}>
            {bannerVisible && annState && (
              <AppAnnouncementBanner>
                <Megaphone className="h-3.5 w-3.5 shrink-0 text-amber-600" />

                <AppBannerExpandButton onClick={handleBannerExpand}>
                  <span className="shrink-0 whitespace-nowrap text-[13px] font-bold text-amber-900">
                    {annState.announcement.title || "Announcement"}
                  </span>
                  <span className="shrink-0 text-[13px] text-amber-600">—</span>
                  <span className="overflow-hidden text-ellipsis whitespace-nowrap text-[13px] text-stone-500">
                    {(() => {
                      const body = annState.announcement.body ?? "";
                      return body.length > 90 ? `${body.slice(0, 90)}…` : body;
                    })()}
                  </span>
                  <span className="shrink-0 text-[13px] text-amber-700">→</span>
                </AppBannerExpandButton>

                <AppBannerIconButton onClick={handleBannerPlayVoice} title="Play voice message">
                  <Volume2 className="h-3.5 w-3.5" />
                </AppBannerIconButton>

                <AppBannerIconButton onClick={handleBannerDismiss} title="Dismiss">
                  <X className="h-[13px] w-[13px]" />
                </AppBannerIconButton>
              </AppAnnouncementBanner>
            )}

            <AppPageHero
              user={{
                firstName: user.firstName,
                lastName: user.lastName,
                photoUrl: user.photoUrl,
                role: user.role,
              }}
              coverUrl={coverUrl}
            />
            {children}
          </AppContentWrap>
        )}
      </AppMain>
    </>
  );
}
