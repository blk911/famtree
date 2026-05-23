"use client";

import type { ReactNode } from "react";
import { Send } from "lucide-react";
import {
  ThreadComposerFooter,
  ThreadComposerInput,
  ThreadComposerSend,
  ThreadComposerShell,
  ThreadComposerError,
} from "@/components/ui/thread";

export function ThreadComposer({
  value,
  onChange,
  onSubmit,
  placeholder,
  submitting,
  disabled,
  error,
  footer,
  tint,
  canSend,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  placeholder: string;
  submitting?: boolean;
  disabled?: boolean;
  error?: string | null;
  footer?: ReactNode;
  tint?: { bg: string; border: string };
  /** When set, overrides default trim-only send enable (e.g. attachment pending). */
  canSend?: boolean;
}) {
  const sendEnabled =
    canSend !== undefined ? canSend : Boolean(value.trim()) && !disabled && !submitting;
  const shellStyle = tint
    ? { background: tint.bg, border: `1px solid ${tint.border}` }
    : undefined;

  return (
    <ThreadComposerShell style={shellStyle}>
      {error ? <ThreadComposerError>{error}</ThreadComposerError> : null}
      <ThreadComposerInput
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        disabled={disabled || submitting}
      />
      <ThreadComposerFooter>
        {footer ?? <span />}
        <ThreadComposerSend
          onClick={onSubmit}
          disabled={!sendEnabled}
        >
          <Send className="h-3.5 w-3.5" />
          {submitting ? "Sending…" : "Send"}
        </ThreadComposerSend>
      </ThreadComposerFooter>
    </ThreadComposerShell>
  );
}
