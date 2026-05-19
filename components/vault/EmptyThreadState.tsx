export type EmptyThreadVariant = "pick" | "no-messages";

const COPY: Record<EmptyThreadVariant, { title: string; body?: string }> = {
  pick: {
    title: "Select someone from the right to start a trusted conversation.",
  },
  "no-messages": {
    title: "No private messages yet.",
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
