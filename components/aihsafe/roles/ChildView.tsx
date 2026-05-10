"use client";

import { FounderShell } from "@/components/aihsafe/founder/FounderShell";
import { RoleBanner } from "@/components/aihsafe/roles/RoleBanner";

const CHILD_FEED_PREFACE = (
  <div
    role="note"
    style={{
      background:   "#f0fdf4",
      border:       "1px solid #bbf7d0",
      borderRadius: 12,
      padding:      "12px 14px",
      marginBottom: 12,
      fontSize:     13,
      color:        "#166534",
      lineHeight:   1.45,
    }}
  >
    If something needs a second look, a guardian will review it first — you&apos;ll still see your posts here when they&apos;re
    shared with your circles.
  </div>
);

export function ChildView({ currentUserId }: { currentUserId: string }) {
  return (
    <FounderShell
      currentUserId={currentUserId}
      shellMode="child"
      belowHero={<RoleBanner variant="child" />}
      feedPreface={CHILD_FEED_PREFACE}
    />
  );
}
