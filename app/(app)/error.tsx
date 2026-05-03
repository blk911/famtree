"use client";

export default function AppSegmentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      style={{
        minHeight: "50vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px",
        textAlign: "center",
      }}
    >
      <h2 style={{ fontSize: "22px", fontWeight: 800, color: "#1c1917", margin: "0 0 10px" }}>
        Could not load this page
      </h2>
      <p style={{ fontSize: "14px", color: "#78716c", margin: "0 0 8px", maxWidth: "420px", lineHeight: 1.55 }}>
        A temporary error occurred. If this persists, check database connectivity and server logs.
      </p>
      {error.digest && (
        <p style={{ fontSize: "12px", color: "#a8a29e", margin: "0 0 20px", fontFamily: "monospace" }}>
          Digest: {error.digest}
        </p>
      )}
      <button
        type="button"
        onClick={reset}
        style={{
          height: "44px",
          padding: "0 22px",
          borderRadius: "12px",
          border: "none",
          background: "linear-gradient(135deg,#7c3aed,#c026d3)",
          color: "white",
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        Try again
      </button>
    </div>
  );
}
