"use client";

export function VaultInlineError({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <p
      role="alert"
      style={{
        fontSize: 12,
        color: "#b45309",
        margin: 0,
        lineHeight: 1.45,
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 8,
      }}
    >
      <span>{message}</span>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "#6366f1",
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
            textDecoration: "underline",
          }}
        >
          Try again
        </button>
      ) : null}
    </p>
  );
}
