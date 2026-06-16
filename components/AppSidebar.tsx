"use client";
// components/AppSidebar.tsx

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Users, Mail,
  LogOut, Settings, ChevronDown, ShieldCheck, Building2, Tv2, LineChart,
} from "lucide-react";
import { useState, useEffect } from "react";
import type { User as PrismaUser } from "@prisma/client";
import { getCurrentUserStudioHref, isStudiosPrimaryNavActive } from "@/lib/studios/getCurrentUserStudioHref";
import { formatDisplayInitials, formatDisplayName } from "@/lib/user/display-name";
import {
  SidebarFooter,
  SidebarLogoutButton,
  SidebarNav,
  SidebarShell,
  SidebarVaultBadge,
} from "@/components/ui/app-chrome";
import {
  isMarketIntelNavItemActive,
  isMarketIntelSidebarActive,
  isPlatformAdminNavItemActive,
  isPlatformAdminSidebarActive,
  isSettingsSidebarActive,
  MARKET_INTEL_SIDEBAR_ITEMS,
  PLATFORM_ADMIN_SIDEBAR_ITEMS,
  SETTINGS_ADMIN_SIDEBAR_ITEMS,
  SIDEBAR_ACCORDION_GROUPS,
} from "@/lib/admin/sidebar-nav";

interface Props { user: PrismaUser; open?: boolean; vaultNotificationCount?: number; }

const INVITE = { href: "/invite", label: "Invite", icon: Mail };

const MSG_VAULT_HREF = "/msg-vault";
const FAMILY_SAFE_HREF = "/aihsafe";

const FAMILY_ITEMS = [
  { href: "/tree", label: "My People" },
  { href: "/family-vault/family-units", label: "Units" },
];

