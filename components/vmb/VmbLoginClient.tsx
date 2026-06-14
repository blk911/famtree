"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { VmbAuthShell } from "@/components/vmb/VmbAuthShell";
import { writeActiveBookSession } from "@/lib/vmb/active-analysis";
import { VMB_THEME } from "@/lib/vmb/theme";

export function VmbLoginClient() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/vmb/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        error?: string;
        data?: {
          redirectTo: string;
          trialId?: string;
          analysisId?: string;
        };
      };
      if (!res.ok || !data.ok || !data.data?.redirectTo) {
        setError(data.error ?? "Login failed");
        return;
      }
      if (data.data.analysisId) {
        writeActiveBookSession({
          analysisId: data.data.analysisId,
          trialId: data.data.trialId,
        });
      }
      router.push(data.data.redirectTo);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <VmbAuthShell backHref="/vmb" backLabel="Back to VMB">
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, marginBottom: 22 }}>
        <div
          style={{
            width: 54,
            height: 54,
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
        <div style={{ fontSize: 22, fontWeight: 800, color: VMB_THEME.ink, letterSpacing: "-0.4px" }}>
          Salon sign in
        </div>
      </div>

      <h1
        style={{
          fontSize: 26,
          fontWeight: 800,
          color: VMB_THEME.ink,
          margin: "0 0 4px",
          textAlign: "center",
        }}
      >
        Welcome back
      </h1>
      <p style={{ fontSize: 14, color: VMB_THEME.muted, textAlign: "center", margin: "0 0 22px" }}>
        Sign in to your VMB salon workspace
      </p>

      {error ? (
        <div
          style={{
            background: "#fef2f2",
            borderLeft: `4px solid ${VMB_THEME.accent}`,
            borderRadius: 10,
            padding: "12px 14px",
            fontSize: 14,
            color: "#92400e",
            marginBottom: 16,
            fontWeight: 600,
          }}
        >
          {error}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "#44403c",
              display: "block",
              marginBottom: 6,
            }}
          >
            Email
          </label>
          <input
            className="aih-input"
            type="email"
            placeholder="you@yoursalon.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            autoFocus
            style={inputStyle}
          />
        </div>
        <div>
          <label
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "#44403c",
              display: "block",
              marginBottom: 6,
            }}
          >
            Password
          </label>
          <div style={{ position: "relative" }}>
            <input
              className="aih-input"
              type={showPassword ? "text" : "password"}
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              style={{ ...inputStyle, paddingRight: 44 }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              style={{
                position: "absolute",
                right: 10,
                top: "50%",
                transform: "translateY(-50%)",
                border: "none",
                background: "transparent",
                color: VMB_THEME.muted,
                cursor: "pointer",
                padding: 4,
              }}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          style={{
            marginTop: 4,
            padding: "12px 16px",
            borderRadius: 12,
            border: "none",
            background: `linear-gradient(135deg, ${VMB_THEME.accent}, #be185d)`,
            color: "#fff",
            fontSize: 15,
            fontWeight: 800,
            cursor: loading ? "wait" : "pointer",
            opacity: loading ? 0.85 : 1,
          }}
        >
          {loading ? "Signing in…" : "Sign in to VMB"}
        </button>
      </form>

      <p style={{ marginTop: 20, fontSize: 14, color: VMB_THEME.muted, textAlign: "center" }}>
        Prefer to explore first?{" "}
        <Link href="/vmb/demo" style={{ color: VMB_THEME.accent, fontWeight: 800, textDecoration: "none" }}>
          View Demo →
        </Link>
      </p>
    </VmbAuthShell>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "10px 14px",
  border: "1.5px solid #e5e4e0",
  borderRadius: 10,
  fontSize: 15,
};
