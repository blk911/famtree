"use client";

import { SectionHeader }       from "@/components/aihsafe/common/SectionHeader";
import { CompactActivityItem } from "@/components/aihsafe/common/CompactActivityItem";

// Placeholder events shown when no real data is available (e.g. RelationalDashboard standalone).
// FounderShell derives real activity from live API data.
const PLACEHOLDER_EVENTS = [
  { icon: "🛡", label: "Msg Vault activated",     time: "just now",   faded: false },
  { icon: "✓",  label: "Guardian inbox checked",    time: "today",      faded: false },
  { icon: "🤝", label: "Trusted space created",     time: "recently",   faded: true  },
  { icon: "📨", label: "Invite sent",               time: "recently",   faded: true  },
];

export function ActivityFeed() {
  return (
    <div
      style={{
        background:   "#fff",
        borderRadius: 16,
        border:       "1px solid #e7e5e4",
        padding:      "20px 22px",
      }}
    >
      <SectionHeader title="Recent Activity" />

      {PLACEHOLDER_EVENTS.map((ev, i) => (
        <CompactActivityItem
          key={i}
          icon={ev.icon}
          label={ev.label}
          time={ev.time}
          faded={ev.faded}
        />
      ))}

      <p style={{ fontSize: 11, color: "#d6d3d1", margin: "14px 0 0", textAlign: "center" }}>
        Full audit log with real data available in Phase 4
      </p>
    </div>
  );
}
