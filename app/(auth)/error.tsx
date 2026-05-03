"use client";

export default function AuthSegmentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div style={{ padding: "36px 40px", textAlign: "center" }}>
      <h2 style={{ fontSize: "20px", fontWeight: 800, color: "#1c1917", margin: "0 0 10px" }}>
        Something went wrong
      </h2>
      <p style={{ fontSize: "14px", color: "#78716c", margin: "0 0 20px", lineHeight: 1.55 }}>
        {error.digest ? `Error digest: ${error.digest}` : (error.message || "Please try again.")}
      </p>
      <button
        type="button"
        onClick={reset}
        style={{
          height: "44px",
          padding: "0 22px",
          borderRadius: "10px",
          border: "none",
          background: "linear-gradient(135deg,#f59e0b,#f43f5e)",
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
