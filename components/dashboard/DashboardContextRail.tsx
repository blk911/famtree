import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { ContextRailCard } from "./ContextRailCard";
import type { FlatNode } from "@/components/TreeList";

interface TrustUnit {
  id:      string;
  members: { user: { id: string; firstName: string; lastName: string; photoUrl: string | null } }[];
}

interface Props {
  flat:         FlatNode[];
  totalMembers: number;
  trustUnits:   TrustUnit[];
}

export function DashboardContextRail({ flat, totalMembers, trustUnits }: Props) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>

      {/* Family Tree */}
      <ContextRailCard title="Family Tree" count={totalMembers} href="/tree">
        {flat.length === 0 ? (
          <p style={{ fontSize:12, color:"#a8a29e", margin:0 }}>No members yet — invite your family!</p>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {flat.slice(0, 5).map(node => (
              <div key={node.member.id} style={{ display:"flex", alignItems:"center", gap:8 }}>
                <div style={{
                  width:24, height:24, borderRadius:"50%", flexShrink:0, overflow:"hidden",
                  background:"linear-gradient(135deg,#1a1a2e,#0f3460)",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:9, fontWeight:700, color:"white",
                }}>
                  {node.member.photoUrl
                    ? <img src={node.member.photoUrl} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                    : `${node.member.firstName[0] ?? ""}${node.member.lastName[0] ?? ""}`.toUpperCase()
                  }
                </div>
                <span style={{
                  fontSize:12, color:"#1c1917", fontWeight:500,
                  overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
                }}>
                  {node.member.firstName} {node.member.lastName}
                </span>
              </div>
            ))}
            {flat.length > 5 && (
              <Link href="/tree" style={{ fontSize:11, color:"#6366f1", fontWeight:600, textDecoration:"none", marginTop:2 }}>
                +{flat.length - 5} more →
              </Link>
            )}
          </div>
        )}
      </ContextRailCard>

      {/* Trust Units */}
      {trustUnits.length > 0 && (
        <ContextRailCard title="Trust Units" count={trustUnits.length} href="/tree">
          <div style={{ display:"flex", flexDirection:"column", gap:1 }}>
            {trustUnits.slice(0, 4).map(unit => {
              const names = unit.members.slice(0, 2).map(m => m.user.firstName).join(" · ");
              const extra = unit.members.length > 2 ? ` +${unit.members.length - 2}` : "";
              return (
                <div key={unit.id} style={{
                  fontSize:12, color:"#44403c", fontWeight:500,
                  padding:"5px 0", borderTop:"1px solid #f5f4f0",
                }}>
                  🤝 {names}{extra}
                </div>
              );
            })}
          </div>
        </ContextRailCard>
      )}

      {/* Family Safe */}
      <ContextRailCard title="Family Safe">
        <Link href="/aihsafe" style={{
          display:"flex", alignItems:"center", gap:8, padding:"9px 10px", borderRadius:10,
          background:"linear-gradient(135deg,#0f3460,#16213e)",
          textDecoration:"none", color:"white",
        }}>
          <ShieldCheck style={{ width:14, height:14, flexShrink:0 }} />
          <span style={{ fontSize:12, fontWeight:600 }}>Open Family Safe →</span>
        </Link>
      </ContextRailCard>

    </div>
  );
}
