"use client";

/**
 * Inactivity sign-out: shared deadline across tabs via BroadcastChannel.
 * Hidden tabs freeze the idle timer (no schedule until visible again).
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

const CHANNEL = "famtree-idle-session-v1";
const WARNING_SECONDS = 25;
/** After this many warnings in the browser session, show timeout choices + security note */
const ESCALATION_AFTER = 3;

export type IdleTimeoutChoice = 3 | 5 | 10;

type IdleMsg =
  | { type: "ACTIVITY"; at: number }
  | { type: "OPEN_MODAL"; promptNum: number; endsAt: number }
  | { type: "CLOSE_MODAL" }
  | { type: "LOGOUT_NOW" };

const PROMPT_KEY = "famtree_idle_prompt_num";
/** Cross-tab mutex — visible tabs share timers; only one should allocate per idle episode */
const LEASE_KEY = "famtree_idle_modal_lease_ms";
const LEASE_MS = 2000;

function tryClaimIdleLease(): boolean {
  try {
    const now = Date.now();
    const raw = localStorage.getItem(LEASE_KEY);
    if (!raw) {
      localStorage.setItem(LEASE_KEY, String(now + LEASE_MS));
      return true;
    }
    const until = Number(raw);
    if (Number.isFinite(until) && now < until) return false;
    localStorage.setItem(LEASE_KEY, String(now + LEASE_MS));
    return true;
  } catch {
    return true;
  }
}

function clampIdleMinutes(v: unknown): IdleTimeoutChoice {
  if (v === 3 || v === 5 || v === 10) return v;
  return 5;
}

