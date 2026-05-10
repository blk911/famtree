"use client";

import { SectionHeader } from "@/components/aihsafe/common/SectionHeader";

interface SettingCard {
  icon:        string;
  title:       string;
  currentState: string;
  description: string;
  accent:      string;
}

const SETTINGS: SettingCard[] = [
  {
    icon:        "📨",
    title:       "Invite permissions",
    currentState: "Founder-only",
    description: "Only the network founder can send governed invites. Members cannot invite directly.",
    accent:      "#1e40af",
  },
  {
    icon:        "🤝",
    title:       "Space creation",
    currentState: "Guardian approval for minors",
    description: "Adults can create trusted spaces freely. Teens require guardian approval. Children cannot create spaces.",
    accent:      "#6d28d9",
  },
  {
    icon:        "👁",
    title:       "Minor visibility",
    currentState: "Protected by default",
    description: "Children and preteens are not discoverable. Only guardians and approved family members can see them.",
    accent:      "#065f46",
  },
  {
    icon:        "⏳",
    title:       "Approval posture",
    currentState: "Manual review",
    description: "All governance escalations require active guardian approval. No auto-approval is currently enabled.",
    accent:      "#92400e",
  },
];

export function FounderSettingsPreview() {
  return (
    <div
      style={{
        background:   "#fff",
        borderRadius: 16,
        border:       "1px solid #e7e5e4",
        padding:      "20px 22px",
        marginBottom: 14,
      }}
    >
      <SectionHeader
        title="Governance Settings"
        action={
          <span
            style={{
              fontSize:     11,
              fontWeight:   600,
              color:        "#a8a29e",
              background:   "#f5f5f4",
              borderRadius: 8,
              padding:      "3px 10px",
            }}
          >
            Preview · Full settings in Phase 4
          </span>
        }
      />

      <div
        style={{
          display:             "grid",
          gridTemplateColumns: "1fr 1fr",
          gap:                 10,
        }}
      >
        {SETTINGS.map(s => (
          <div
            key={s.title}
            style={{
              background:   "#fafaf9",
              borderRadius: 12,
              border:       "1px solid #e7e5e4",
              padding:      "14px 16px",
              position:     "relative",
              overflow:     "hidden",
            }}
          >
            {/* Top accent bar */}
            <div
              style={{
                position:     "absolute",
                top:          0,
                left:         0,
                right:        0,
                height:       3,
                background:   s.accent,
                opacity:      0.4,
                borderRadius: "12px 12px 0 0",
              }}
              aria-hidden="true"
            />

            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 18 }}>{s.icon}</span>
              <div style={{ fontWeight: 700, fontSize: 13, color: "#1c1917" }}>
                {s.title}
              </div>
            </div>

            <div
              style={{
                display:      "inline-flex",
                alignItems:   "center",
                background:   `${s.accent}12`,
                color:        s.accent,
                fontSize:     11,
                fontWeight:   700,
                borderRadius: 6,
                padding:      "3px 8px",
                marginBottom: 8,
              }}
            >
              {s.currentState}
            </div>

            <p style={{ fontSize: 12, color: "#78716c", margin: 0, lineHeight: 1.4 }}>
              {s.description}
            </p>
          </div>
        ))}
      </div>

      <p style={{ fontSize: 11, color: "#d6d3d1", margin: "14px 0 0", textAlign: "center" }}>
        Configurable governance controls available in Phase 4
      </p>
    </div>
  );
}
