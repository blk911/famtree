"use client";

export function ContextRailEmptyState({
  message,
  action,
}: {
  message: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <p style={{ fontSize: 12, color: "#78716c", margin: 0, lineHeight: 1.45 }}>
      {message}
      {action && (
        <>
          {" "}
          <button
            type="button"
            onClick={action.onClick}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              color: "#6366f1",
              fontWeight: 600,
              fontSize: 12,
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            {action.label}
          </button>
        </>
      )}
    </p>
  );
}
