"use client";

import { VMB_THEME } from "@/lib/vmb/theme";

type PreviewRow = {
  id: string;
  label: string;
  sublabel?: string;
  body?: string;
};

type Props = {
  title: string;
  rows: PreviewRow[];
  onClose: () => void;
  onSelectRow?: (id: string) => void;
};

export function SimplePreviewModal({ title, rows, onClose, onSelectRow }: Props) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 90,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "rgba(28, 25, 23, 0.4)",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 440,
          maxHeight: "80vh",
          overflow: "auto",
          background: "#fff",
          borderRadius: 14,
          border: `1px solid ${VMB_THEME.line}`,
          padding: "20px 18px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              border: "none",
              background: "transparent",
              fontSize: 20,
              cursor: "pointer",
              color: VMB_THEME.muted,
            }}
          >
            ×
          </button>
        </div>
        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 10 }}>
          {rows.map((row) => (
            <li
              key={row.id}
              style={{
                padding: "10px 0",
                borderBottom: `1px solid ${VMB_THEME.line}`,
              }}
            >
              {onSelectRow ? (
                <button
                  type="button"
                  onClick={() => onSelectRow(row.id)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    border: "none",
                    background: "none",
                    padding: 0,
                    cursor: "pointer",
                    font: "inherit",
                  }}
                >
                  <RowContent row={row} />
                </button>
              ) : (
                <RowContent row={row} />
              )}
            </li>
          ))}
        </ul>
        <p style={{ margin: "14px 0 0", fontSize: 12, color: VMB_THEME.muted }}>
          Preview only — sending is not enabled yet.
        </p>
      </div>
    </div>
  );
}

function RowContent({ row }: { row: PreviewRow }) {
  return (
    <>
      <div style={{ fontSize: 15, fontWeight: 700, color: VMB_THEME.ink }}>{row.label}</div>
      {row.sublabel ? (
        <div style={{ marginTop: 2, fontSize: 13, color: VMB_THEME.muted }}>{row.sublabel}</div>
      ) : null}
      {row.body ? (
        <p style={{ margin: "8px 0 0", fontSize: 14, lineHeight: 1.5, color: VMB_THEME.ink }}>{row.body}</p>
      ) : null}
    </>
  );
}
