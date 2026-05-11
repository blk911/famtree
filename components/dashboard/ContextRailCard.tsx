import Link from "next/link";
import type { ReactNode } from "react";

interface Props {
  title:    string;
  count?:   number;
  href?:    string;
  children: ReactNode;
}

export function ContextRailCard({ title, count, href, children }: Props) {
  return (
    <div style={{
      background:"#fff", borderRadius:14,
      border:"1px solid #ece9e3", padding:"14px 16px",
      boxShadow:"0 1px 3px rgba(0,0,0,0.04)",
    }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
        <span style={{
          fontSize:11, fontWeight:700, color:"#78716c",
          letterSpacing:"0.06em", textTransform:"uppercase",
        }}>
          {title}
        </span>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          {count !== undefined && (
            <span style={{
              fontSize:11, fontWeight:700, color:"#78716c",
              background:"#f5f4f0", borderRadius:999, padding:"1px 7px",
            }}>
              {count}
            </span>
          )}
          {href && (
            <Link href={href} style={{ fontSize:11, color:"#6366f1", fontWeight:600, textDecoration:"none" }}>
              View →
            </Link>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}