export function IdleSessionGuard({
  idleTimeoutMinutes: idleMinutesProp,
}: {
  idleTimeoutMinutes?: number | null;
}) {
  const router = useRouter();
  const [effectiveMinutes, setEffectiveMinutes] = useState<IdleTimeoutChoice>(() =>
    clampIdleMinutes(idleMinutesProp),
  );
  const [open, setOpen] = useState(false);
  const [promptNum, setPromptNum] = useState(0);
  const [remainingSec, setRemainingSec] = useState(WARNING_SECONDS);
  const [savingChoice, setSavingChoice] = useState(false);
  const [choiceError, setChoiceError] = useState("");

  const lastActivityRef = useRef(Date.now());
  const modalOpenRef = useRef(false);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const endsAtRef = useRef<number>(0);
  const chRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    setEffectiveMinutes(clampIdleMinutes(idleMinutesProp));
  }, [idleMinutesProp]);

  const clearIdleTimer = useCallback(() => {
    if (idleTimerRef.current !== null) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }, []);

  const clearCountdown = useCallback(() => {
    if (countdownTimerRef.current !== null) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
  }, []);

  const stopModalUi = useCallback(() => {
    clearCountdown();
    modalOpenRef.current = false;
    setOpen(false);
  }, [clearCountdown]);

  const performLogoutAllTabs = useCallback(async () => {
    stopModalUi();
    clearIdleTimer();
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      /* still navigate */
    }
    router.push("/login");
    router.refresh();
  }, [clearIdleTimer, router, stopModalUi]);

  const broadcast = useCallback((msg: IdleMsg) => {
    try {
      chRef.current?.postMessage(msg);
    } catch {
      /* ignore */
    }
  }, []);

  const bumpActivity = useCallback(() => {
    const at = Date.now();
    lastActivityRef.current = at;
    broadcast({ type: "ACTIVITY", at });
    if (modalOpenRef.current) {
      broadcast({ type: "CLOSE_MODAL" });
      stopModalUi();
    }
  }, [broadcast, stopModalUi]);

  const applyOpenModal = useCallback(
    (payload: { promptNum: number; endsAt: number }) => {
      clearIdleTimer();
      modalOpenRef.current = true;
      endsAtRef.current = payload.endsAt;
      setPromptNum(payload.promptNum);
      setRemainingSec(Math.max(0, Math.ceil((payload.endsAt - Date.now()) / 1000)));
      setOpen(true);

      clearCountdown();
      countdownTimerRef.current = setInterval(() => {
        const sec = Math.max(0, Math.ceil((endsAtRef.current - Date.now()) / 1000));
        setRemainingSec(sec);
        if (sec <= 0) {
          clearCountdown();
          broadcast({ type: "LOGOUT_NOW" });
          void performLogoutAllTabs();
        }
      }, 250);
    },
    [broadcast, clearCountdown, clearIdleTimer, performLogoutAllTabs],
  );

  const scheduleIdleTimer = useCallback(() => {
    clearIdleTimer();
    if (typeof document === "undefined") return;
    if (document.visibilityState !== "visible") return;

    const thresholdMs = effectiveMinutes * 60 * 1000;
    const elapsed = Date.now() - lastActivityRef.current;
    const wait = Math.max(0, thresholdMs - elapsed);

    idleTimerRef.current = setTimeout(() => {
      idleTimerRef.current = null;
      if (document.visibilityState !== "visible") return;

      const allocateModal = () => {
        if (!tryClaimIdleLease()) return;
        const prev = Number(sessionStorage.getItem(PROMPT_KEY) ?? "0");
        const next = prev + 1;
        sessionStorage.setItem(PROMPT_KEY, String(next));
        const endsAt = Date.now() + WARNING_SECONDS * 1000;
        broadcast({ type: "OPEN_MODAL", promptNum: next, endsAt });
        applyOpenModal({ promptNum: next, endsAt });
      };

      allocateModal();
    }, wait);
  }, [applyOpenModal, broadcast, clearIdleTimer, effectiveMinutes]);

  useEffect(() => {
    modalOpenRef.current = open;
  }, [open]);

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const ch = new BroadcastChannel(CHANNEL);
    chRef.current = ch;

    const onMessage = (ev: MessageEvent<IdleMsg>) => {
      const msg = ev.data;
      if (!msg || typeof msg !== "object") return;

      if (msg.type === "ACTIVITY") {
        lastActivityRef.current = Math.max(lastActivityRef.current, msg.at);
        if (modalOpenRef.current) {
          stopModalUi();
        }
        scheduleIdleTimer();
        return;
      }

      if (msg.type === "OPEN_MODAL") {
        if (document.visibilityState !== "visible") return;
        sessionStorage.setItem(PROMPT_KEY, String(msg.promptNum));
        applyOpenModal({ promptNum: msg.promptNum, endsAt: msg.endsAt });
        return;
      }

      if (msg.type === "CLOSE_MODAL") {
        stopModalUi();
        scheduleIdleTimer();
        return;
      }

      if (msg.type === "LOGOUT_NOW") {
        void performLogoutAllTabs();
      }
    };

    ch.addEventListener("message", onMessage);

    return () => {
      ch.removeEventListener("message", onMessage);
      ch.close();
      chRef.current = null;
    };
  }, [applyOpenModal, broadcast, performLogoutAllTabs, scheduleIdleTimer, stopModalUi]);

  useEffect(() => {
    const onActivity = () => {
      bumpActivity();
      scheduleIdleTimer();
    };

    const opts = { passive: true } as AddEventListenerOptions;
    window.addEventListener("mousemove", onActivity, opts);
    window.addEventListener("mousedown", onActivity);
    window.addEventListener("keydown", onActivity);
    window.addEventListener("scroll", onActivity, opts);
    window.addEventListener("touchstart", onActivity, opts);
    window.addEventListener("wheel", onActivity, opts);

    return () => {
      window.removeEventListener("mousemove", onActivity);
      window.removeEventListener("mousedown", onActivity);
      window.removeEventListener("keydown", onActivity);
      window.removeEventListener("scroll", onActivity);
      window.removeEventListener("touchstart", onActivity);
      window.removeEventListener("wheel", onActivity);
    };
  }, [bumpActivity, scheduleIdleTimer]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") {
        scheduleIdleTimer();
      } else {
        clearIdleTimer();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", scheduleIdleTimer);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", scheduleIdleTimer);
    };
  }, [clearIdleTimer, scheduleIdleTimer]);

  useEffect(() => {
    lastActivityRef.current = Date.now();
    scheduleIdleTimer();
    return () => {
      clearIdleTimer();
      clearCountdown();
    };
  }, [effectiveMinutes, clearCountdown, clearIdleTimer, scheduleIdleTimer]);

  const onStillHere = () => {
    bumpActivity();
    scheduleIdleTimer();
  };

  const onPickTimeout = async (m: IdleTimeoutChoice) => {
    setSavingChoice(true);
    setChoiceError("");
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idleTimeoutMinutes: m }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setChoiceError(typeof data?.error === "string" ? data.error : "Could not save");
        setSavingChoice(false);
        return;
      }
      setEffectiveMinutes(m);
      onStillHere();
    } catch {
      setChoiceError("Network error — try again");
    }
    setSavingChoice(false);
  };

  if (!open) return null;

  const showEscalation = promptNum >= ESCALATION_AFTER;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="idle-session-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        background: "rgba(15,23,42,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "440px",
          background: "white",
          borderRadius: "16px",
          padding: "26px 24px",
          boxShadow: "0 24px 60px rgba(0,0,0,0.2)",
          border: "1px solid #e7e5e4",
        }}
      >
        <h2
          id="idle-session-title"
          style={{ margin: "0 0 10px", fontSize: "18px", fontWeight: 700, color: "#1c1917" }}
        >
          Still there?
        </h2>
        <p style={{ margin: "0 0 18px", fontSize: "14px", lineHeight: 1.55, color: "#57534e" }}>
          You haven&apos;t interacted with AMIHUMAN.NET for a while. For your security, we&apos;ll sign you out
          automatically in{" "}
          <strong style={{ color: "#b91c1c" }}>{remainingSec}</strong> second{remainingSec === 1 ? "" : "s"} unless
          you choose to stay signed in.
        </p>

        {showEscalation && (
          <div
            style={{
              marginBottom: "18px",
              padding: "14px",
              background: "#fafaf9",
              borderRadius: "12px",
              border: "1px solid #e7e5e4",
            }}
          >
            <p style={{ margin: "0 0 10px", fontSize: "13px", lineHeight: 1.55, color: "#44403c" }}>
              An unattended session can put your family&apos;s private network at risk if someone else uses this
              device. Pick how long we should wait for activity before this warning appears again (maximum 10 minutes).
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {([3, 5, 10] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  disabled={savingChoice}
                  onClick={() => void onPickTimeout(m)}
                  style={{
                    padding: "8px 14px",
                    borderRadius: "999px",
                    border:
                      effectiveMinutes === m ? "2px solid #1c1917" : "1px solid #d6d3d1",
                    background: effectiveMinutes === m ? "#f5f5f4" : "white",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: savingChoice ? "wait" : "pointer",
                    color: "#292524",
                  }}
                >
                  {m} min
                </button>
              ))}
            </div>
            {choiceError ? (
              <p style={{ margin: "10px 0 0", fontSize: "12px", color: "#b91c1c" }}>{choiceError}</p>
            ) : null}
          </div>
        )}

        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={onStillHere}
            style={{
              padding: "11px 20px",
              borderRadius: "12px",
              border: "none",
              background: "#1c1917",
              color: "white",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Stay signed in
          </button>
        </div>
      </div>
    </div>
  );
}
