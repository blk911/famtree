export function ThreadStatusDot({ unread }: { unread: number }) {
  if (unread > 0) {
    return (
      <span className="thread-selector-unread-badge">
        {unread > 99 ? "99+" : unread}
      </span>
    );
  }
  return <span className="thread-selector-unread-dot" aria-hidden title="No unread messages" />;
}
