"use client";

import { useState, type FormEvent } from "react";

type Props = {
  onSubmit: (question: string) => void;
  disabled?: boolean;
  placeholder?: string;
};

export function AiosQuestionInput({
  onSubmit,
  disabled,
  placeholder = "Ask tAIkOS…",
}: Props) {
  const [value, setValue] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const q = value.trim();
    if (!q || disabled) return;
    onSubmit(q);
    setValue("");
  }

  return (
    <form className="aios-question-form" onSubmit={handleSubmit}>
      <input
        className="aios-question-input"
        type="text"
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        aria-label="Ask tAIkOS"
      />
      <button type="submit" className="aios-question-submit" disabled={disabled || !value.trim()}>
        Ask
      </button>
    </form>
  );
}
