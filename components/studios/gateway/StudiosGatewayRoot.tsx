"use client";

import Link from "next/link";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ButtonHTMLAttributes,
  type PropsWithChildren,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { ArrowRight, X } from "lucide-react";
import { STUDIOS_ACCESS_INTEREST_OPTIONS } from "@/lib/studios/gateway/interest-options";
import { isProtectedStudiosHref } from "@/lib/studios/gateway/protected-urls";
import { STUDIOS_INK, STUDIOS_LINE } from "@/lib/studios/visual";
import type { StudiosVisitorType } from "@/lib/studios/gateway/visitor-types";

export type SerializedStudiosGatewayContext = {
  sourceRoute: string;
  visitorType: StudiosVisitorType;
  canAccessPrivateActions: boolean;
  inviteToken?: string | null;
  referrer?: string | null;
};

type GWValue = {
  interceptProtected: boolean;
  gateway: SerializedStudiosGatewayContext | null;
  openAccessRequest: (attemptedAction: string, intendedHref?: string) => void;
};

const StudiosGatewayReactContext = createContext<GWValue | null>(null);

export function useStudiosGateway(): GWValue | null {
  return useContext(StudiosGatewayReactContext);
}

export function StudiosGatewayProvider({
  gateway,
  children,
}: PropsWithChildren<{ gateway: SerializedStudiosGatewayContext | null }>) {
  const [pending, setPending] = useState<{ action: string; href?: string }>({ action: "", href: undefined });
  const [modalOpen, setModalOpen] = useState(false);

  const interceptProtected = gateway?.visitorType === "public_unknown";

  const openAccessRequest = useCallback((attemptedAction: string, intendedHref?: string) => {
    setPending({ action: attemptedAction, href: intendedHref });
    setModalOpen(true);
  }, []);

  const value = useMemo<GWValue>(
    () =>
      interceptProtected && gateway
        ? { interceptProtected: true, gateway, openAccessRequest }
        : { interceptProtected: false, gateway: null, openAccessRequest: () => {} },
    [gateway, interceptProtected, openAccessRequest],
  );

  return (
    <StudiosGatewayReactContext.Provider value={value}>
      {children}
      {interceptProtected && gateway ? (
        <>
          <StudiosPublicGatewayBar />
          <StudiosAccessRequestModal
            gateway={gateway}
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            attemptedAction={pending.action}
            intendedHref={pending.href}
          />
        </>
      ) : null}
    </StudiosGatewayReactContext.Provider>
  );
}

type LinkProps = React.ComponentProps<typeof Link>;

/** When gateway public_unknown and href is protected, opens Request Access modal instead of navigating. */
export function StudiosGatewayAwareLink({
  href,
  actionLabel,
  className,
  style,
  onClick,
  children,
  scroll,
  prefetch,
}: Pick<LinkProps, "href" | "className" | "style" | "children" | "scroll" | "prefetch"> & {
  actionLabel: string;
  onClick?: LinkProps["onClick"];
}) {
  const g = useStudiosGateway();
  const hrefStr = typeof href === "string" ? href : String(href);
  const intercept = Boolean(g?.interceptProtected && isProtectedStudiosHref(hrefStr));

  if (!intercept) {
    return (
      <Link href={href} className={className} style={style} scroll={scroll} prefetch={prefetch} onClick={onClick}>
        {children}
      </Link>
    );
  }

  const btnProps: ButtonHTMLAttributes<HTMLButtonElement> = {
    type: "button",
    className,
    style: style as React.CSSProperties,
    onClick: (e) => {
      onClick?.(e as unknown as React.MouseEvent<HTMLAnchorElement, MouseEvent>);
      if (e.defaultPrevented) return;
      e.preventDefault();
      g!.openAccessRequest(actionLabel, hrefStr);
    },
  };

  return <button {...btnProps}>{children}</button>;
}

