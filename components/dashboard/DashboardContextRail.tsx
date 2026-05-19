"use client";

import Link from "next/link";
import { ContextRailCard } from "./ContextRailCard";
import type { FlatNode } from "@/components/TreeList";
import { ThreadSelectorRow } from "@/components/vault/ThreadSelectorRow";
import { ThreadSelectorList } from "@/components/vault/ThreadSelectorList";
import { useDashboardPrivateThreads } from "@/components/vault/DashboardPrivateThreadsContext";
import { VaultInlineError } from "@/components/vault/VaultInlineError";
import { conversationLabel } from "@/lib/msg-vault/display";
import { MsgConversationKind } from "@/types/msg-vault";

interface TrustUnit {
  id: string;
  members: {
    user: { id: string; firstName: string; lastName: string; photoUrl: string | null };
  }[];
}

type BondPeer = {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
};

interface Props {
  flat: FlatNode[];
  totalMembers: number;
  trustUnits: TrustUnit[];
  bondPeers: BondPeer[];
  currentUserId: string;
}

export function DashboardContextRail({
  flat,
  totalMembers,
  trustUnits,
  bondPeers,
  currentUserId,
}: Props) {
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

  const vaultConversationCount = directConversations.length + threadConversations.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <ContextRailCard title="Private Threads" count={vaultConversationCount} href="/msg-vault">
        {error ? (
          <VaultInlineError message={error} onRetry={() => void refreshConversations()} />
        ) : null}
        {loading ? (
          <p style={{ fontSize: 12, color: "#a8a29e", margin: 0 }}>Loading conversations…</p>
        ) : vaultConversationCount === 0 ? (
          <p style={{ fontSize: 12, color: "#78716c", margin: 0, lineHeight: 1.45 }}>
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
      </ContextRailCard>

      <ContextRailCard title="Family Tree" count={totalMembers} href="/tree">
        {flat.length === 0 ? (
          <p style={{ fontSize: 12, color: "#a8a29e", margin: 0 }}>
            No members yet — invite your family!
          </p>
        ) : (
          <ThreadSelectorList>
            {treePreview.map((node) => {
              const isSelf = node.member.id === currentUserId;
              return (
                <ThreadSelectorRow
                  key={node.member.id}
                  label={`${node.member.firstName} ${node.member.lastName}`}
                  firstName={node.member.firstName}
                  lastName={node.member.lastName}
                  photoUrl={node.member.photoUrl}
                  active={isDirectPeerActive(node.member.id)}
                  disabled={isSelf}
                  unread={0}
                  onClick={() => void openDirectPeer(node.member.id)}
                  title={
                    isSelf
                      ? "This is you"
                      : `Open private thread with ${node.member.firstName} ${node.member.lastName}`
                  }
                />
              );
            })}
            {extraBondPeers.map((peer) => (
              <ThreadSelectorRow
                key={peer.id}
                label={`${peer.firstName} ${peer.lastName}`}
                firstName={peer.firstName}
                lastName={peer.lastName}
                photoUrl={peer.photoUrl}
                active={isDirectPeerActive(peer.id)}
                unread={0}
                onClick={() => void openDirectPeer(peer.id)}
                title={`Open private thread with ${peer.firstName} ${peer.lastName}`}
              />
            ))}
          </ThreadSelectorList>
        )}
        {flat.length > 5 && (
          <Link
            href="/tree"
            style={{
              fontSize: 11,
              color: "#6366f1",
              fontWeight: 600,
              textDecoration: "none",
              marginTop: 8,
              display: "inline-block",
            }}
          >
            +{flat.length - 5} more →
          </Link>
        )}
      </ContextRailCard>

      {trustUnits.length > 0 && (
        <ContextRailCard title="Trust Units" count={trustUnits.length} href="/tree">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {trustUnits.slice(0, 4).map((unit) => {
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
                  {unit.members.map((m) => {
                    const isSelf = m.user.id === currentUserId;
                    return (
                      <ThreadSelectorRow
                        key={m.user.id}
                        label={`${m.user.firstName} ${m.user.lastName}`}
                        firstName={m.user.firstName}
                        lastName={m.user.lastName}
                        photoUrl={m.user.photoUrl}
                        active={isDirectPeerActive(m.user.id)}
                        disabled={isSelf}
                        unread={0}
                        onClick={() => void openDirectPeer(m.user.id)}
                        title={
                          isSelf
                            ? "This is you"
                            : `Direct message ${m.user.firstName} ${m.user.lastName}`
                        }
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
        </ContextRailCard>
      )}

      <ContextRailCard title="Msg Vault" href="/msg-vault">
        <p style={{ fontSize: 12, color: "#78716c", margin: 0, lineHeight: 1.45 }}>
          Governed chats and threads with relationship checks.
        </p>
      </ContextRailCard>
    </div>
  );
}
