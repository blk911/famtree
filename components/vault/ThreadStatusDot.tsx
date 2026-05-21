import { ThreadUnreadBadge, ThreadUnreadDot } from "@/components/ui/thread";

export function ThreadStatusDot({ unread }: { unread: number }) {
  if (unread > 0) {
    return <ThreadUnreadBadge count={unread} />;
  }
  return <ThreadUnreadDot />;
}
