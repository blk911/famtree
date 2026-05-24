"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  videoSrc: string;
};

/** Full-screen lightbox for /studios hero intro clip — Escape, overlay, and X dismiss. */
export function StudiosHeroVideoLightbox({ open, onClose, videoSrc }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!open || typeof document === "undefined") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const v = videoRef.current;
    if (!v) return;
    /** Muted autoplay is broadly allowed immediately after explicit open. */
    v.muted = true;
    void v.play().catch(() => {});
    return () => {
      v.pause();
    };
  }, [open, videoSrc]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      role="presentation"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 560,
        background: "rgba(15, 23, 42, 0.55)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="studios-hero-video-lightbox-label"
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "min(960px, calc(100vw - 32px))",
          borderRadius: "16px",
          overflow: "hidden",
          background: "#0f0f0f",
          boxShadow: "0 28px 80px rgba(0,0,0,0.35)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <span
          id="studios-hero-video-lightbox-label"
          style={{
            position: "absolute",
            width: 1,
            height: 1,
            padding: 0,
            margin: -1,
            overflow: "hidden",
            clip: "rect(0,0,0,0)",
            whiteSpace: "nowrap",
            border: 0,
          }}
        >
          Gap U intro video
        </span>
        <button
          type="button"
          aria-label="Close video"
          onClick={onClose}
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            zIndex: 2,
            width: "40px",
            height: "40px",
            borderRadius: "10px",
            border: "1px solid rgba(255,255,255,0.15)",
            background: "rgba(0,0,0,0.55)",
            color: "#fff",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <X style={{ width: "20px", height: "20px" }} />
        </button>
        <video
          key={videoSrc}
          ref={videoRef}
          src={videoSrc}
          controls
          playsInline
          muted
          autoPlay
          style={{
            width: "100%",
            height: "auto",
            maxHeight: "min(78vh, 720px)",
            display: "block",
          }}
        />
      </div>
    </div>,
    document.body,
  );
}
