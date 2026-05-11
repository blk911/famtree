import React from "react";

interface Props {
  icon:       string;
  title:      string;
  count?:     number;
  emptyText?: string;
  children?:  React.ReactNode;
}

export function PeopleSection({ icon, title, count, emptyText, children }: Props) {
  const hasChildren = React.Children.count(children) > 0;

  return (
    <div
      style={{
        background:   "#fff",
        borderRadius: 16,
        border:       "1px solid #e7e5e4",
        padding:      "18px 22px",
        marginBottom: 14,
      }}
    >
      {/* Section header */}
      <div
        style={{
          display:       "flex",
          alignItems:    "center",
          gap:           8,
          marginBottom:  hasChildren ? 2 : 0,
        }}
      >
        <span aria-hidden="true" style={{ fontSize: 16 }}>{icon}</span>
        <span style={{ fontWeight: 700, fontSize: 14, color: "#1c1917" }}>{title}</span>
        {count !== undefined && count > 0 && (
          <span
            style={{
              fontSize:     11,
              fontWeight:   700,
              color:        "#78716c",
              background:   "#f4f4f5",
              borderRadius: 6,
              padding:      "1px 7px",
              marginLeft:   2,
            }}
          >
            {count}
          </span>
        )}
      </div>

      {/* Items or empty state */}
      {hasChildren ? (
        <div
          style={{
            marginTop: 4,
            // Dividers between rows via box-shadow on the container
          }}
        >
          {React.Children.map(children, (child, i) => (
            <div
              key={i}
              style={{
                borderTop: i === 0 ? "none" : "1px solid #f4f4f5",
              }}
            >
              {child}
            </div>
          ))}
        </div>
      ) : (
        emptyText && (
          <p style={{ fontSize: 13, color: "#a8a29e", margin: "10px 0 0", lineHeight: 1.5 }}>
            {emptyText}
          </p>
        )
      )}
    </div>
  );
}
