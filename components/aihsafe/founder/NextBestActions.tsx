// Contextual "what to do next" cards for the Overview tab.
// Routes to sibling tabs or opens modals — never duplicates a full flow.

import { SectionHeader } from "@/components/aihsafe/common/SectionHeader";
import type { TabId }    from "@/components/aihsafe/navigation/FamilySafeTabs";
import type { FamilySafeShellMode } from "@/components/aihsafe/founder/FounderShell";

interface Props {
  shellMode:            FamilySafeShellMode;
  isGuardian:           boolean;
  pendingApprovalCount: number;
  /** familyUnits.length + mySpaces.length */
  totalSpaceCount:      number;
  trustedAdultCount:    number;
  onTabChange:          (tab: TabId) => void;
  onInvite:             () => void;
  onCreateSpace:        () => void;
  onCreateFamily:       () => void;
}

interface ActionItem {
  icon:    string;
  bg:      string;
  border:  string;
  label:   string;
  desc:    string;
  onClick: () => void;
}

export function NextBestActions({
  shellMode,
  isGuardian,
  pendingApprovalCount,
  totalSpaceCount,
  trustedAdultCount,
  onTabChange,
  onInvite,
  onCreateSpace,
  onCreateFamily,
}: Props) {
  const actions: ActionItem[] = [];

  if (shellMode === "founder") {
    if (pendingApprovalCount > 0) {
      actions.push({
        icon:   "⏳",
        bg:     "#fffbeb",
        border: "#fde68a",
        label:  `Review ${pendingApprovalCount} approval${pendingApprovalCount === 1 ? "" : "s"}`,
        desc:   "Guardian decisions are waiting",
        onClick: () => onTabChange("approvals"),
      });
    }

    if (totalSpaceCount === 0) {
      actions.push({
        icon:    "🤝",
        bg:      "#faf5ff",
        border:  "#e9d5ff",
        label:   "Create a trusted space",
        desc:    "Start a peer pod, family group, or circle",
        onClick: onCreateSpace,
      });
      actions.push({
        icon:    "🏠",
        bg:      "#eff6ff",
        border:  "#bfdbfe",
        label:   "Create a family group",
        desc:    "Your household or close relatives",
        onClick: onCreateFamily,
      });
    }

    actions.push({
      icon:    "📨",
      bg:      "#f0fdf4",
      border:  "#bbf7d0",
      label:   "Invite someone",
      desc:    "Bring trusted people into your network",
      onClick: onInvite,
    });

    if (totalSpaceCount > 0) {
      actions.push({
        icon:    "💬",
        bg:      "#f0f9ff",
        border:  "#bae6fd",
        label:   "Post a family update",
        desc:    "Share a moment with your trusted circles",
        onClick: () => onTabChange("activity"),
      });
    }

    if (trustedAdultCount === 0) {
      actions.push({
        icon:    "🛡",
        bg:      "#f0fdf4",
        border:  "#bbf7d0",
        label:   "Add a trusted adult",
        desc:    "Link a guardian to strengthen the network",
        onClick: () => onTabChange("members"),
      });
    }
  }

  if (shellMode === "member") {
    if (isGuardian && pendingApprovalCount > 0) {
      actions.push({
        icon:    "⏳",
        bg:      "#fffbeb",
        border:  "#fde68a",
        label:   `Review ${pendingApprovalCount} approval${pendingApprovalCount === 1 ? "" : "s"}`,
        desc:    "Guardian decisions are waiting",
        onClick: () => onTabChange("approvals"),
      });
    }

    actions.push({
      icon:    "💬",
      bg:      "#f0f9ff",
      border:  "#bae6fd",
      label:   "Post a family update",
      desc:    "Share a moment with your circles",
      onClick: () => onTabChange("activity"),
    });

    actions.push({
      icon:    "📨",
      bg:      "#f0fdf4",
      border:  "#bbf7d0",
      label:   "Invite someone",
      desc:    "Add someone to your trusted spaces",
      onClick: onInvite,
    });
  }

  const visible = actions.slice(0, 4);

  if (visible.length === 0) return null;

  return (
    <div
      style={{
        background:   "#fff",
        borderRadius: 16,
        border:       "1px solid #e7e5e4",
        padding:      "18px 20px",
        marginBottom: 14,
      }}
    >
      <SectionHeader title="Next Steps" />
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {visible.map((action, i) => (
          <button
            key={i}
            type="button"
            onClick={action.onClick}
            style={{
              display:      "flex",
              alignItems:   "center",
              gap:          12,
              width:        "100%",
              textAlign:    "left",
              background:   action.bg,
              border:       `1px solid ${action.border}`,
              borderRadius: 12,
              padding:      "11px 14px",
              cursor:       "pointer",
            }}
          >
            <span style={{ fontSize: 18, flexShrink: 0 }}>{action.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: "#1c1917" }}>{action.label}</div>
              <div style={{ fontSize: 11, color: "#78716c", marginTop: 2 }}>{action.desc}</div>
            </div>
            <span style={{ fontSize: 14, color: "#a8a29e", flexShrink: 0 }}>→</span>
          </button>
        ))}
      </div>
    </div>
  );
}
