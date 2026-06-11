"use client";

import { usePathname, useSearchParams } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AiosLauncher } from "@/components/taikos/AiosLauncher";
import { AiosPanel } from "@/components/taikos/AiosPanel";
import type { AiosPanelMode, AiosResponse } from "@/lib/taikos/types";

const IDLE_MS = 30_000;

type AiosContextValue = {
  open: boolean;
  openPanel: (mode?: AiosPanelMode) => void;
  closePanel: () => void;
};

const AiosCtx = createContext<AiosContextValue | null>(null);

export function useAios(): AiosContextValue {
  const ctx = useContext(AiosCtx);
  if (!ctx) {
    return {
      open: false,
      openPanel: () => undefined,
      closePanel: () => undefined,
    };
  }
  return ctx;
}

type Props = {
  children: ReactNode;
  analysisId?: string;
};

export function AiosProvider({ children, analysisId }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [response, setResponse] = useState<AiosResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoOpened = useRef(false);
  const modeRef = useRef<AiosPanelMode>("briefing");

  const query = useMemo(() => {
    const params = new URLSearchParams();
    params.set("pathname", pathname);
    if (analysisId) params.set("analysisId", analysisId);
    const mode = searchParams.get("mode");
    if (mode) params.set("mode", mode);
    return params.toString();
  }, [pathname, analysisId, searchParams]);

  const fetchBriefing = useCallback(
    async (mode: AiosPanelMode, question?: string) => {
      setLoading(true);
      try {
        const params = new URLSearchParams(query);
        params.set("mode", mode);
        if (question) params.set("question", question);
        const res = await fetch(`/api/taikos/briefing?${params}`, {
          cache: "no-store",
          credentials: "include",
        });
        const json = (await res.json()) as {
          ok: boolean;
          data?: { response: AiosResponse };
        };
        if (res.ok && json.ok && json.data?.response) {
          setResponse(json.data.response);
          setHasSession(true);
        } else if (res.status === 401) {
          setHasSession(false);
          setResponse(null);
        }
      } catch {
        setResponse(null);
      } finally {
        setLoading(false);
      }
    },
    [query],
  );

  const clearIdleTimer = useCallback(() => {
    if (idleTimer.current) {
      clearTimeout(idleTimer.current);
      idleTimer.current = null;
    }
  }, []);

  const scheduleIdleCollapse = useCallback(() => {
    clearIdleTimer();
    idleTimer.current = setTimeout(async () => {
      await fetchBriefing("idle-summary");
      modeRef.current = "idle-summary";
      setTimeout(() => {
        setOpen(false);
        setResponse(null);
      }, 2800);
    }, IDLE_MS);
  }, [clearIdleTimer, fetchBriefing]);

  const recordInteraction = useCallback(async () => {
    try {
      await fetch("/api/taikos/session", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interaction: true }),
      });
    } catch {
      // non-blocking
    }
    scheduleIdleCollapse();
  }, [scheduleIdleCollapse]);

  const openPanel = useCallback(
    async (mode: AiosPanelMode = "page-assistant") => {
      modeRef.current = mode;
      setOpen(true);
      await fetchBriefing(mode);
      await recordInteraction();
      scheduleIdleCollapse();
    },
    [fetchBriefing, recordInteraction, scheduleIdleCollapse],
  );

  const closePanel = useCallback(() => {
    clearIdleTimer();
    setOpen(false);
  }, [clearIdleTimer]);

  useEffect(() => {
    let cancelled = false;
    async function maybeAutoBrief() {
      try {
        const ctxRes = await fetch(`/api/taikos/context?${query}&aiosOpen=0`, {
          cache: "no-store",
          credentials: "include",
        });
        if (!ctxRes.ok) return;
        const ctxJson = (await ctxRes.json()) as {
          ok: boolean;
          data?: { firstLoginToday: boolean; loginCountToday: number; newActivity: boolean };
        };
        if (cancelled || !ctxJson.ok || !ctxJson.data) return;
        setHasSession(true);

        const shouldOpen =
          ctxJson.data.firstLoginToday ||
          ctxJson.data.loginCountToday === 2 ||
          ctxJson.data.newActivity;

        if (shouldOpen && !autoOpened.current) {
          autoOpened.current = true;
          modeRef.current = "briefing";
          setOpen(true);
          await fetchBriefing("briefing");
          scheduleIdleCollapse();
        }
      } catch {
        // silent — launcher still works
      }
    }
    void maybeAutoBrief();
    return () => {
      cancelled = true;
    };
  }, [query, fetchBriefing, scheduleIdleCollapse]);

  useEffect(() => {
    if (!hasSession) return;
    void fetch("/api/taikos/session", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pathname }),
    });
  }, [pathname, hasSession]);

  useEffect(() => {
    return () => clearIdleTimer();
  }, [clearIdleTimer]);

  const value = useMemo(
    () => ({ open, openPanel, closePanel }),
    [open, openPanel, closePanel],
  );

  return (
    <AiosCtx.Provider value={value}>
      {children}
      <AiosPanel
        open={open}
        response={response}
        loading={loading}
        onClose={closePanel}
        onInteraction={recordInteraction}
      />
    </AiosCtx.Provider>
  );
}

export function AiosTopbarLauncher() {
  const { open, openPanel, closePanel } = useAios();
  return (
    <AiosLauncher
      active={open}
      onClick={() => {
        if (open) closePanel();
        else void openPanel("page-assistant");
      }}
    />
  );
}
