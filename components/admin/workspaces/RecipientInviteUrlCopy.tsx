"use client";

import { useCallback, useState } from "react";
import { buildRecipientInvitePath } from "@/lib/vmb/invites/recipient-invite-url";

type Props = {
  inviteId: string;
};

export function RecipientInviteUrlCopy({ inviteId }: Props) {
  const [copied, setCopied] = useState(false);
  const path = buildRecipientInvitePath(inviteId);

  const copy = useCallback(async () => {
    try {
      const absolute =
        typeof window !== "undefined" ? `${window.location.origin}${path}` : path;
      await navigator.clipboard.writeText(absolute);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [path]);

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <code className="rounded bg-stone-100 px-2 py-1 font-mono text-[10px] text-stone-700">{path}</code>
      <button
        type="button"
        onClick={() => void copy()}
        className="rounded border border-stone-200 bg-white px-2 py-1 text-[10px] font-semibold text-stone-700 hover:bg-stone-50"
      >
        {copied ? "Copied" : "Copy link"}
      </button>
    </div>
  );
}