function StudiosPublicGatewayBar() {
  const g = useStudiosGateway();

  const pill: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    padding: "6px 12px",
    borderRadius: "999px",
    background: "#fafafa",
    border: "1px solid rgba(0, 0, 0, 0.09)",
    color: "#404040",
    fontSize: "11px",
    fontWeight: 600,
    textDecoration: "none",
    lineHeight: 1.2,
    cursor: "pointer",
    fontFamily: "inherit",
  };

  if (!g?.interceptProtected) return null;

  return (
    <div
      style={{
        width: "100%",
        background: "rgba(255, 255, 255, 0.78)",
        borderBottom: "1px solid rgba(0, 0, 0, 0.06)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "10px 24px",
          display: "flex",
          justifyContent: "flex-end",
          flexWrap: "wrap",
          gap: "10px",
          alignItems: "center",
        }}
      >
        <span style={{ fontSize: "11px", color: "#a8a29e", flex: "1 1 auto", textAlign: "right", marginRight: "auto" }}>
          Member workspace
        </span>
        {(
          [
            ["Create Studio", "/studios/create"],
            ["Drafts", "/studios/drafts"],
            ["My Studios", "/studios/my-studios"],
            ["Edit profile", "/settings"],
          ] as const
        ).map(([label, dest]) => (
          <button key={label} type="button" style={pill} onClick={() => g.openAccessRequest(label, dest)}>
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

function StudiosAccessRequestModal({
  gateway,
  open,
  onClose,
  attemptedAction,
  intendedHref,
}: {
  gateway: SerializedStudiosGatewayContext;
  open: boolean;
  onClose: () => void;
  attemptedAction: string;
  intendedHref?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [interestType, setInterestType] = useState<string>(STUDIOS_ACCESS_INTEREST_OPTIONS[0]);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!open || typeof document === "undefined") return null;

  const ink = STUDIOS_INK;
  const line = STUDIOS_LINE;

  async function submit() {
    setError(null);
    if (!fullName.trim() || !email.trim()) {
      setError("Please add your name and email.");
      return;
    }

    const referrerSafe = gateway.referrer?.slice(0, 2000) ?? (typeof window !== "undefined" ? window.location.href : "");

    const body = {
      sourceRoute: gateway.sourceRoute,
      attemptedAction,
      intendedHref,
      fullName,
      email,
      phone: phone.trim() || null,
      interestType,
      note: note.trim() || null,
      visitorType: gateway.visitorType,
      referrer: referrerSafe,
    };

    try {
      setBusy(true);
      const res = await fetch("/api/studios/gateway/access-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Request failed");

      console.log("[studios/access-request/submit]", { attemptedAction, intendedHref, sourceRoute: gateway.sourceRoute });
      setDone(true);
    } catch {
      setError("Could not send right now — try again in a minute.");
    } finally {
      setBusy(false);
    }
  }

  return createPortal(
    <div
      role="presentation"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 500,
        background: "rgba(15, 23, 42, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="studios-access-title"
        style={{
          width: "100%",
          maxWidth: "460px",
          maxHeight: "min(92vh, 760px)",
          overflowY: "auto",
          background: "#fafaf9",
          borderRadius: "18px",
          border: `1px solid ${line}`,
          boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
          padding: "20px",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", marginBottom: "12px" }}>
          <div>
            <h2 id="studios-access-title" style={{ margin: "0 0 6px", fontSize: "19px", fontWeight: 800, color: ink }}>
              Request Access To AIH Studios
            </h2>
            <p style={{ margin: 0, fontSize: "13px", lineHeight: 1.48, color: "#57534e" }}>
              AIH Studios is an invite-based network for private studios, trusted client communities, and human-led spaces. Tell us who you
              are and we&apos;ll route your request.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={() => !busy && onClose()}
            style={{
              flexShrink: 0,
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              border: "1px solid rgba(0,0,0,0.08)",
              background: "#fff",
              cursor: busy ? "default" : "pointer",
            }}
          >
            <X style={{ width: "18px", height: "18px", color: ink, margin: "auto" }} />
          </button>
        </div>

        {!done ? (
          <>
            {attemptedAction ? (
              <p style={{ margin: "0 0 12px", padding: "8px 10px", borderRadius: "10px", background: "rgba(184,149,108,0.12)", fontSize: "11px", color: "#574c3f" }}>
                Intent: <strong>{attemptedAction}</strong>
                {intendedHref ? ` · intended: ${intendedHref}` : null}
              </p>
            ) : null}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <label style={lab}>
                Full name
                <input value={fullName} onChange={(e) => setFullName(e.target.value)} style={inp} placeholder="Taylor Jordan" disabled={busy} />
              </label>
              <label style={lab}>
                Email
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={inp} placeholder="you@studio.com" disabled={busy} />
              </label>
              <label style={lab}>
                Phone <span style={{ fontWeight: 500, color: "#a8a29e" }}>(optional)</span>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} style={inp} placeholder="+1 · · · · · · · · ·" disabled={busy} />
              </label>
              <label style={lab}>
                Interest type
                <select value={interestType} onChange={(e) => setInterestType(e.target.value)} style={inp} disabled={busy}>
                  {STUDIOS_ACCESS_INTEREST_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </label>
              <label style={lab}>
                What are you hoping to build or explore?
                <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={4} disabled={busy} placeholder="Brief context helps us reply." style={{ ...inp, resize: "vertical", minHeight: "88px" }} />
              </label>
              {error ? <p style={{ margin: 0, fontSize: "12px", color: "#b91c1c" }}>{error}</p> : null}

              {/* Hidden-ish metadata surfaced for transparency / debugging QA */}
              <p style={{ margin: "4px 0 0", fontSize: "10px", color: "#a8a29e" }}>
                Route: <code>{gateway.sourceRoute}</code> · Visitor: <code>{gateway.visitorType}</code> · {" "}
                {new Date().toISOString()}
              </p>

              <button type="button" onClick={() => submit()} disabled={busy} style={{ ...btnPri, opacity: busy ? 0.7 : 1 }}>
                Request Invitation <ArrowRight style={{ width: 14 }} aria-hidden />
              </button>
            </div>
          </>
        ) : (
          <p style={{ margin: "8px 0 0", fontSize: "15px", fontWeight: 600, color: "#166534", lineHeight: 1.5 }}>
            Request received. We&apos;ll review it and follow up with the right next step.
          </p>
        )}
      </div>
    </div>,
    document.body,
  );
}

const lab: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "4px",
  fontSize: "11px",
  fontWeight: 700,
  color: STUDIOS_INK,
};
const inp: React.CSSProperties = {
  borderRadius: "10px",
  border: `1px solid ${STUDIOS_LINE}`,
  padding: "9px 11px",
  fontSize: "14px",
  fontFamily: "inherit",
};
const btnPri: React.CSSProperties = {
  marginTop: "6px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
  padding: "11px 16px",
  borderRadius: "12px",
  border: "none",
  cursor: "pointer",
  fontWeight: 800,
  fontSize: "14px",
  color: "#fff",
  background: "#292524",
};
