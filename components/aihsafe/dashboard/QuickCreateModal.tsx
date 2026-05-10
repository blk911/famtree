"use client";

import type { ReactNode } from "react";

interface Props {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export function QuickCreateModal({ title, onClose, children }: Props) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      style={{
        position:       "fixed",
        inset:          0,
        zIndex:         1000,
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        padding:        "20px 16px",
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <div
        aria-hidden="true"
        style={{
          position:   "fixed",
          inset:      0,
          background: "rgba(28,25,23,0.45)",
          backdropFilter: "blur(2px)",
        }}
      />

      {/* Sheet */}
      <div
        style={{
          position:     "relative",
          zIndex:       1,
          background:   "#fff",
          borderRadius: 20,
          boxShadow:    "0 8px 40px rgba(0,0,0,0.18)",
          width:        "100%",
          maxWidth:     480,
          maxHeight:    "85vh",
          overflowY:    "auto",
          padding:      "28px 28px 32px",
        }}
      >
        {/* Header */}
        <div
          style={{
            display:        "flex",
            alignItems:     "center",
            justifyContent: "space-between",
            marginBottom:   22,
          }}
        >
          <h2 style={{ margin: 0, fontWeight: 700, fontSize: 17, color: "#1c1917" }}>
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background:   "transparent",
              border:       "none",
              cursor:       "pointer",
              color:        "#78716c",
              fontSize:     20,
              lineHeight:   1,
              padding:      "4px 6px",
              borderRadius: 8,
            }}
          >
            ×
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}
