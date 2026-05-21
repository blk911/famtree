import { ThreadEmptyState as UiThreadEmptyState } from "@/components/ui/thread";

export type EmptyThreadVariant = "pick" | "no-messages" | "no-chats" | "no-threads";

const COPY: Record<EmptyThreadVariant, { title: string; body?: string }> = {
  pick: { title: "Select a conversation." },
  "no-messages": { title: "No messages in this conversation yet." },
  "no-chats": { title: "No trusted conversations yet." },
  "no-threads": { title: "No private threads yet." },
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
