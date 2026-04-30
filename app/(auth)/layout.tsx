// app/(auth)/layout.tsx

import Link from "next/link";
import { TreePine } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        backgroundImage: "url('/uploads/index-bg3.webp')",
        backgroundSize: "cover",
        backgroundPosition: "center center",
        position: "relative",
      }}
    >
      {/* Overlay */}
      <div style={{ position:"absolute", inset:0, background:"linear-gradient(160deg,rgba(4,6,28,0.55) 0%,rgba(10,8,40,0.38) 50%,rgba(4,6,28,0.62) 100%)", zIndex:0 }} />

      {/* Nav */}
      <nav style={{ position:"relative", zIndex:1, display:"flex", alignItems:"center", justifyContent:"center", padding:"20px 24px", borderBottom:"1px solid rgba(255,255,255,0.1)" }}>
        <Link href="/" style={{ display:"flex", alignItems:"center", gap:"9px", textDecoration:"none" }}>
          <div style={{ width:34, height:34, borderRadius:"10px", background:"rgba(255,255,255,0.15)", border:"1px solid rgba(255,255,255,0.3)", backdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <TreePine style={{ width:18, height:18, color:"white" }} />
          </div>
          <span style={{ fontSize:"17px", fontWeight:800, color:"white", letterSpacing:"-0.3px" }}>AMIHUMAN.NET</span>
        </Link>
      </nav>

      {/* Centered card */}
      <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", padding:"24px", position:"relative", zIndex:1 }}>
        <div style={{ width:"100%", maxWidth:"460px", background:"rgba(255,255,255,0.97)", borderRadius:"22px", boxShadow:"0 24px 64px rgba(0,0,0,0.35)", backdropFilter:"blur(12px)" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

