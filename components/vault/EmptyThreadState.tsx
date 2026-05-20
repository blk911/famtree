export type EmptyThreadVariant = "pick" | "no-messages" | "no-chats" | "no-threads";

const COPY: Record<EmptyThreadVariant, { title: string; body?: string }> = {
  pick: {
    title: "Select a conversation.",
  },
  "no-messages": {
    title: "No messages in this conversation yet.",
  },
  "no-chats": {
    title: "No trusted conversations yet.",
  },
  "no-threads": {
    title: "No private threads yet.",
  },
};

export function EmptyThreadState({ variant }: { variant: EmptyThreadVariant }) {
  const { title, body } = COPY[variant];
  return (
    <div className="thread-empty-state">
      <p className="thread-empty-state__title">{title}</p>
      {body ? <p className="thread-empty-state__body">{body}</p> : null}
    </div>
  );
}
