"use client";

import type { ReactNode } from "react";
import { Send } from "lucide-react";

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
}) {
  const shellStyle = tint
    ? { background: tint.bg, border: `1px solid ${tint.border}` }
    : undefined;

  return (
    <div className="thread-composer" style={shellStyle}>
      {error ? (
        <p className="thread-composer__error">{error}</p>
      ) : null}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        disabled={disabled || submitting}
        className="thread-composer__input"
      />
      <div className="thread-composer__footer">
        {footer ?? <span />}
        <button
          type="button"
          onClick={onSubmit}
          disabled={disabled || submitting || !value.trim()}
          className="thread-composer__send"
        >
          <Send className="h-3.5 w-3.5" />
          {submitting ? "Sending…" : "Send"}
        </button>
      </div>
    </div>
  );
}
