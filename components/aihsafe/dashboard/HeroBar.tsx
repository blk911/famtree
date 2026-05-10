"use client";

import { ShieldCheck } from "lucide-react";
import { CompactStat }  from "@/components/aihsafe/common/CompactStat";

interface Props {
  familyCount:   number;
  spaceCount:    number;
  pendingCount:  number;
  onPendingClick?: () => void;
}

export function HeroBar({ familyCount, spaceCount, pendingCount, onPendingClick }: Props) {
  return (
    <div
      style={{
        background:   "linear-gradient(135deg, #0f3460 0%, #16213e 100%)",
        borderRadius: 20,
        padding:      "24px 28px",
        display:      "flex",
        alignItems:   "center",
        gap:          24,
        flexWrap:     "wrap",
        marginBottom: 20,
      }}
    >
      {/* Brand */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flex: "1 1 180px" }}>
        <div
          style={{
            width:          44,
            height:         44,
            borderRadius:   14,
            background:     "rgba(255,255,255,0.12)",
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
            flexShrink:     0,
          }}
        >
          <ShieldCheck style={{ width: 22, height: 22, color: "#fff" }} />
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 18, color: "#fff", lineHeight: 1.1 }}>
            Family Safe
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", marginTop: 2 }}>
            Your family&apos;s healthy internet
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <CompactStat label="family groups" value={familyCount} />
        <CompactStat label="trusted spaces" value={spaceCount} />
        <CompactStat
          label={pendingCount === 1 ? "pending approval" : "pending approvals"}
          value={pendingCount}
          accent={pendingCount > 0 ? "#fbbf24" : "#fff"}
          onClick={pendingCount > 0 ? onPendingClick : undefined}
        />
      </div>
    </div>
  );
}
