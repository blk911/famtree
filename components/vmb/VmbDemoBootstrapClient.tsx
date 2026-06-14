"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { VmbAuthShell } from "@/components/vmb/VmbAuthShell";
import { writeActiveBookSession } from "@/lib/vmb/active-analysis";
import { VMB_THEME } from "@/lib/vmb/theme";

export function VmbDemoBootstrapClient() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const res = await fetch("/api/vmb/demo", {
          method: "POST",
          credentials: "include",
        });
        const json = (await res.json()) as {
          ok: boolean;
          error?: string;
          data?: {
            trialId: string;
            analysisId: string;
            redirectTo: string;
            clientCount?: number;
          };
        };
        if (cancelled) return;

        if (!res.ok || !json.ok || !json.data?.analysisId) {
          setError(json.error ?? "Could not build demo client book.");
          return;
        }

        writeActiveBookSession({
          analysisId: json.data.analysisId,
          trialId: json.data.trialId,
        });
        router.replace(json.data.redirectTo);
      } catch {
        if (!cancelled) {
          setError("Could not build demo client book. Please try again.");
        }
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <VmbAuthShell backHref="/vmb" backLabel="Back to VMB">
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            width: 54,
            height: 54,
            margin: "0 auto 16px",
            borderRadius: 16,
            background: `linear-gradient(135deg, ${VMB_THEME.accent}, #be185d)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontSize: 22,
            fontWeight: 900,
          }}
        >
          V
        </div>
        <h1
          style={{
            margin: "0 0 8px",
            fontSize: 26,
            fontWeight: 800,
            color: VMB_THEME.ink,
          }}
        >
          {error ? "Demo unavailable" : "Building your demo client book…"}
        </h1>
        <p style={{ margin: "0 0 20px", fontSize: 15, color: VMB_THEME.muted, lineHeight: 1.5 }}>
          {error
            ? error
            : "Analyzing a sample salon book so you can explore Today, clients, and opportunities."}
        </p>
        {error ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Link
              href="/vmb/demo"
              style={{
                display: "inline-block",
                padding: "12px 18px",
                borderRadius: 12,
                background: VMB_THEME.accent,
                color: "#fff",
                fontWeight: 800,
                textDecoration: "none",
              }}
            >
              Try again
            </Link>
            <Link
              href="/vmb/login"
              style={{
                display: "inline-block",
                padding: "12px 18px",
                borderRadius: 12,
                border: `1px solid ${VMB_THEME.line}`,
                color: VMB_THEME.ink,
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              Start free trial
            </Link>
          </div>
        ) : (
          <div
            aria-hidden
            style={{
              width: 36,
              height: 36,
              margin: "0 auto",
              borderRadius: "50%",
              border: `3px solid ${VMB_THEME.accentMuted}`,
              borderTopColor: VMB_THEME.accent,
              animation: "vmb-demo-spin 0.9s linear infinite",
            }}
          />
        )}
      </div>
      <style jsx global>{`
        @keyframes vmb-demo-spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </VmbAuthShell>
  );
}
