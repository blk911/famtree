import React from "react";

interface Props {
  icon:        string;
  title:       string;
  count?:      number;
  /** Action rendered in the header (e.g. "+ New" button). */
  action?:     React.ReactNode;
  /** Shown when there are no children. */
  emptyText?:  string;
  /** Shown below emptyText — e.g. a create button. */
  emptyAction?: React.ReactNode;
  children?:   React.ReactNode;
}

export function SpacesSection({ icon, title, count, action, emptyText, emptyAction, children }: Props) {
  const hasChildren = React.Children.count(children) > 0;

  return (
    <section style={{ marginBottom: 22 }}>
      {/* Section header */}
      <div
        style={{
          display:        "flex",
          alignItems:     "center",
          justifyContent: "space-between",
          marginBottom:   10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span aria-hidden="true" style={{ fontSize: 15 }}>{icon}</span>
          <span style={{ fontWeight: 700, fontSize: 12, color: "#78716c", letterSpacing: "0.06em", textTransform: "uppercase" }}>
            {title}
          </span>
          {count !== undefined && count > 0 && (
            <span
              style={{
                fontSize:     11,
                fontWeight:   700,
                color:        "#78716c",
                background:   "#f4f4f5",
                borderRadius: 6,
                padding:      "1px 7px",
              }}
            >
              {count}
            </span>
          )}
        </div>
        {action}
      </div>

      {/* Content or empty state */}
      {hasChildren ? (
        children
      ) : (
        <div
          style={{
            background:   "#fafaf9",
            border:       "1px dashed #d6d3d1",
            borderRadius: 14,
            padding:      "20px 22px",
            textAlign:    "center",
          }}
        >
          {emptyText && (
            <p style={{ fontSize: 13, color: "#a8a29e", margin: "0 0 10px" }}>
              {emptyText}
            </p>
          )}
          {emptyAction}
        </div>
      )}
    </section>
  );
}
