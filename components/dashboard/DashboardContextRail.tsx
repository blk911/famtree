"use client";

import Link from "next/link";
import { ContextRailCard } from "./ContextRailCard";
import type { FlatNode } from "@/components/TreeList";
import { ThreadSelectorRow } from "@/components/vault/ThreadSelectorRow";
import { ThreadSelectorList } from "@/components/vault/ThreadSelectorList";
import { directThreadKey } from "@/lib/private-thread-keys";
import { tuThreadKey } from "@/components/dashboard/private-thread-model";

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
  activePrivateThreadKey: string | null;
  dmUnreadByPeerId: Record<string, number>;
  onSelectPrivateThread: (threadKey: string) => void;
}

export function DashboardContextRail({
  flat,
  totalMembers,
  trustUnits,
  bondPeers,
  currentUserId,
  activePrivateThreadKey,
  dmUnreadByPeerId,
  onSelectPrivateThread,
}: Props) {
  const treePreview = flat.slice(0, 5);
  const shownTreeIds = new Set(treePreview.map((n) => n.member.id));
  const extraBondPeers = bondPeers.filter(
    (p) => p.id !== currentUserId && !shownTreeIds.has(p.id),
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <ContextRailCard title="Family Tree" count={totalMembers} href="/tree">
        {flat.length === 0 ? (
          <p style={{ fontSize: 12, color: "#a8a29e", margin: 0 }}>
            No members yet — invite your family!
          </p>
        ) : (
          <ThreadSelectorList>
            {treePreview.map((node) => {
              const isSelf = node.member.id === currentUserId;
              const threadKey = directThreadKey(node.member.id, currentUserId);
              return (
                <ThreadSelectorRow
                  key={node.member.id}
                  label={`${node.member.firstName} ${node.member.lastName}`}
                  firstName={node.member.firstName}
                  lastName={node.member.lastName}
                  photoUrl={node.member.photoUrl}
                  active={activePrivateThreadKey === threadKey}
                  disabled={isSelf}
                  unread={dmUnreadByPeerId[node.member.id] ?? 0}
                  onClick={() => onSelectPrivateThread(threadKey)}
                  title={
                    isSelf
                      ? "This is you"
                      : `Open private thread with ${node.member.firstName} ${node.member.lastName}`
                  }
                />
              );
            })}
            {extraBondPeers.map((peer) => {
              const threadKey = directThreadKey(peer.id, currentUserId);
              return (
                <ThreadSelectorRow
                  key={peer.id}
                  label={`${peer.firstName} ${peer.lastName}`}
                  firstName={peer.firstName}
                  lastName={peer.lastName}
                  photoUrl={peer.photoUrl}
                  active={activePrivateThreadKey === threadKey}
                  unread={dmUnreadByPeerId[peer.id] ?? 0}
                  onClick={() => onSelectPrivateThread(threadKey)}
                  title={`Open private thread with ${peer.firstName} ${peer.lastName}`}
                />
              );
            })}
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
              const key = tuThreadKey(unit);
              const tuActive = activePrivateThreadKey === key;
              const tuLabel = unit.members.map((m) => m.user.firstName).join(" · ");
              return (
                <div key={unit.id} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <button
                    type="button"
                    onClick={() => onSelectPrivateThread(key)}
                    title="Open Trust Unit group thread"
                    className={`thread-selector-tu${tuActive ? " thread-selector-tu--active" : ""}`}
                  >
                    <span>🤝 {tuLabel}</span>
                  </button>
                  {unit.members.map((m) => {
                    const isSelf = m.user.id === currentUserId;
                    const threadKey = directThreadKey(m.user.id, currentUserId);
                    return (
                      <ThreadSelectorRow
                        key={m.user.id}
                        label={`${m.user.firstName} ${m.user.lastName}`}
                        firstName={m.user.firstName}
                        lastName={m.user.lastName}
                        photoUrl={m.user.photoUrl}
                        active={activePrivateThreadKey === threadKey}
                        disabled={isSelf}
                        unread={dmUnreadByPeerId[m.user.id] ?? 0}
                        onClick={() => onSelectPrivateThread(threadKey)}
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
