interface Props {
  icon:    string;
  label:   string;
  time:    string;
  faded?:  boolean;
}

export function CompactActivityItem({ icon, label, time, faded = false }: Props) {
  return (
    <div
      style={{
        display:     "flex",
        alignItems:  "center",
        gap:         10,
        padding:     "9px 0",
        borderBottom:"1px solid #f5f5f4",
        opacity:     faded ? 0.5 : 1,
      }}
    >
      <span style={{ fontSize: 15, flexShrink: 0, width: 22, textAlign: "center" }}>
        {icon}
      </span>
      <span style={{ fontSize: 13, color: "#44403c", flex: 1, lineHeight: 1.3 }}>
        {label}
      </span>
      <span style={{ fontSize: 11, color: "#a8a29e", flexShrink: 0, whiteSpace: "nowrap" }}>
        {time}
      </span>
    </div>
  );
}
