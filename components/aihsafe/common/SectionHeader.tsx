import type { ReactNode } from "react";

interface Props {
  title: string;
  action?: ReactNode;
}

export function SectionHeader({ title, action }: Props) {
  return (
    <div
      style={{
        display:        "flex",
        alignItems:     "center",
        justifyContent: "space-between",
        marginBottom:   12,
      }}
    >
      <h2
        style={{
          margin:        0,
          fontWeight:    700,
          fontSize:      11,
          color:         "#a8a29e",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        {title}
      </h2>
      {action}
    </div>
  );
}
