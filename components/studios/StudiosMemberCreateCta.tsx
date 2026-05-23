"use client";

import Link from "next/link";
import { ArrowRight, PenLine } from "lucide-react";
import { studioBuilderHref } from "@/lib/studios/builder/entry";
import { STUDIOS_CARD_SHADOW, STUDIOS_INK, STUDIOS_LINE } from "@/lib/studios/visual";

const START_STUDIO_HREF = "/studios/start";

type Props = {
  isAuthenticated: boolean;
  continueDraftId?: string | null;
};

/**
 * Authenticated Studios landing strip: primary studio creation / editor entrypoints.
 */
export function StudiosMemberCreateCta({ isAuthenticated, continueDraftId }: Props) {
  if (!isAuthenticated) return null;

  const buildHref = studioBuilderHref(continueDraftId ?? undefined);
  const headline = continueDraftId ? "Continue draft" : "Create Studio";
  const subtitle = continueDraftId
    ? "Pick up where you left off — sources, draft, and review."
    : "Choose a template, add public links, and draft your published Studio.";

  const actionBase = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "10px 16px",
    borderRadius: "999px",
    fontSize: "13px",
    fontWeight: 700,
    textDecoration: "none",
    transition: "transform 0.12s ease, box-shadow 0.12s ease",
    flex: "1 1 auto",
    minWidth: "min(160px, 100%)",
  } as const;

  return (
    <>
      <style>{`
        .smcta-banner {
          width: 100%;
        }
        .smcta-banner-inner {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: clamp(14px, 3vw, 18px);
        }
        .smcta-banner-meta {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1 1 min(260px, 100%);
          min-width: 0;
        }
        .smcta-banner-actions {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
          flex: 1 1 220px;
        }
        @media (max-width: 540px) {
          .smcta-banner-inner {
            flex-direction: column;
            align-items: stretch;
          }
          .smcta-banner-actions {
            flex-direction: column;
            justify-content: stretch;
          }
          .smcta-banner-actions a {
            width: 100%;
          }
        }
      `}</style>
      <div
        className="smcta-banner"
        style={{
          maxWidth: "960px",
          margin: "0 auto 20px",
          padding: "14px 18px",
          borderRadius: "18px",
          background: "rgba(255,255,255,0.96)",
          border: `1px solid ${STUDIOS_LINE}`,
          boxShadow: STUDIOS_CARD_SHADOW,
        }}
      >
        <div className="smcta-banner-inner">
          <div className="smcta-banner-meta">
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: "rgba(184, 149, 108, 0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <PenLine style={{ width: 19, height: 19, color: "#9a7d52" }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: STUDIOS_INK, letterSpacing: "-0.02em" }}>
                {headline}
              </div>
              <div style={{ fontSize: 13, color: "#78716c", marginTop: 3, lineHeight: 1.35 }}>{subtitle}</div>
            </div>
          </div>
          <div className="smcta-banner-actions" role="navigation" aria-label="Studio creation">
            <Link
              href={buildHref}
              style={{
                ...actionBase,
                background: "linear-gradient(135deg, #b8956c 0%, #9a7d52 100%)",
                color: "#fff",
                boxShadow: "0 3px 12px rgba(154, 125, 82, 0.32)",
                border: "1px solid rgba(154, 125, 82, 0.35)",
              }}
            >
              Build Studio <ArrowRight style={{ width: 14, height: 14 }} aria-hidden />
            </Link>
            <Link
              href={START_STUDIO_HREF}
              style={{
                ...actionBase,
                background: STUDIOS_INK,
                color: "#fff",
                border: `1px solid rgba(28, 25, 23, 0.12)`,
                boxShadow: "0 2px 10px rgba(38, 38, 38, 0.12)",
              }}
            >
              Start Studio <ArrowRight style={{ width: 14, height: 14 }} aria-hidden />
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
