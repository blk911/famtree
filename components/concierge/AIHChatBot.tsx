"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { usePathname } from "next/navigation";
import { MessageCircle, Send, X, ChevronDown, Sparkles } from "lucide-react";

const VISITOR_KEY = "aih_concierge_vid";

type ChatMsg = { id: string; role: "user" | "assistant"; content: string };

function ensureVisitorToken(): string {
  try {
    let t = localStorage.getItem(VISITOR_KEY);
    if (!t || t.length < 8) {
      t = crypto.randomUUID();
      localStorage.setItem(VISITOR_KEY, t);
    }
    return t;
  } catch {
    return `anon_${Math.random().toString(36).slice(2)}`;
  }
}

export function AIHChatBot() {
  const pathname = usePathname() ?? "/";
  const [open, setOpen] = useState(false);
  const [visitorToken, setVisitorToken] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [modeLabel, setModeLabel] = useState<string>("Concierge");
  const [funnelStage, setFunnelStage] = useState<string>("greeting");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [quickReplies, setQuickReplies] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [streaming, setStreaming] = useState("");
  const [thinking, setThinking] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);
  const [demoBanner, setDemoBanner] = useState(false);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [igHandle, setIgHandle] = useState("");
  const [leadNote, setLeadNote] = useState("");
  const [leadBusy, setLeadBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setVisitorToken(ensureVisitorToken());
  }, []);

  const bootstrap = useCallback(async () => {
    if (!visitorToken) return;
    setBootError(null);
    try {
      const res = await fetch("/api/concierge/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pathname, visitorToken }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not start concierge session");

      setSessionId(data.sessionId);
      setFunnelStage(data.funnelStage ?? "greeting");
      setModeLabel(data.mode === "studio_voice" ? "Studio voice" : "Studios concierge");

      const mapped: ChatMsg[] = (data.messages ?? []).map((m: { id: string; role: string; content: string }) => ({
        id: m.id,
        role: m.role === "user" ? "user" : "assistant",
        content: m.content,
      }));
      setMessages(mapped);

      setQuickReplies(
        data.mode === "studio_voice"
          ? ["Tell me how access works", "What makes this different?", "I'd love to visit"]
          : ["Tell me about Studios", "I'm browsing providers", "I run a studio"],
      );
    } catch (e) {
      setBootError(e instanceof Error ? e.message : "Session failed");
    }
  }, [pathname, visitorToken]);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, streaming, thinking]);

  const sendText = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || !sessionId || !visitorToken || thinking) return;

    const optimisticId = `u_${Date.now()}`;
    setMessages((prev) => [...prev, { id: optimisticId, role: "user", content: trimmed }]);
    setDraft("");
    setThinking(true);
    setStreaming("");
    setDemoBanner(false);

    try {
      const res = await fetch("/api/concierge/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, visitorToken, message: trimmed }),
      });

      if (!res.ok || !res.body) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error ?? "Chat failed");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let assembled = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          let evt: { type?: string; v?: string; stage?: string; quickReplies?: string[]; demoMode?: boolean; message?: string };
          try {
            evt = JSON.parse(line);
          } catch {
            continue;
          }

          if (evt.type === "token" && evt.v) {
            assembled += evt.v;
            setStreaming(assembled);
          }
          if (evt.type === "meta") {
            if (evt.stage) setFunnelStage(evt.stage);
            if (Array.isArray(evt.quickReplies)) setQuickReplies(evt.quickReplies);
            if (evt.demoMode) setDemoBanner(true);
          }
          if (evt.type === "error") {
            throw new Error(evt.message ?? "Stream error");
          }
        }
      }

      const assistantBody = assembled.trim();
      if (assistantBody) {
        setMessages((prev) => [...prev, { id: `a_${Date.now()}`, role: "assistant", content: assistantBody }]);
      }
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: "assistant",
          content:
            e instanceof Error
              ? `Something hiccuped — ${e.message}`
              : "Something hiccuped — please try again in a breath.",
        },
      ]);
    } finally {
      setThinking(false);
      setStreaming("");
    }
  };

  const submitLead = async () => {
    if (!sessionId || !visitorToken || leadBusy) return;
    if (!phone.trim() && !email.trim() && !igHandle.trim()) return;
    setLeadBusy(true);
    try {
      const res = await fetch("/api/concierge/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          visitorToken,
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          igHandle: igHandle.trim() || undefined,
          summary: leadNote.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Lead failed");
      setMessages((prev) => [
        ...prev,
        {
          id: `lead_${Date.now()}`,
          role: "assistant",
          content:
            "Locked in — thank you for trusting me with that. A human will follow up with the rhythm we promised.",
        },
      ]);
      setPhone("");
      setEmail("");
      setIgHandle("");
      setLeadNote("");
      setFunnelStage("followup");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not save lead");
    } finally {
      setLeadBusy(false);
    }
  };

  const showLeadStrip = funnelStage === "lead_capture" || funnelStage === "escalation";

  return (
    <>
      {/* Launcher */}
      <button
        type="button"
        aria-label="Open concierge chat"
        onClick={() => setOpen((o) => !o)}
        style={{
          position: "fixed",
          right: "max(16px, env(safe-area-inset-right))",
          bottom: "max(18px, env(safe-area-inset-bottom))",
          zIndex: 320,
          width: "56px",
          height: "56px",
          borderRadius: "50%",
          border: "none",
          cursor: "pointer",
          background: "linear-gradient(145deg,#141416,#2d2a26)",
          color: "#f5f2ea",
          boxShadow: "0 18px 42px rgba(15,15,15,0.38)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "transform 0.18s ease",
        }}
      >
        {open ? <X style={{ width: 22, height: 22 }} /> : <MessageCircle style={{ width: 24, height: 24 }} />}
      </button>

      {/* Panel */}
      {open && (
        <div
          style={{
            position: "fixed",
            right: "max(16px, env(safe-area-inset-right))",
            bottom: "max(88px, calc(env(safe-area-inset-bottom) + 78px))",
            zIndex: 319,
            width: "min(420px, calc(100vw - 28px))",
            maxHeight: "min(72vh, 640px)",
            borderRadius: "22px",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            background: "linear-gradient(165deg, rgba(22,22,24,0.96), rgba(12,12,14,0.98))",
            color: "#f5f2ea",
            boxShadow: "0 28px 70px rgba(0,0,0,0.55)",
            backdropFilter: "blur(14px)",
          }}
        >
          <div
            style={{
              padding: "14px 16px 12px",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <div
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "14px",
                background: "linear-gradient(135deg,#d4a574,#b8956c)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Sparkles style={{ width: 18, height: 18, color: "#141416" }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "13px", fontWeight: 800, letterSpacing: "-0.02em" }}>AIH Studios</div>
              <div style={{ fontSize: "11px", color: "rgba(245,242,234,0.55)", fontWeight: 600 }}>
                {modeLabel} · <span style={{ textTransform: "capitalize" }}>{funnelStage.replace(/_/g, " ")}</span>
              </div>
            </div>
            <button
              type="button"
              aria-label="Collapse chat"
              onClick={() => setOpen(false)}
              style={{
                border: "none",
                background: "rgba(255,255,255,0.06)",
                borderRadius: "10px",
                width: "34px",
                height: "34px",
                color: "#f5f2ea",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ChevronDown style={{ width: 18, height: 18 }} />
            </button>
          </div>

          {demoBanner && (
            <div
              style={{
                padding: "8px 14px",
                fontSize: "11px",
                fontWeight: 700,
                background: "rgba(212,165,116,0.14)",
                color: "#e8d9c8",
                borderBottom: "1px solid rgba(212,165,116,0.18)",
              }}
            >
              Demo mode — add OPENAI_API_KEY for live concierge intelligence.
            </div>
          )}

          {bootError && (
            <div style={{ padding: "10px 14px", fontSize: "12px", color: "#fca5a5" }}>{bootError}</div>
          )}

          <div
            ref={scrollRef}
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "14px 14px 10px",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            {messages.map((m) => (
              <div
                key={m.id}
                style={{
                  alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: "92%",
                  padding: "10px 13px",
                  borderRadius: "16px",
                  fontSize: "13px",
                  lineHeight: 1.55,
                  background:
                    m.role === "user"
                      ? "linear-gradient(135deg,#3b342c,#2a2622)"
                      : "rgba(255,255,255,0.06)",
                  border: m.role === "user" ? "1px solid rgba(212,165,116,0.18)" : "1px solid rgba(255,255,255,0.06)",
                  color: "#f5f2ea",
                  whiteSpace: "pre-wrap",
                }}
              >
                {m.content}
              </div>
            ))}

            {(thinking || streaming) && (
              <div
                style={{
                  alignSelf: "flex-start",
                  maxWidth: "92%",
                  padding: "10px 13px",
                  borderRadius: "16px",
                  fontSize: "13px",
                  lineHeight: 1.55,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  color: "rgba(245,242,234,0.85)",
                  whiteSpace: "pre-wrap",
                }}
              >
                {streaming || (thinking ? "…" : "")}
                {thinking && !streaming && (
                  <span style={{ opacity: 0.45 }}>
                    {" "}
                    <span className="aih-dots">thinking</span>
                  </span>
                )}
              </div>
            )}
          </div>

          {quickReplies.length > 0 && (
            <div
              style={{
                display: "flex",
                gap: "6px",
                flexWrap: "wrap",
                padding: "0 14px 10px",
              }}
            >
              {quickReplies.slice(0, 5).map((q) => (
                <button
                  key={q}
                  type="button"
                  disabled={thinking}
                  onClick={() => sendText(q)}
                  style={{
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: "999px",
                    padding: "6px 11px",
                    fontSize: "11px",
                    fontWeight: 700,
                    background: "rgba(255,255,255,0.05)",
                    color: "#f5f2ea",
                    cursor: thinking ? "wait" : "pointer",
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {showLeadStrip && (
            <div style={{ padding: "0 14px 12px", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "10px" }}>
              <div style={{ fontSize: "11px", fontWeight: 800, letterSpacing: "0.06em", color: "rgba(245,242,234,0.45)", marginBottom: "8px" }}>
                LEAVE A THREAD BACK
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                <input
                  placeholder="Phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={leadInputStyle}
                />
                <input
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={leadInputStyle}
                />
              </div>
              <input
                placeholder="Instagram @handle"
                value={igHandle}
                onChange={(e) => setIgHandle(e.target.value)}
                style={{ ...leadInputStyle, marginTop: "8px", width: "100%", boxSizing: "border-box" }}
              />
              <textarea
                placeholder="Anything else we should remember?"
                value={leadNote}
                onChange={(e) => setLeadNote(e.target.value)}
                rows={2}
                style={{
                  ...leadInputStyle,
                  marginTop: "8px",
                  width: "100%",
                  boxSizing: "border-box",
                  resize: "vertical",
                  minHeight: "52px",
                }}
              />
              <button
                type="button"
                disabled={leadBusy || thinking}
                onClick={submitLead}
                style={{
                  marginTop: "10px",
                  width: "100%",
                  border: "none",
                  borderRadius: "12px",
                  padding: "11px",
                  fontWeight: 800,
                  fontSize: "13px",
                  cursor: leadBusy ? "wait" : "pointer",
                  background: "linear-gradient(135deg,#d4a574,#b8956c)",
                  color: "#141416",
                }}
              >
                {leadBusy ? "Sending…" : "Send to the studio"}
              </button>
            </div>
          )}

          <div style={{ padding: "10px 12px 14px", borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", gap: "8px" }}>
            <input
              placeholder="Say what's on your mind…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendText(draft);
                }
              }}
              style={{
                flex: 1,
                borderRadius: "14px",
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.04)",
                color: "#f5f2ea",
                padding: "11px 12px",
                fontSize: "13px",
                outline: "none",
              }}
            />
            <button
              type="button"
              disabled={thinking || !draft.trim()}
              onClick={() => sendText(draft)}
              style={{
                border: "none",
                borderRadius: "14px",
                width: "46px",
                background: "rgba(212,165,116,0.22)",
                color: "#f5f2ea",
                cursor: thinking || !draft.trim() ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Send style={{ width: 18, height: 18 }} />
            </button>
          </div>
        </div>
      )}

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes aihPulse {
          0%, 100% { opacity: 0.35; }
          50% { opacity: 0.9; }
        }
        .aih-dots::after {
          content: "\\2026";
          animation: aihPulse 1.2s ease-in-out infinite;
        }
      `,
        }}
      />
    </>
  );
}

const leadInputStyle: CSSProperties = {
  borderRadius: "10px",
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.04)",
  color: "#f5f2ea",
  padding: "9px 10px",
  fontSize: "12px",
  outline: "none",
};
