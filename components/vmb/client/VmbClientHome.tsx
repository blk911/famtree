"use client";

import { useState, type CSSProperties, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { VmbClientInvitePortal } from "@/components/vmb/client/VmbClientInvitePortal";

type Props = {
  inviteId?: string;
  contact?: string;
  token?: string;
};

const ACCENT = "#c2185b";
const WINE = "#8a1244";
const CREAM = "#fffaf6";
const BLUSH = "#fff1f7";
const LINE = "rgba(194,24,91,0.18)";

export function VmbClientHome({ inviteId = "", contact = "", token = "" }: Props) {
  const router = useRouter();
  const [inviteToken, setInviteToken] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (token || (inviteId && contact)) {
    return <VmbClientInvitePortal inviteId={inviteId} contact={contact} token={token} />;
  }

  function openToken(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = inviteToken.trim();
    if (!trimmed) {
      setMessage("Paste the private invite token or link from your salon.");
      return;
    }
    const tokenFromUrl = (() => {
      try {
        const url = new URL(trimmed);
        return url.searchParams.get("token") || url.pathname.split("/").filter(Boolean).pop() || trimmed;
      } catch {
        return trimmed;
      }
    })();
    router.push(`/vmb/client?token=${encodeURIComponent(tokenFromUrl)}`);
  }

  async function findInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      setMessage("Enter the email your salon used for the invite.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/vmb/client-invites/lookup", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      const json = (await response.json()) as { ok?: boolean; invite?: { id: string }; error?: string };
      if (!response.ok || !json.ok || !json.invite?.id) {
        throw new Error(json.error ?? "No active invite found for that email.");
      }
      router.push(`/vmb/client?inviteId=${encodeURIComponent(json.invite.id)}&contact=${encodeURIComponent(trimmed)}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No active invite found for that email.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", background: `linear-gradient(135deg, ${BLUSH}, ${CREAM} 48%, #fff)`, color: "#281d1d" }}>
      <section style={{ maxWidth: 1120, margin: "0 auto", padding: "32px 20px 72px" }}>
        <header style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", marginBottom: 44 }}>
          <Link href="/vmb" style={{ color: "#281d1d", textDecoration: "none", fontWeight: 900 }}>
            VMB <span style={{ fontWeight: 400 }}>Client</span>
          </Link>
          <Link href="/vmbsalons" style={{ color: WINE, fontSize: 13, fontWeight: 800, textDecoration: "none" }}>
            VMB Salons
          </Link>
        </header>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.05fr) minmax(320px, 0.95fr)", gap: 28, alignItems: "stretch" }} className="vmb-client-entry-grid">
          <section
            style={{
              border: `1px solid ${LINE}`,
              borderRadius: 34,
              background: "rgba(255,255,255,0.76)",
              boxShadow: "0 28px 80px rgba(194,24,91,0.12)",
              padding: "clamp(28px, 5vw, 56px)",
            }}
          >
            <p style={{ margin: "0 0 16px", color: ACCENT, fontSize: 11, fontWeight: 900, letterSpacing: "0.16em", textTransform: "uppercase" }}>
              Private Client Gifts
            </p>
            <h1 style={{ margin: "0 0 18px", fontFamily: "var(--font-display, Georgia, serif)", fontSize: "clamp(46px, 8vw, 86px)", lineHeight: 0.92, letterSpacing: "-0.06em" }}>
              Your salon invite lives here.
            </h1>
            <p style={{ margin: 0, maxWidth: 580, color: "#6f5557", fontSize: 18, lineHeight: 1.65 }}>
              Open a private salon gift, choose a time, personalize the style, or hold it while you decide.
              This is the client lane that will become your gifts, bookings, salons, and profile home.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12, marginTop: 34 }} className="vmb-client-entry-steps">
              {["Open gift", "Book or hold", "Salon confirms"].map((item) => (
                <div key={item} style={{ padding: 16, borderRadius: 18, border: `1px solid ${LINE}`, background: "#fff" }}>
                  <strong style={{ display: "block", color: WINE, fontSize: 14 }}>{item}</strong>
                </div>
              ))}
            </div>
          </section>

          <aside style={{ display: "grid", gap: 16 }}>
            <form onSubmit={openToken} style={cardStyle}>
              <p style={eyebrowStyle}>Secure Invite Link</p>
              <h2 style={cardHeadingStyle}>Open with your private token</h2>
              <p style={copyStyle}>Best path. Use the private link from your salon email or SMS.</p>
              <input
                value={inviteToken}
                onChange={(event) => setInviteToken(event.target.value)}
                placeholder="Paste invite token or full link"
                style={inputStyle}
              />
              <button type="submit" style={primaryButtonStyle}>Open My Gift</button>
            </form>

            <form onSubmit={findInvite} style={cardStyle}>
              <p style={eyebrowStyle}>Temporary Test Bridge</p>
              <h2 style={cardHeadingStyle}>Find by email</h2>
              <p style={copyStyle}>For Deb/Jenny testing while the magic-link client login is being built.</p>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="deb@test.com"
                style={inputStyle}
              />
              <button type="submit" disabled={busy} style={secondaryButtonStyle}>
                {busy ? "Checking..." : "Find My Invite"}
              </button>
            </form>

            {message ? (
              <p style={{ margin: 0, padding: "14px 16px", borderRadius: 16, border: `1px solid ${LINE}`, background: "#fff", color: WINE, fontWeight: 800 }}>
                {message}
              </p>
            ) : null}
          </aside>
        </div>
      </section>
    </main>
  );
}

const cardStyle = {
  padding: 24,
  borderRadius: 24,
  border: `1px solid ${LINE}`,
  background: "rgba(255,255,255,0.88)",
  boxShadow: "0 18px 44px rgba(82,45,54,0.08)",
} satisfies CSSProperties;

const eyebrowStyle = {
  margin: "0 0 10px",
  color: ACCENT,
  fontSize: 10,
  fontWeight: 900,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
} satisfies CSSProperties;

const cardHeadingStyle = {
  margin: "0 0 8px",
  fontFamily: "var(--font-display, Georgia, serif)",
  fontSize: 30,
  lineHeight: 1,
  letterSpacing: "-0.04em",
} satisfies CSSProperties;

const copyStyle = {
  margin: "0 0 16px",
  color: "#765c60",
  fontSize: 14,
  lineHeight: 1.5,
} satisfies CSSProperties;

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  border: `1px solid ${LINE}`,
  borderRadius: 16,
  padding: "14px 15px",
  marginBottom: 12,
  fontSize: 15,
  background: "#fff",
} satisfies CSSProperties;

const primaryButtonStyle = {
  width: "100%",
  border: "none",
  borderRadius: 999,
  padding: "14px 18px",
  background: ACCENT,
  color: "#fff",
  fontWeight: 900,
  cursor: "pointer",
} satisfies CSSProperties;

const secondaryButtonStyle = {
  ...primaryButtonStyle,
  background: "#fff",
  color: ACCENT,
  border: `1px solid ${ACCENT}`,
} satisfies CSSProperties;
