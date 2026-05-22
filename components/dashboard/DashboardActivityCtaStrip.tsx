"use client";

import type { ElementType } from "react";
import { useRouter } from "next/navigation";
import { Lock, Mail, ShieldCheck, Users } from "lucide-react";
import type { DashboardTabId } from "@/components/dashboard/DashboardVaultTabs";
import { DASHBOARD } from "@/lib/product/communication-copy";
import {
  CtaCard,
  CtaCardAction,
  CtaCardGrid,
  CtaCardIcon,
  CtaCardLabel,
  CtaCardStatus,
} from "@/components/ui/cta-card";

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
      label: DASHBOARD.tabPosts,
      Icon: Users,
      status: newPostsCount > 0 ? `${newPostsCount} new` : "All caught up",
      action: DASHBOARD.ctaPostsAction,
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
        vaultNotificationCount > 0 ? DASHBOARD.ctaMsgVaultNotices : DASHBOARD.ctaMsgVaultAction,
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
    <CtaCardGrid role="group" aria-label="Dashboard activity">
      {cards.map(({ target, label, Icon, status, action, urgent }) => {
        const isActive = target !== "msg-vault" && activeTab === target;
        return (
          <CtaCard
            key={target}
            urgent={urgent}
            active={isActive}
            onClick={() => handleSelect(target)}
            aria-current={isActive ? "true" : undefined}
          >
            <CtaCardIcon>
              <Icon className="h-4 w-4" />
            </CtaCardIcon>
            <CtaCardLabel>{label}</CtaCardLabel>
            <CtaCardStatus urgent={urgent} active={isActive}>
              {status}
            </CtaCardStatus>
            <CtaCardAction>{action}</CtaCardAction>
          </CtaCard>
        );
      })}
    </CtaCardGrid>
  );
}
