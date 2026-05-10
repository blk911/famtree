"use client";

import { SectionHeader } from "@/components/aihsafe/common/SectionHeader";

// Local mock events — replaced by real audit log API in Phase 4.
const MOCK_EVENTS = [
  { id: "e1", icon: "🛡", label: "Family Safe activated",      when: "Just now",    dim: false },
  { id: "e2", icon: "✓", label: "Guardian inbox checked",      when: "2m ago",      dim: false },
  { id: "e3", icon: "🤝", label: "Trusted space created",      when: "Today",       dim: true  },
  { id: "e4", icon: "📨", label: "Invite sent",                 when: "Yesterday",   dim: true  },
  { id: "e5", icon: "👤", label: "Member joined your space",   when: "2 days ago",  dim: true  },
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

      <div style={{ position: "relative", paddingLeft: 20 }}>
        {/* Timeline spine */}
        <div
          aria-hidden="true"
          style={{
            position:   "absolute",
            left:       7,
            top:        8,
            bottom:     8,
            width:      2,
            background: "#f0eeec",
            borderRadius: 2,
          }}
        />

        {MOCK_EVENTS.map((ev, i) => (
          <div
            key={ev.id}
            style={{
              display:       "flex",
              alignItems:    "center",
              gap:           12,
              paddingBottom: i < MOCK_EVENTS.length - 1 ? 16 : 0,
              opacity:       ev.dim ? 0.55 : 1,
            }}
          >
            {/* Node */}
            <div
              aria-hidden="true"
              style={{
                position:       "absolute",
                left:           0,
                width:          16,
                height:         16,
                borderRadius:   "50%",
                background:     "#f5f5f4",
                border:         "2px solid #e7e5e4",
                display:        "flex",
                alignItems:     "center",
                justifyContent: "center",
                fontSize:       8,
              }}
            />

            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#1c1917" }}>
                {ev.icon} {ev.label}
              </span>
            </div>
            <span style={{ fontSize: 12, color: "#a8a29e", flexShrink: 0 }}>
              {ev.when}
            </span>
          </div>
        ))}
      </div>

      <p style={{ fontSize: 11, color: "#d6d3d1", margin: "14px 0 0", textAlign: "center" }}>
        Full audit log available in Phase 4
      </p>
    </div>
  );
}
