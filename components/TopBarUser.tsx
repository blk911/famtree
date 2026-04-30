"use client";

import { useRouter } from "next/navigation";
import type { User as PrismaUser } from "@prisma/client";

interface Props {
  user: PrismaUser;
}

export function TopBarUser({ user }: Props) {
  const router = useRouter();
  const initials = `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
  const isAdmin = user.role === "founder" || user.role === "admin";

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  };

  return (
    <div style={{ display:"flex", alignItems:"center", width:"100%" }}>
      {/* ── Left: avatar + name ── */}
      <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
        <div style={{
          width:"36px", height:"36px", borderRadius:"50%",
          overflow:"hidden", background:"#ece9e3",
          display:"flex", alignItems:"center", justifyContent:"center",
          border:"2px solid #e0ddd7",
        }}>
          {user.photoUrl
            ? <img src={user.photoUrl} alt={user.firstName} style={{width:"100%",height:"100%",objectFit:"cover"}} />
            : <span style={{fontSize:"13px",fontWeight:700,color:"#78716c"}}>{initials}</span>
          }
        </div>
        <span style={{fontSize:"15px",fontWeight:600,color:"#1c1917"}}>
          {isAdmin ? "ADMIN: " : ""}{user.firstName} {user.lastName}
        </span>
      </div>

      {/* ── Spacer ── */}
      <div style={{ flex:1 }} />

      {/* ── Right: logout ── */}
      <button onClick={handleLogout} style={{
        padding:"7px 10px", background:"transparent", border:"1px solid #e0ddd7",
        borderRadius:"10px", cursor:"pointer", color:"#57534e", fontSize:"13px",
        fontWeight:600,
      }}>
        Log Out
      </button>
    </div>
  );
}
