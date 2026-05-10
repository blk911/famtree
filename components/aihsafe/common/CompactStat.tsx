interface Props {
  label: string;
  value: number | string;
  accent?: string;
  onClick?: () => void;
}

export function CompactStat({ label, value, accent = "#fff", onClick }: Props) {
  const style: React.CSSProperties = {
    display:        "flex",
    flexDirection:  "column",
    alignItems:     "center",
    padding:        "10px 18px",
    borderRadius:   12,
    background:     "rgba(255,255,255,0.10)",
    border:         "1px solid rgba(255,255,255,0.15)",
    cursor:         onClick ? "pointer" : "default",
    minWidth:       64,
  };

  return (
    <div style={style} onClick={onClick} role={onClick ? "button" : undefined} tabIndex={onClick ? 0 : undefined}>
      <span style={{ fontWeight: 800, fontSize: 22, color: accent, lineHeight: 1 }}>
        {value}
      </span>
      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", marginTop: 3, whiteSpace: "nowrap" }}>
        {label}
      </span>
    </div>
  );
}
