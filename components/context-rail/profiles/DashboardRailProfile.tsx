"use client";

import Link from "next/link";
import { useDashboardPrivateThreads } from "@/components/vault/DashboardPrivateThreadsContext";
import { VaultInlineError } from "@/components/vault/VaultInlineError";
import { conversationLabel } from "@/lib/msg-vault/display";
import { MsgConversationKind } from "@/types/msg-vault";
import { ThreadSelectorRow } from "@/components/vault/ThreadSelectorRow";
import { ThreadSelectorList } from "@/components/vault/ThreadSelectorList";
import { ContextRailSection } from "../ContextRailSection";
import { ContextRailMemberList } from "../ContextRailMemberList";
import { ContextRailTrustCirclesSection } from "../ContextRailTrustCirclesSection";
import {
  countDraftTrustUnits,
  getActiveTrustUnits,
} from "@/lib/trust/display";
import type { DashboardRailProps } from "../types";

export function DashboardRailProfile({
  flat,
  totalMembers,
  trustUnits,
  bondPeers,
  currentUserId,
}: DashboardRailProps) {
  const {
    directConversations,
    threadConversations,
    loading,
    error,
    activeConversationId,
    selectConversation,
    openDirectPeer,
    openTrustUnit,
    isDirectPeerActive,
    isTrustUnitActive,
    unreadForConversation,
    refreshConversations,
  } = useDashboardPrivateThreads();

  const treePreview = flat.slice(0, 5);
  const shownTreeIds = new Set(treePreview.map((n) => n.member.id));
  const extraBondPeers = bondPeers.filter(
    (p) => p.id !== currentUserId && !shownTreeIds.has(p.id),
  );
  const treeMembers = [
    ...treePreview.map((n) => ({
      id: n.member.id,
      firstName: n.member.firstName,
      lastName: n.member.lastName,
      photoUrl: n.member.photoUrl,
    })),
    ...extraBondPeers,
  ];

  const vaultConversationCount = directConversations.length + threadConversations.length;
  const activeTrustUnits = getActiveTrustUnits(trustUnits, currentUserId);
  const draftTrustCount = countDraftTrustUnits(trustUnits, currentUserId);

  return (
    <>
      <ContextRailSection title="Private Threads" count={vaultConversationCount} href="/msg-vault">
        {error ? (
          <VaultInlineError message={error} onRetry={() => void refreshConversations()} />
        ) : null}
        {loading ? (
          <p style={{ fontSize: 11, color: "#a8a29e", margin: 0 }}>Loading conversations…</p>
        ) : vaultConversationCount === 0 ? (
          <p style={{ fontSize: 11, color: "#78716c", margin: 0, lineHeight: 1.45 }}>
            No private threads yet. Start from Msg Vault or pick someone below.
          </p>
        ) : (
          <ThreadSelectorList>
            {directConversations.map((conv) => {
              const label = conversationLabel(conv, currentUserId);
              const other = conv.participants?.find((p) => p.userId !== currentUserId);
              const user = other?.user;
              return (
                <ThreadSelectorRow
                  key={conv.id}
                  label={label}
                  firstName={user?.firstName ?? label.split(" ")[0] ?? "?"}
                  lastName={user?.lastName ?? label.split(" ").slice(1).join(" ") ?? ""}
                  photoUrl={user?.photoUrl ?? null}
                  active={conv.id === activeConversationId}
                  unread={unreadForConversation(conv)}
                  onClick={() => selectConversation(conv.id)}
                  title={`Open ${label}`}
                />
              );
            })}
            {threadConversations.map((conv) => {
              const label = conversationLabel(conv, currentUserId);
              const isTu = conv.kind === MsgConversationKind.THREAD && conv.trustUnitId;
              return (
                <ThreadSelectorRow
                  key={conv.id}
                  label={isTu ? `🤝 ${label}` : label}
                  firstName={label.split(" ")[0] ?? "Thread"}
                  lastName={label.split(" ").slice(1).join(" ")}
                  photoUrl={null}
                  active={conv.id === activeConversationId}
                  unread={unreadForConversation(conv)}
                  onClick={() => selectConversation(conv.id)}
                  title={`Open ${label}`}
                />
              );
            })}
          </ThreadSelectorList>
        )}
      </ContextRailSection>

      <ContextRailSection title="Family Tree" count={totalMembers} href="/tree">
        <ContextRailMemberList
          members={treeMembers}
          currentUserId={currentUserId}
          onMemberClick={(id) => void openDirectPeer(id)}
          activeMemberId={null}
          emptyMessage="No members yet — invite your family!"
        />
        {flat.length > 5 && (
          <Link
            href="/tree"
            style={{
              fontSize: 10,
              color: "#6366f1",
              fontWeight: 600,
              textDecoration: "none",
              marginTop: 6,
              display: "inline-block",
            }}
          >
            +{flat.length - 5} more →
          </Link>
        )}
      </ContextRailSection>

      <ContextRailTrustCirclesSection
        title="Trust circles"
        href="/tree"
        activeUnits={activeTrustUnits.slice(0, 4).map((unit) => ({
          id: unit.id,
          label: unit.members.map((m) => m.user.firstName).join(" · "),
          memberCount: unit.members.length,
        }))}
        draftCount={draftTrustCount}
        rows={
          activeTrustUnits.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {activeTrustUnits.slice(0, 4).map((unit) => {
                const tuActive = isTrustUnitActive(unit.id);
                const tuLabel = unit.members.map((m) => m.user.firstName).join(" · ");
                return (
                  <div key={unit.id} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <button
                      type="button"
                      onClick={() => void openTrustUnit(unit)}
                      title="Open Trust Unit group thread"
                      className={`thread-selector-tu${tuActive ? " thread-selector-tu--active" : ""}`}
                    >
                      <span>🤝 {tuLabel}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          ) : undefined
        }
      />

      <ContextRailSection title="Msg Vault" href="/msg-vault">
        <p style={{ fontSize: 11, color: "#78716c", margin: 0, lineHeight: 1.45 }}>
          Governed chats and threads with relationship checks.
        </p>
      </ContextRailSection>
    </>
  );
}
