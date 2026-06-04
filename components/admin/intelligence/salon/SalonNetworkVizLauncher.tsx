"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export const SALON_INTELLIGENCE_NETWORK_PATH = "/uploads/index.html";

type SalonNetworkVizLauncherProps = {
  thumbSize?: number;
  modalWidth?: number;
  modalHeight?: number;
};

export function SalonNetworkVizLauncher({
  thumbSize = 140,
  modalWidth = 700,
  modalHeight = 800,
}: SalonNetworkVizLauncherProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const thumbScale = Math.min(thumbSize / modalWidth, thumbSize / modalHeight);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open private network visualization"
        style={{
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 6,
          padding: 0,
          border: "none",
          background: "transparent",
          cursor: "pointer",
        }}
      >
        <div
          style={{
            width: thumbSize,
            height: thumbSize,
            borderRadius: 12,
            overflow: "hidden",
            border: "1px solid #e7e5e4",
            background: "#1c1917",
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          }}
        >
          <iframe
            src={SALON_INTELLIGENCE_NETWORK_PATH}
            title="Private network visualization preview"
            tabIndex={-1}
            style={{
              width: modalWidth,
              height: modalHeight,
              border: "none",
              display: "block",
              pointerEvents: "none",
              transform: `scale(${thumbScale})`,
              transformOrigin: "top left",
            }}
          />
        </div>
        <span style={{ fontSize: 10, fontWeight: 700, color: "#9d174d" }}>Network viz</span>
      </button>

      {mounted && open
        ? createPortal(
            <div
              role="presentation"
              onClick={() => setOpen(false)}
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 500,
                background: "rgba(28, 25, 23, 0.55)",
                backdropFilter: "blur(6px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 16,
              }}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-label="Private network visualization"
                onClick={(e) => e.stopPropagation()}
                style={{
                  width: modalWidth,
                  height: modalHeight,
                  maxWidth: "calc(100vw - 32px)",
                  maxHeight: "calc(100vh - 32px)",
                  borderRadius: 14,
                  overflow: "hidden",
                  border: "1px solid #e7e5e4",
                  background: "#1c1917",
                  boxShadow: "0 24px 60px rgba(0,0,0,0.35)",
                  position: "relative",
                }}
              >
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close visualization"
                  style={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    zIndex: 2,
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    border: "1px solid rgba(255,255,255,0.25)",
                    background: "rgba(0,0,0,0.45)",
                    color: "#fff",
                    fontSize: 16,
                    lineHeight: 1,
                    cursor: "pointer",
                  }}
                >
                  ×
                </button>
                <iframe
                  src={SALON_INTELLIGENCE_NETWORK_PATH}
                  title="Private network visualization"
                  style={{
                    width: "100%",
                    height: "100%",
                    border: "none",
                    display: "block",
                  }}
                />
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
