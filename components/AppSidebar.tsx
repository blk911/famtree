"use client";
// components/AppSidebar.tsx

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  TreePine, LayoutDashboard, User, Mail,
  LogOut, Settings, ShieldCheck, ChevronDown,
} from "lucide-react";
import { useState } from "react";
import type { User as PrismaUser } from "@prisma/client";

interface Props { user: PrismaUser; }

const ADMIN_NAV = { href: "/admin",     label: "Admin",     icon: ShieldCheck };
const DASHBOARD  = { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard };
const INVITE     = { href: "/invite",    label: "Invite",    icon: Mail };
const SETTINGS   = { href: "/settings",  label: "Settings",  icon: Settings };

// Vault sub-items
const VAULT_ITEMS = [
  { href: "/family-vault/posts", label: "Open Feed" },
  { href: "/family-vault/private", label: "Private Feed" },
  { href: "/profile", label: "My Posts" },
  { href: "/tree",    label: "Family Tree" },
];

export function AppSidebar({ user }: Props) {
  const pathname = usePathname();
  const router   = useRouter();

  const vaultActive = pathname.startsWith("/family-vault") || pathname === "/profile" || pathname.startsWith("/profile/") || pathname === "/tree";
  const [vaultOpen, setVaultOpen] = useState(vaultActive);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  };

  const initials = `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();

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

  const plainLinks = user.role === "founder" || user.role === "admin"
    ? [ADMIN_NAV, DASHBOARD, INVITE, SETTINGS]
    : [DASHBOARD, INVITE, SETTINGS];

  return (
    <aside style={{
      position:"fixed", left:0, top:0, height:"100%", width:"260px",
      background:"linear-gradient(180deg,#1a1a2e 0%,#16213e 55%,#0f3460 100%)",
      display:"flex", flexDirection:"column", zIndex:40,
      boxShadow:"4px 0 24px rgba(0,0,0,0.18)",
    }}>

      {/* Brand */}
      <div style={{display:"flex",alignItems:"center",gap:"12px",padding:"16px 20px",borderBottom:"1px solid rgba(255,255,255,0.08)"}}>
        <img src="/images/amihuman-logo.png" alt="AMIHUMAN.NET" style={{height:"75px",width:"auto",display:"block",flexShrink:0}} />
        <div>
          <div style={{fontSize:"18px",fontWeight:700,color:"white",letterSpacing:"-0.3px"}}>AMIHUMAN.NET</div>
          <div style={{fontSize:"11px",color:"rgba(255,255,255,0.38)",marginTop:"1px"}}>Private family network</div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{flex:1,padding:"14px 10px",overflowY:"auto"}}>

        {/* Flat links above Vault */}
        {plainLinks.slice(0, user.role === "founder" || user.role === "admin" ? 2 : 1).map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link key={href} href={href} style={linkStyle(active)}>
              <Icon style={{width:"18px",height:"18px",flexShrink:0}} />
              {label}
            </Link>
          );
        })}

        {/* Family Vault accordion */}
        <button
          onClick={() => {
            if (!vaultActive) {
              router.push("/family-vault/posts");
              setVaultOpen(true);
              return;
            }
            setVaultOpen((v) => !v);
          }}
          style={{
            ...linkStyle(vaultActive && !vaultOpen),
            width:"100%", background: vaultActive
              ? "linear-gradient(135deg,rgba(233,108,80,0.75),rgba(244,162,97,0.55))"
              : "transparent",
            border: vaultActive ? "1px solid rgba(255,255,255,0.12)" : "1px solid transparent",
            cursor:"pointer",
          }}
        >
          <User style={{width:"18px",height:"18px",flexShrink:0}} />
          <span style={{flex:1,textAlign:"left"}}>My Vault</span>
          <ChevronDown style={{
            width:"15px",height:"15px",flexShrink:0,
            transform: vaultOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition:"transform 0.2s",
          }} />
        </button>

        {/* Sub-items */}
        {vaultOpen && (
          <div style={{marginBottom:"3px"}}>
            {VAULT_ITEMS.map(({ href, label }) => {
              const active = pathname === href || (href !== "/profile" && pathname.startsWith(href + "/"));
              return (
                <Link key={href} href={href} style={subLinkStyle(active)}>
                  <span style={{
                    width:"5px",height:"5px",borderRadius:"50%",flexShrink:0,
                    background: active ? "white" : "rgba(255,255,255,0.3)",
                  }} />
                  {label}
                </Link>
              );
            })}
          </div>
        )}

        {/* Flat links below Vault */}
        {plainLinks.slice(user.role === "founder" || user.role === "admin" ? 2 : 1).map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link key={href} href={href} style={linkStyle(active)}>
              <Icon style={{width:"18px",height:"18px",flexShrink:0}} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Logout + user footer */}
      <div style={{padding:"10px 10px 18px",borderTop:"1px solid rgba(255,255,255,0.08)"}}>
        <div style={{display:"flex",alignItems:"center",gap:"10px",padding:"10px 12px",borderRadius:"12px",background:"rgba(255,255,255,0.07)"}}>
          <div style={{width:"40px",height:"40px",borderRadius:"50%",overflow:"hidden",background:"rgba(255,255,255,0.15)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,border:"2px solid rgba(255,255,255,0.2)"}}>
            {user.photoUrl
              ? <img src={user.photoUrl} alt={user.firstName} style={{width:"100%",height:"100%",objectFit:"cover"}} />
              : <span style={{fontSize:"14px",fontWeight:700,color:"white"}}>{initials}</span>
            }
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:"14px",fontWeight:600,color:"white",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
              {user.firstName} {user.lastName}
            </div>
            <div style={{fontSize:"11px",color:"rgba(255,255,255,0.4)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
              {user.email}
            </div>
          </div>
        </div>
        <button onClick={handleLogout} style={{
          width:"100%",marginTop:"8px",padding:"10px 12px",
          background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.08)",
          borderRadius:"12px",cursor:"pointer",color:"rgba(255,255,255,0.78)",
          display:"flex",alignItems:"center",gap:"12px",fontSize:"14px",fontWeight:600,
        }}>
          <LogOut style={{width:"16px",height:"16px",flexShrink:0}} />
          Log Out
        </button>
      </div>
    </aside>
  );
}

