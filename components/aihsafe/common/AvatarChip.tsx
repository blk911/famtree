interface Props {
  name: string;
  size?: number;
}

export function AvatarChip({ name, size = 32 }: Props) {
  const initials = name
    .split(" ")
    .map(w => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash + name.charCodeAt(i)) % 360;
  const hue = hash;
  return (
    <div
      style={{
        width:          size,
        height:         size,
        borderRadius:   "50%",
        background:     `hsl(${hue}, 42%, 52%)`,
        color:          "#fff",
        fontWeight:     700,
        fontSize:       Math.round(size * 0.38),
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        flexShrink:     0,
        userSelect:     "none",
      }}
      aria-hidden="true"
    >
      {initials || "?"}
    </div>
  );
}
