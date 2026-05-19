"use client";

import { useRef } from "react";
import type { FamilySafeShellMode } from "@/components/aihsafe/roles";
import { settingsTabLabel } from "@/components/aihsafe/roles/governanceView";

// ─── Tab identifiers ──────────────────────────────────────────────────────────

export type TabId =
  | "overview"
  | "spaces"
  | "activity"
  | "members"
  | "approvals"
  | "settings";

interface Tab {
  id:    TabId;
  label: string;
}

// ─── Master tab order ─────────────────────────────────────────────────────────

const ALL_TABS: Tab[] = [
  { id: "overview",  label: "Overview"  },
  { id: "spaces",    label: "Spaces"    },
  { id: "activity",  label: "Activity"  },
  { id: "members",   label: "Members"   },
  { id: "approvals", label: "Approvals" },
  { id: "settings",  label: "Msg Rules"  },
];

// ─── Role-aware tab list ──────────────────────────────────────────────────────

export function getVisibleTabs(
  shellMode:  FamilySafeShellMode,
  isGuardian: boolean,
): Tab[] {
  let ids: TabId[];
  if (shellMode === "founder") {
    ids = ["overview", "spaces", "activity", "members", "approvals", "settings"];
  } else if (shellMode === "member" && isGuardian) {
    ids = ["overview", "spaces", "activity", "members", "approvals", "settings"];
  } else if (shellMode === "member") {
    ids = ["overview", "spaces", "activity", "members", "settings"];
  } else {
    // child / teen — visible governance, no Members or Approvals
    ids = ["spaces", "activity", "settings"];
  }
  const label = settingsTabLabel(shellMode);
  return ALL_TABS.filter((t) => ids.includes(t.id)).map((t) =>
    t.id === "settings" ? { ...t, label } : t,
  );
}

export function defaultTab(shellMode: FamilySafeShellMode): TabId {
  return shellMode === "child" ? "spaces" : "overview";
}

// ─── Tab bar component ────────────────────────────────────────────────────────

interface Props {
  tabs:        Tab[];
  activeTab:   TabId;
  onTabChange: (tab: TabId) => void;
  /** Optional numeric badge per tab id — shows an amber pill when > 0. */
  badges?:     Partial<Record<TabId, number>>;
}

export function FamilySafeTabs({ tabs, activeTab, onTabChange, badges }: Props) {
  const barRef = useRef<HTMLDivElement>(null);

  function handleKeyDown(e: React.KeyboardEvent, currentIndex: number) {
    let nextIndex = currentIndex;
    if (e.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % tabs.length;
    } else if (e.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    } else if (e.key === "Home") {
      nextIndex = 0;
    } else if (e.key === "End") {
      nextIndex = tabs.length - 1;
    } else {
      return;
    }
    e.preventDefault();
    const buttons = barRef.current?.querySelectorAll<HTMLButtonElement>("[role='tab']");
    buttons?.[nextIndex]?.focus();
    onTabChange(tabs[nextIndex].id);
  }

  return (
    <div
      ref={barRef}
      role="tablist"
      aria-label="Family Safe navigation"
      className="aihsafe-tabs-bar"
    >
      {tabs.map((tab, i) => {
        const isActive   = tab.id === activeTab;
        const badgeCount = badges?.[tab.id] ?? 0;
        return (
          <button
            key={tab.id}
            role="tab"
            id={`aihsafe-tab-${tab.id}`}
            aria-selected={isActive}
            aria-controls={`aihsafe-panel-${tab.id}`}
            tabIndex={isActive ? 0 : -1}
            className={`aihsafe-tab${isActive ? " aihsafe-tab--active" : ""}`}
            onClick={() => onTabChange(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, i)}
          >
            {tab.label}
            {badgeCount > 0 && (
              <span
                className="aihsafe-tab-badge"
                aria-label={`${badgeCount} pending`}
              >
                {badgeCount}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
