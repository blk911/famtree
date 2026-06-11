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
import type { AiosPanelLayout, AiosPanelMode, AiosResponse } from "@/lib/taikos/types";

const IDLE_MS = 30_000;

type AiosContextValue = {
  open: boolean;
  loading: boolean;
  response: AiosResponse | null;
  panelLayout: AiosPanelLayout;
  openPanel: (mode?: AiosPanelMode) => void;
  closePanel: () => void;
  askQuestion: (question: string) => void;
};

const AiosCtx = createContext<AiosContextValue | null>(null);

export function useAios(): AiosContextValue {
  const ctx = useContext(AiosCtx);
  if (!ctx) {
    return {
      open: false,
      loading: false,
      response: null,
      panelLayout: "center-panel",
      openPanel: () => undefined,
      closePanel: () => undefined,
      askQuestion: () => undefined,
    };
  }
  return ctx;
}

type Props = {
  children: ReactNode;
  analysisId?: string;
};

function usePanelLayout(): AiosPanelLayout {
  const [layout, setLayout] = useState<AiosPanelLayout>("center-panel");
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setLayout(mq.matches ? "modal" : "center-panel");
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return layout;
}

export function AiosProvider({ children, analysisId }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const panelLayout = usePanelLayout();
  const [open, setOpen] = useState(false);
  const [response, setResponse] = useState<AiosResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const collapseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoOpened = useRef(false);

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
          setResponse({
            ...json.data.response,
            layout: json.data.response.layout ?? panelLayout,
          });
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
    [query, panelLayout],
  );

  const clearIdleTimer = useCallback(() => {
    if (idleTimer.current) {
      clearTimeout(idleTimer.current);
      idleTimer.current = null;
    }
    if (collapseTimer.current) {
      clearTimeout(collapseTimer.current);
      collapseTimer.current = null;
    }
  }, []);

  const scheduleIdleCollapse = useCallback(() => {
    clearIdleTimer();
    idleTimer.current = setTimeout(async () => {
      await fetchBriefing("idle-summary");
      collapseTimer.current = setTimeout(() => {
        setOpen(false);
        setResponse(null);
      }, 3200);
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
      setOpen(true);
      await fetchBriefing(mode);
      await recordInteraction();
      scheduleIdleCollapse();
    },
    [fetchBriefing, recordInteraction, scheduleIdleCollapse],
  );

  const askQuestion = useCallback(
    async (question: string) => {
      setOpen(true);
      await fetchBriefing("question", question);
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
          data?: {
            firstLoginToday: boolean;
            loginCountToday: number;
            newActivity: boolean;
            currentSession?: { briefingShownToday: boolean };
          };
        };
        if (cancelled || !ctxJson.ok || !ctxJson.data) return;
        setHasSession(true);

        const shouldOpen =
          ctxJson.data.firstLoginToday ||
          (ctxJson.data.loginCountToday === 2 && !ctxJson.data.currentSession?.briefingShownToday) ||
          (ctxJson.data.newActivity && !ctxJson.data.currentSession?.briefingShownToday);

        if (shouldOpen && !autoOpened.current) {
          autoOpened.current = true;
          setOpen(true);
          await fetchBriefing("briefing");
          scheduleIdleCollapse();
        }
      } catch {
        // silent
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

  useEffect(() => () => clearIdleTimer(), [clearIdleTimer]);

  const value = useMemo(
    () => ({
      open,
      loading,
      response,
      panelLayout,
      openPanel,
      closePanel,
      askQuestion,
    }),
    [open, loading, response, panelLayout, openPanel, closePanel, askQuestion],
  );

  return <AiosCtx.Provider value={value}>{children}</AiosCtx.Provider>;
}

/** Renders tAIkOS inside the center content column. */
export function AiosCenterHost() {
  const { open, loading, response, panelLayout, closePanel, askQuestion } = useAios();

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
  }, []);

  return (
    <AiosPanel
      open={open}
      response={response}
      loading={loading}
      layout={response?.layout ?? panelLayout}
      onClose={closePanel}
      onInteraction={recordInteraction}
      onAskQuestion={(q) => void askQuestion(q)}
    />
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
