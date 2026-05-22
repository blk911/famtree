import { ThreadEmptyState as UiThreadEmptyState } from "@/components/ui/thread";
import { MSG_VAULT } from "@/lib/product/communication-copy";

export type EmptyThreadVariant = "pick" | "no-messages" | "no-chats" | "no-threads";

const COPY: Record<EmptyThreadVariant, { title: string; body?: string }> = {
  pick: { title: MSG_VAULT.selectChat },
  "no-messages": { title: "No messages yet. Say hello." },
  "no-chats": { title: MSG_VAULT.emptyChats },
  "no-threads": { title: MSG_VAULT.emptyThreads },
};

export function EmptyThreadState({
  variant,
  compact,
}: {
  variant: EmptyThreadVariant;
  compact?: boolean;
}) {
  const { title, body } = COPY[variant];
  return <UiThreadEmptyState title={title} body={body} compact={compact} />;
}
