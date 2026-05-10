// Space badge — small colored chip showing the trust unit context of a post.

const KIND_META: Record<string, { icon: string; bg: string; color: string }> = {
  family:   { icon: "🏠", bg: "#eff6ff", color: "#1d4ed8" },
  peer:     { icon: "⚽", bg: "#f0fdf4", color: "#15803d" },
  extended: { icon: "🌿", bg: "#fefce8", color: "#a16207" },
  guardian: { icon: "🛡", bg: "#faf5ff", color: "#7c3aed" },
};

interface Props {
  name: string;
  kind?: string;
}

export function SpaceBadge({ name, kind = "peer" }: Props) {
  const meta = KIND_META[kind] ?? KIND_META.peer;
  return (
    <span
      style={{
        display:      "inline-flex",
        alignItems:   "center",
        gap:          4,
        background:   meta.bg,
        color:        meta.color,
        borderRadius: 20,
        padding:      "2px 10px",
        fontSize:     11,
        fontWeight:   600,
        whiteSpace:   "nowrap",
      }}
    >
      <span style={{ fontSize: 12, lineHeight: 1 }}>{meta.icon}</span>
      {name}
    </span>
  );
}
