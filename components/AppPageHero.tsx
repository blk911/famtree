"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Pencil } from "lucide-react";

type HeroUser = {
  firstName: string;
  lastName: string;
  photoUrl: string | null;
};

const HERO_COPY: Array<{ match: (path: string) => boolean; title: string; subtitle: string }> = [
  { match: (path) => path === "/admin", title: "Admin", subtitle: "AMIHUMAN.NET control center" },
  { match: (path) => path === "/dashboard", title: "Dashboard", subtitle: "Your family activity at a glance" },
  { match: (path) => path === "/family-vault/posts", title: "Open Feed", subtitle: "Posts from you and your family network" },
  { match: (path) => path === "/family-vault/private", title: "Private Feed", subtitle: "Trust Unit conversations restricted to each TU" },
  { match: (path) => path === "/profile", title: "My Posts", subtitle: "Your profile, photos, and timeline" },
  { match: (path) => path.startsWith("/profile/"), title: "Member Profile", subtitle: "View this family member's profile" },
  { match: (path) => path === "/tree", title: "Family Tree", subtitle: "Your invite tree and Trust Units" },
  { match: (path) => path === "/invite", title: "Invite", subtitle: "Invite someone you love into the tree" },
  { match: (path) => path === "/settings", title: "Settings", subtitle: "Manage your account and privacy preferences" },
];

function initials(user: HeroUser) {
  return `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase();
}

export function AppPageHero({ user, coverUrl }: { user: HeroUser; coverUrl: string | null }) {
  const pathname = usePathname();
  const copy = HERO_COPY.find((item) => item.match(pathname)) ?? {
    title: "AMIHUMAN.NET",
    subtitle: "Private family network",
  };

  return (
    <section
      style={{
        position:"relative",
        minHeight:"150px",
        borderRadius:"24px",
        overflow:"hidden",
        marginBottom:"30px",
        border:"1px solid rgba(255,255,255,0.55)",
        boxShadow:"0 18px 40px rgba(28,25,23,0.10)",
        background:coverUrl
          ? `linear-gradient(90deg,rgba(15,23,42,0.74),rgba(15,23,42,0.28)), url(${coverUrl}) center/cover`
          : "linear-gradient(135deg,#1a1a2e 0%,#16213e 55%,#0f3460 100%)",
      }}
    >
      <div
        style={{
          position:"absolute",
          inset:0,
          background:"radial-gradient(circle at 84% 18%,rgba(244,162,97,0.42),transparent 28%), radial-gradient(circle at 10% 90%,rgba(233,108,80,0.28),transparent 34%)",
        }}
      />

      <div className="app-hero-inner" style={{position:"relative",zIndex:1,padding:"28px 30px",display:"flex",alignItems:"flex-end",justifyContent:"space-between",gap:"20px",minHeight:"150px"}}>
        <div>
          <p style={{fontSize:"11px",fontWeight:900,letterSpacing:"0.16em",textTransform:"uppercase",color:"rgba(255,255,255,0.72)",marginBottom:"8px"}}>
            AMIHUMAN.NET
          </p>
          <h1 className="app-hero-title" style={{fontSize:"32px",fontWeight:900,letterSpacing:"-0.7px",color:"white",margin:0,textShadow:"0 2px 18px rgba(0,0,0,0.22)"}}>
            {copy.title}
          </h1>
          <p className="app-hero-subtitle" style={{fontSize:"14px",color:"rgba(255,255,255,0.82)",marginTop:"6px",maxWidth:"520px"}}>
            {copy.subtitle}
          </p>
        </div>

        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"8px",flexShrink:0}}>
          {/* Avatar */}
          <div style={{position:"relative"}}>
            <div className="app-hero-avatar-wrap" style={{width:"70px",height:"70px",borderRadius:"50%",overflow:"hidden",background:"rgba(255,255,255,0.24)",border:"3px solid rgba(255,255,255,0.78)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 10px 26px rgba(0,0,0,0.20)"}}>
              {user.photoUrl ? (
                <img src={user.photoUrl} alt={`${user.firstName} ${user.lastName}`} style={{width:"100%",height:"100%",objectFit:"cover"}} />
              ) : (
                <span style={{color:"white",fontWeight:900,fontSize:"20px"}}>{initials(user)}</span>
              )}
            </div>
            {/* Edit icon */}
            <Link href="/settings" title="Edit profile" style={{
              position:"absolute", bottom:0, right:0,
              width:"22px", height:"22px", borderRadius:"50%",
              background:"white", display:"flex", alignItems:"center", justifyContent:"center",
              boxShadow:"0 2px 8px rgba(0,0,0,0.25)", textDecoration:"none",
            }}>
              <Pencil style={{width:"11px",height:"11px",color:"#1c1917"}} />
            </Link>
          </div>
          {/* Name */}
          <span className="app-hero-name" style={{fontSize:"12px",fontWeight:800,color:"white",textShadow:"0 1px 10px rgba(0,0,0,0.28)"}}>
            {user.firstName} {user.lastName}
          </span>
        </div>
      </div>
    </section>
  );
}