export function AppSidebar({ user, open = false, vaultNotificationCount = 0 }: Props) {
  const pathname = usePathname();
  const router   = useRouter();

  const isAdmin = user.role === "founder" || user.role === "admin";

  const familyActive =
    pathname === "/tree" ||
    pathname.startsWith("/tree/") ||
    pathname === "/family-vault/family-units";

  const marketIntelActive = isMarketIntelSidebarActive(pathname);
  const platformAdminActive = isPlatformAdminSidebarActive(pathname);
  const settingsActive = isSettingsSidebarActive(pathname);

  const [settingsOpen, setSettingsOpen] = useState(settingsActive);
  const [marketIntelOpen, setMarketIntelOpen] = useState(marketIntelActive);
  const [platformAdminOpen, setPlatformAdminOpen] = useState(platformAdminActive);

  /** Expand Settings submenu whenever we're on Settings or any /admin route (client navigations skip useState init). */
  useEffect(() => {
    if (settingsActive) setSettingsOpen(true);
  }, [settingsActive]);

  useEffect(() => {
    if (marketIntelActive) setMarketIntelOpen(true);
  }, [marketIntelActive]);

  useEffect(() => {
    if (platformAdminActive) setPlatformAdminOpen(true);
  }, [platformAdminActive]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch {
      /* still leave the app shell */
    }
    window.location.assign("/");
  };

  const initials = formatDisplayInitials(user);

  const studiosHref = getCurrentUserStudioHref(user);

  const linkStyle = (active: boolean) => ({
    display:"flex", alignItems:"center", gap:"13px",
    padding:"11px 16px", borderRadius:"12px", marginBottom:"3px",
    fontSize:"15px", fontWeight: active ? 600 : 500,
    color: active ? "white" : "rgba(255,255,255,0.58)",
    background: active
      ? "linear-gradient(135deg,rgba(233,108,80,0.75),rgba(244,162,97,0.55))"
      : "transparent",
    border: active ? "1px solid rgba(255,255,255,0.12)" : "1px solid transparent",
    textDecoration:"none", transition:"all 0.15s",
  });

  const subLinkStyle = (active: boolean) => ({
    display:"flex", alignItems:"center", gap:"10px",
    padding:"8px 16px 8px 44px", borderRadius:"10px", marginBottom:"2px",
    fontSize:"13px", fontWeight: active ? 600 : 400,
    color: active ? "white" : "rgba(255,255,255,0.5)",
    background: active ? "rgba(255,255,255,0.10)" : "transparent",
    border: "1px solid transparent",
    textDecoration:"none", transition:"all 0.12s",
  });

  return (
    <SidebarShell open={open}>

      {/* Brand */}
      <div style={{display:"flex",alignItems:"center",gap:"12px",padding:"16px 20px",borderBottom:"1px solid rgba(255,255,255,0.08)"}}>
        <img src="/images/amihuman-logo.png" alt="AMIHUMAN.NET" style={{height:"75px",width:"auto",display:"block",flexShrink:0}} />
        <div>
          <div style={{fontSize:"18px",fontWeight:700,color:"white",letterSpacing:"-0.3px"}}>AMIHUMAN.NET</div>
          <div style={{fontSize:"11px",color:"rgba(255,255,255,0.38)",marginTop:"1px"}}>Private family network</div>
        </div>
      </div>

      {/* Navigation */}
      <SidebarNav>

        {/* Dashboard — plain link for everyone; admins go to /admin */}
        <Link
          href={isAdmin ? "/admin" : "/dashboard"}
          style={linkStyle(isAdmin ? (pathname === "/admin") : pathname === "/dashboard")}
        >
          {isAdmin
            ? <ShieldCheck style={{width:"18px",height:"18px",flexShrink:0}} />
            : <LayoutDashboard style={{width:"18px",height:"18px",flexShrink:0}} />
          }
          {isAdmin ? "Admin" : "Dashboard"}
        </Link>

        {/* My Network — My People (/tree) + Units */}
        <Link
          href="/tree"
          style={{
            ...linkStyle(familyActive),
            display: "flex",
            width: "100%",
          }}
        >
          <Users style={{ width: "18px", height: "18px", flexShrink: 0 }} />
          <span style={{ flex: 1, textAlign: "left" }}>My Network</span>
          <ChevronDown
            style={{
              width: "15px",
              height: "15px",
              flexShrink: 0,
              transform: familyActive ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.2s",
            }}
          />
        </Link>

        {familyActive && (
          <div style={{ marginBottom: "3px" }}>
            {FAMILY_ITEMS.map(({ href, label }) => {
              const active =
                pathname === href ||
                (href === "/tree" ? pathname.startsWith("/tree/") : pathname.startsWith(`${href}/`));
              return (
                <Link key={href} href={href} style={subLinkStyle(active)}>
                  <span
                    style={{
                      width: "5px",
                      height: "5px",
                      borderRadius: "50%",
                      flexShrink: 0,
                      background: active ? "white" : "rgba(255,255,255,0.3)",
                    }}
                  />
                  {label}
                </Link>
              );
            })}
          </div>
        )}

        {/* Invite — plain link */}
        <Link href={INVITE.href} style={linkStyle(pathname === INVITE.href)}>
          <Mail style={{width:"18px",height:"18px",flexShrink:0}} />
          {INVITE.label}
        </Link>

        {/* Msg Vault — governed communication */}
        <Link href={MSG_VAULT_HREF} style={linkStyle(pathname === MSG_VAULT_HREF || pathname.startsWith(`${MSG_VAULT_HREF}/`))}>
          <Mail style={{width:"18px",height:"18px",flexShrink:0}} />
          <span style={{ flex: 1, textAlign: "left" }}>Msg Vault</span>
          {vaultNotificationCount > 0 && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#ef4444",
                color: "white",
                borderRadius: 999,
                fontSize: 10,
                fontWeight: 700,
                minWidth: 18,
                height: 18,
                padding: "0 5px",
                lineHeight: 1,
                flexShrink: 0,
              }}
              aria-label={`${vaultNotificationCount} vault notifications`}
            >
              {vaultNotificationCount > 99 ? "99+" : vaultNotificationCount}
            </span>
          )}
        </Link>

        {/* Family Safe — governance & policy (separate from Msg Vault) */}
        <Link
          href={FAMILY_SAFE_HREF}
          style={linkStyle(pathname === FAMILY_SAFE_HREF || pathname.startsWith(`${FAMILY_SAFE_HREF}/`))}
        >
          <ShieldCheck style={{width:"18px",height:"18px",flexShrink:0}} />
          Family Safe
        </Link>

        {/* Discovery Channel — family-safe learning hub */}
        <Link
          href="/discovery"
          style={linkStyle(pathname === "/discovery" || pathname.startsWith("/discovery/"))}
        >
          <Tv2 style={{width:"18px",height:"18px",flexShrink:0}} />
          Discovery Channel
        </Link>

        {/* Platform Admin — discovery, social, operators, members, invites, VMB product */}
        {isAdmin ? (
          <>
            <button
              onClick={() => {
                if (!platformAdminActive) {
                  router.push(SIDEBAR_ACCORDION_GROUPS.platformAdmin.defaultHref);
                  setPlatformAdminOpen(true);
                  return;
                }
                setPlatformAdminOpen((v) => !v);
              }}
              style={{
                ...linkStyle(platformAdminActive),
                width: "100%",
                background: platformAdminActive
                  ? "linear-gradient(135deg,rgba(233,108,80,0.75),rgba(244,162,97,0.55))"
                  : "transparent",
                border: platformAdminActive ? "1px solid rgba(255,255,255,0.12)" : "1px solid transparent",
                cursor: "pointer",
              }}
            >
              <Building2 style={{ width: "18px", height: "18px", flexShrink: 0 }} />
              <span style={{ flex: 1, textAlign: "left" }}>Platform Admin</span>
              <ChevronDown
                style={{
                  width: "15px",
                  height: "15px",
                  flexShrink: 0,
                  transform: platformAdminOpen ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.2s",
                }}
              />
            </button>

            {platformAdminOpen ? (
              <div style={{ marginBottom: "3px" }}>
                {PLATFORM_ADMIN_SIDEBAR_ITEMS.map(({ href, label }) => {
                  const active = isPlatformAdminNavItemActive(pathname, href);
                  return (
                    <Link key={href} href={href} style={subLinkStyle(active)}>
                      <span
                        style={{
                          width: "5px",
                          height: "5px",
                          borderRadius: "50%",
                          flexShrink: 0,
                          background: active ? "white" : "rgba(255,255,255,0.3)",
                        }}
                      />
                      {label}
                    </Link>
                  );
                })}
              </div>
            ) : null}
          </>
        ) : null}

        {/* Market Intel — discovery, markets, action items (admin only) */}
        {isAdmin ? (
          <>
            <button
              onClick={() => {
                if (!marketIntelActive) {
                  router.push(SIDEBAR_ACCORDION_GROUPS.marketIntel.defaultHref);
                  setMarketIntelOpen(true);
                  return;
                }
                setMarketIntelOpen((v) => !v);
              }}
              style={{
                ...linkStyle(marketIntelActive),
                width: "100%",
                background: marketIntelActive
                  ? "linear-gradient(135deg,rgba(233,108,80,0.75),rgba(244,162,97,0.55))"
                  : "transparent",
                border: marketIntelActive ? "1px solid rgba(255,255,255,0.12)" : "1px solid transparent",
                cursor: "pointer",
              }}
            >
              <LineChart style={{ width: "18px", height: "18px", flexShrink: 0 }} />
              <span style={{ flex: 1, textAlign: "left" }}>Market Intel</span>
              <ChevronDown
                style={{
                  width: "15px",
                  height: "15px",
                  flexShrink: 0,
                  transform: marketIntelOpen ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.2s",
                }}
              />
            </button>

            {marketIntelOpen ? (
              <div style={{ marginBottom: "3px" }}>
                {MARKET_INTEL_SIDEBAR_ITEMS.map(({ href, label }) => {
                  const active = isMarketIntelNavItemActive(pathname, href);
                  return (
                    <Link key={href} href={href} style={subLinkStyle(active)}>
                      <span
                        style={{
                          width: "5px",
                          height: "5px",
                          borderRadius: "50%",
                          flexShrink: 0,
                          background: active ? "white" : "rgba(255,255,255,0.3)",
                        }}
                      />
                      {label}
                    </Link>
                  );
                })}
              </div>
            ) : null}
          </>
        ) : null}

        {/* Settings — accordion for admins, plain link for members */}
        {isAdmin ? (
          <>
            <button
              onClick={() => {
                if (!settingsActive) {
                  router.push("/settings");
                  setSettingsOpen(true);
                  return;
                }
                setSettingsOpen((v) => !v);
              }}
              style={{
                ...linkStyle(settingsActive),
                width:"100%",
                background: settingsActive
                  ? "linear-gradient(135deg,rgba(233,108,80,0.75),rgba(244,162,97,0.55))"
                  : "transparent",
                border: settingsActive ? "1px solid rgba(255,255,255,0.12)" : "1px solid transparent",
                cursor:"pointer",
              }}
            >
              <Settings style={{width:"18px",height:"18px",flexShrink:0}} />
              <span style={{flex:1,textAlign:"left"}}>Settings</span>
              <ChevronDown style={{
                width:"15px",height:"15px",flexShrink:0,
                transform: settingsOpen ? "rotate(180deg)" : "rotate(0deg)",
                transition:"transform 0.2s",
              }} />
            </button>

            {settingsOpen ? (
              <div style={{ marginBottom: "3px" }}>
                {SETTINGS_ADMIN_SIDEBAR_ITEMS.map(({ href, label, icon: Icon }) => {
                  const active = pathname === href || (href !== "/settings" && pathname.startsWith(`${href}/`));
                  return (
                    <Link key={href} href={href} style={subLinkStyle(active)}>
                      <span style={{
                        width:"5px",height:"5px",borderRadius:"50%",flexShrink:0,
                        background: active ? "white" : "rgba(255,255,255,0.3)",
                      }} />
                      {Icon && <Icon style={{width:"12px",height:"12px",flexShrink:0,opacity:0.7}} />}
                      {label}
                    </Link>
                  );
                })}
              </div>
            ) : null}
          </>
        ) : (
          <Link href="/settings" style={linkStyle(pathname === "/settings" || pathname.startsWith("/settings/"))}>
            <Settings style={{width:"18px",height:"18px",flexShrink:0}} />
            Settings
          </Link>
        )}

        {/* Separates core trust/network nav from AIH Studios (connected platform). */}
        <div
          role="separator"
          aria-orientation="horizontal"
          style={{
            margin:       "12px 14px 10px",
            borderTop:    "1px solid rgba(255,255,255,0.085)",
          }}
        />

        <Link href={studiosHref} style={linkStyle(isStudiosPrimaryNavActive(pathname, studiosHref))}>
          <Building2 style={{width:"18px",height:"18px",flexShrink:0}} />
          AIH Studios
        </Link>

      </SidebarNav>

      <SidebarFooter>
        <div style={{display:"flex",alignItems:"center",gap:"10px",padding:"10px 12px",borderRadius:"12px",background:"rgba(255,255,255,0.07)"}}>
          <div style={{width:"40px",height:"40px",borderRadius:"50%",overflow:"hidden",background:"rgba(255,255,255,0.15)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,border:"2px solid rgba(255,255,255,0.2)"}}>
            {user.photoUrl
              ? <img src={user.photoUrl} alt={user.firstName} style={{width:"100%",height:"100%",objectFit:"cover"}} />
              : <span style={{fontSize:"14px",fontWeight:700,color:"white"}}>{initials}</span>
            }
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:"14px",fontWeight:600,color:"white",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
              {formatDisplayName(user)}
            </div>
            <div style={{fontSize:"11px",color:"rgba(255,255,255,0.4)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
              {user.email}
            </div>
          </div>
        </div>
        <SidebarLogoutButton onClick={handleLogout}>
          <LogOut className="h-4 w-4 shrink-0" />
          Log Out
        </SidebarLogoutButton>
      </SidebarFooter>
    </SidebarShell>
  );
}
