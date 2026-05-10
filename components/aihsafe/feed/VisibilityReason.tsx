// VisibilityReason — explains to the viewer why they can see a post.
// Answers the governed question: "Why can this user see this?"

interface Props {
  reasons: string[];
}

export function VisibilityReason({ reasons }: Props) {
  if (reasons.length === 0) return null;

  return (
    <div
      style={{
        display:    "flex",
        flexWrap:   "wrap",
        gap:        4,
        marginTop:  6,
      }}
      aria-label="Visibility: you see this because"
    >
      {reasons.map((r) => (
        <span
          key={r}
          style={{
            fontSize:     11,
            color:        "#6b7280",
            background:   "#f9fafb",
            border:       "1px solid #e5e7eb",
            borderRadius: 12,
            padding:      "1px 8px",
            display:      "inline-flex",
            alignItems:   "center",
            gap:          3,
          }}
        >
          <span style={{ color: "#22c55e", fontWeight: 700, fontSize: 10 }}>✓</span>
          {r}
        </span>
      ))}
    </div>
  );
}
