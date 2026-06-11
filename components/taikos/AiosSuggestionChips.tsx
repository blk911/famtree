"use client";

const DEFAULT_SUGGESTIONS = [
  "Who should I contact today?",
  "Who is likely to book Saturday?",
  "Show overdue clients",
  "Find my best referral source",
  "What should I do next?",
] as const;

type Props = {
  onSelect: (question: string) => void;
  disabled?: boolean;
};

export function AiosSuggestionChips({ onSelect, disabled }: Props) {
  return (
    <div className="aios-suggestion-chips" role="list" aria-label="Suggested questions">
      {DEFAULT_SUGGESTIONS.map((q) => (
        <button
          key={q}
          type="button"
          className="aios-suggestion-chip"
          disabled={disabled}
          onClick={() => onSelect(q)}
        >
          {q}
        </button>
      ))}
    </div>
  );
}
