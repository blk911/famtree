"use client";
// components/discovery/DiscoveryChannelRow.tsx

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { DiscoveryChannel, DiscoveryItem } from "@/lib/discovery/catalog";
import { DiscoveryCard } from "@/components/discovery/DiscoveryCard";

interface Props {
  channel: DiscoveryChannel;
  onPlay: (item: DiscoveryItem) => void;
}

export function DiscoveryChannelRow({ channel, onPlay }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  function scroll(direction: "left" | "right") {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: direction === "left" ? -480 : 480, behavior: "smooth" });
  }

  return (
    <section style={{ width: "100%" }}>
      {/* Channel header */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 10,
          marginBottom: 14,
          paddingLeft: "clamp(16px, 4vw, 40px)",
        }}
      >
        <span style={{ fontSize: 22 }} aria-hidden>
          {channel.icon}
        </span>
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: "clamp(16px, 2.2vw, 20px)",
              fontWeight: 900,
              color: "#fff",
              letterSpacing: "-0.03em",
              lineHeight: 1.15,
            }}
          >
            <span style={{ color: channel.accentColor }}>{channel.title}</span>
          </h2>
          <p
            style={{
              margin: "3px 0 0",
              fontSize: 12,
              color: "rgba(255,255,255,0.45)",
              lineHeight: 1.4,
              fontWeight: 500,
            }}
          >
            {channel.subhead}
          </p>
        </div>

        {/* Arrow buttons (desktop only via CSS) */}
        <div
          className="dcr-arrows"
          style={{ display: "flex", gap: 6, marginLeft: "auto", paddingRight: "clamp(16px,4vw,40px)" }}
        >
          <button
            type="button"
            onClick={() => scroll("left")}
            aria-label={`Scroll ${channel.title} left`}
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              border: "1px solid rgba(255,255,255,0.15)",
              background: "rgba(255,255,255,0.07)",
              color: "rgba(255,255,255,0.7)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "background 0.15s",
            }}
          >
            <ChevronLeft style={{ width: 16, height: 16 }} />
          </button>
          <button
            type="button"
            onClick={() => scroll("right")}
            aria-label={`Scroll ${channel.title} right`}
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              border: "1px solid rgba(255,255,255,0.15)",
              background: "rgba(255,255,255,0.07)",
              color: "rgba(255,255,255,0.7)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "background 0.15s",
            }}
          >
            <ChevronRight style={{ width: 16, height: 16 }} />
          </button>
        </div>
      </div>

      {/* Horizontal scroll track */}
      <div
        ref={scrollRef}
        style={{
          display: "flex",
          gap: 14,
          overflowX: "auto",
          paddingLeft: "clamp(16px, 4vw, 40px)",
          paddingRight: "clamp(16px, 4vw, 40px)",
          paddingBottom: 8,
          scrollbarWidth: "none",
        }}
      >
        {channel.items.map((item) => (
          <DiscoveryCard key={item.id} item={item} onPlay={onPlay} />
        ))}
      </div>
    </section>
  );
}
