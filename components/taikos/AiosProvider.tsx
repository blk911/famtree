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
import { resolveContractType } from "@/lib/taikos/actions/action-registry";
import type { TaikosActionPreviewResult } from "@/lib/taikos/actions/types";
import type { AiosAction, AiosPanelLayout, AiosPanelMode, AiosResponse } from "@/lib/taikos/types";

const IDLE_MS = 30_000;

type ActionPreviewState = {
  loading: boolean;
  confirming: boolean;
  preview: TaikosActionPreviewResult | null;
  confirmedMessage: string | null;
  draftHref: string | null;
  draftReviewHint: string | null;
  sourceActionId?: string;
  logRefresh: number;
  draftRefresh: number;
};

type AiosContextValue = {
  open: boolean;
  loading: boolean;
  response: AiosResponse | null;
  panelLayout: AiosPanelLayout;
  actionPreview: ActionPreviewState | null;
  openPanel: (mode?: AiosPanelMode) => void;
  closePanel: () => void;
  askQuestion: (question: string) => void;
  runContractAction: (action: AiosAction) => void;
  confirmContractAction: () => void;
  cancelContractPreview: () => void;
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
      actionPreview: null,
      openPanel: () => undefined,
      closePanel: () => undefined,
      askQuestion: () => undefined,
      runContractAction: () => undefined,
      confirmContractAction: () => undefined,
      cancelContractPreview: () => undefined,
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
  const [actionPreview, setActionPreview] = useState<ActionPreviewState | null>(null);
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
    setActionPreview(null);
  }, [clearIdleTimer]);

  const runContractAction = useCallback(
    async (action: AiosAction) => {
      const contractType = resolveContractType(action);
      if (!contractType) return;

      setActionPreview({
        loading: true,
        confirming: false,
        preview: null,
        confirmedMessage: null,
        draftHref: null,
        draftReviewHint: null,
        sourceActionId: action.id,
        logRefresh: 0,
        draftRefresh: 0,
      });

      try {
        const res = await fetch("/api/taikos/actions/preview", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            actionType: contractType,
            pathname,
            analysisId,
            payload: action.payload,
          }),
        });
        const json = (await res.json()) as {
          ok: boolean;
          data?: TaikosActionPreviewResult;
        };
        if (res.ok && json.ok && json.data) {
          setActionPreview({
            loading: false,
            confirming: false,
            preview: json.data,
            confirmedMessage: null,
            draftHref: null,
            draftReviewHint: null,
            sourceActionId: action.id,
            logRefresh: 0,
            draftRefresh: 0,
          });
        } else {
          setActionPreview(null);
        }
      } catch {
        setActionPreview(null);
      }
      await recordInteraction();
    },
    [pathname, analysisId, recordInteraction],
  );

  const confirmContractAction = useCallback(async () => {
    if (!actionPreview?.preview) return;

    setActionPreview((prev) =>
      prev ? { ...prev, confirming: true } : prev,
    );

    try {
      const res = await fetch("/api/taikos/actions/confirm", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionType: actionPreview.preview.action.type,
          previewId: actionPreview.preview.previewId,
          pathname,
          analysisId,
          sourceRecommendationId: actionPreview.sourceActionId,
        }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        data?: {
          message: string;
          draftId?: string;
          draftHref?: string;
          draftReviewHint?: string;
        };
      };
      if (res.ok && json.ok && json.data) {
        setActionPreview((prev) =>
          prev
            ? {
                ...prev,
                confirming: false,
                confirmedMessage: json.data!.message,
                draftHref: json.data!.draftHref ?? null,
                draftReviewHint: json.data!.draftReviewHint ?? null,
                logRefresh: prev.logRefresh + 1,
                draftRefresh: prev.draftRefresh + 1,
              }
            : prev,
        );
      } else {
        setActionPreview((prev) => (prev ? { ...prev, confirming: false } : prev));
      }
    } catch {
      setActionPreview((prev) => (prev ? { ...prev, confirming: false } : prev));
    }
    await recordInteraction();
  }, [actionPreview, pathname, analysisId, recordInteraction]);

  const cancelContractPreview = useCallback(() => {
    setActionPreview(null);
  }, []);

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
      actionPreview,
      openPanel,
      closePanel,
      askQuestion,
      runContractAction,
      confirmContractAction,
      cancelContractPreview,
    }),
    [
      open,
      loading,
      response,
      panelLayout,
      actionPreview,
      openPanel,
      closePanel,
      askQuestion,
      runContractAction,
      confirmContractAction,
      cancelContractPreview,
    ],
  );

  return <AiosCtx.Provider value={value}>{children}</AiosCtx.Provider>;
}

/** Renders tAIkOS inside the center content column. */
export function AiosCenterHost() {
  const {
    open,
    loading,
    response,
    panelLayout,
    actionPreview,
    closePanel,
    askQuestion,
    runContractAction,
    confirmContractAction,
    cancelContractPreview,
  } = useAios();

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
      actionPreview={actionPreview}
      onClose={closePanel}
      onInteraction={recordInteraction}
      onAskQuestion={(q) => void askQuestion(q)}
      onContractAction={(action) => void runContractAction(action)}
      onConfirmAction={() => void confirmContractAction()}
      onCancelPreview={cancelContractPreview}
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
