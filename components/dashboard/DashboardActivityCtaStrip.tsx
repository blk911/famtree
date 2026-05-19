"use client";

import type { ElementType } from "react";
import { useRouter } from "next/navigation";
import { Lock, Mail, ShieldCheck, Users } from "lucide-react";
import type { DashboardTabId } from "@/components/dashboard/DashboardVaultTabs";

export type DashboardCtaTarget = DashboardTabId | "msg-vault";

export interface DashboardActivitySignals {
  newPostsCount: number;
  privateThreadsCount: number;
  pendingInvitesCount: number;
  vaultNotificationCount: number;
}

interface Props extends DashboardActivitySignals {
  activeTab: DashboardTabId;
  onSelectTab: (tab: DashboardTabId) => void;
}

type CardConfig = {
  target: DashboardCtaTarget;
  label: string;
  Icon: ElementType;
  status: string;
  action: string;
  urgent: boolean;
};

function buildCards(signals: DashboardActivitySignals): CardConfig[] {
  const {
    newPostsCount,
    privateThreadsCount,
    pendingInvitesCount,
    vaultNotificationCount,
  } = signals;

  return [
    {
      target: "posts",
      label: "Posts",
      Icon: Users,
      status: newPostsCount > 0 ? `${newPostsCount} new` : "All caught up",
      action: "See network activity",
      urgent: newPostsCount > 0,
    },
    {
      target: "pvt-feeds",
      label: "Private Threads",
      Icon: Lock,
      status: privateThreadsCount > 0 ? `${privateThreadsCount} new` : "All clear",
      action: "Open trusted conversations",
      urgent: privateThreadsCount > 0,
    },
    {
      target: "invites",
      label: "Invites",
      Icon: Mail,
      status: pendingInvitesCount > 0 ? `${pendingInvitesCount} pending` : "No pending",
      action: "Review invite activity",
      urgent: pendingInvitesCount > 0,
    },
    {
      target: "msg-vault",
      label: "Msg Vault",
      Icon: ShieldCheck,
      status: vaultNotificationCount > 0 ? "Needs review" : "All clear",
      action:
        vaultNotificationCount > 0 ? "Check governance notices" : "Open governed messages",
      urgent: vaultNotificationCount > 0,
    },
  ];
}

export function DashboardActivityCtaStrip({
  activeTab,
  onSelectTab,
  ...signals
}: Props) {
  const router = useRouter();
  const cards = buildCards(signals);

  function handleSelect(target: DashboardCtaTarget) {
    if (target === "msg-vault") {
      router.push("/msg-vault");
      return;
    }
    onSelectTab(target);
  }

  return (
    <div className="dashboard-activity-cta-grid" role="group" aria-label="Dashboard activity">
      {cards.map(({ target, label, Icon, status, action, urgent }) => {
        const isActive = target !== "msg-vault" && activeTab === target;
        return (
          <button
            key={target}
            type="button"
            onClick={() => handleSelect(target)}
            className={`dashboard-activity-cta${urgent ? " dashboard-activity-cta--urgent" : ""}${
              isActive ? " dashboard-activity-cta--active" : ""
            }`}
            aria-current={isActive ? "true" : undefined}
          >
            <span className="dashboard-activity-cta__icon" aria-hidden>
              <Icon style={{ width: 16, height: 16 }} />
            </span>
            <span className="dashboard-activity-cta__label">{label}</span>
            <span
              className={`dashboard-activity-cta__status${
                urgent ? " dashboard-activity-cta__status--urgent" : ""
              }`}
            >
              {status}
            </span>
            <span className="dashboard-activity-cta__action">{action}</span>
          </button>
        );
      })}
    </div>
  );
}
