"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type {
  StudioBuilderStep,
  StudioDraftContentDTO,
  StudioTemplateType,
} from "@/types/studios/builder";
import { STUDIO_BUILDER_STEPS } from "@/types/studios/builder";
import { StudioTemplateStep } from "@/components/studios/builder/StudioTemplateStep";
import {
  StudioSourcesStep,
  type LocalSourceRow,
} from "@/components/studios/builder/StudioSourcesStep";
import { StudioDraftPreviewStep } from "@/components/studios/builder/StudioDraftPreviewStep";
import { StudioDraftReviewStep } from "@/components/studios/builder/StudioDraftReviewStep";
import { StudioPublishStep } from "@/components/studios/builder/StudioPublishStep";
import {
  addBuilderSource,
  createBuilderDraft,
  fetchBuilderDraft,
  generateBuilderDraft,
  patchBuilderDraft,
  publishBuilderDraft,
  removeBuilderSource,
  sourceDtoToLocalRow,
} from "@/lib/studios/builder/clientApi";

const STEP_LABELS: Record<StudioBuilderStep, string> = {
  choose_template: "Studio type",
  add_sources: "Sources",
  review_draft: "Review",
  publish: "Publish",
};

type Props = {
  isAuthenticated: boolean;
  initialDraftId?: string | null;
};

export function StudioBuilderShell({ isAuthenticated, initialDraftId }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<StudioBuilderStep>("choose_template");
  const [templateType, setTemplateType] = useState<StudioTemplateType | null>(null);
  const [sources, setSources] = useState<LocalSourceRow[]>([]);
  const [draftId, setDraftId] = useState<string | null>(initialDraftId ?? null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [sourceStatus, setSourceStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(initialDraftId && isAuthenticated));
  const [busy, setBusy] = useState(false);
  const [content, setContent] = useState<StudioDraftContentDTO | null>(null);
  const [draftStatus, setDraftStatus] = useState<string>("draft");
  const [publishedSlug, setPublishedSlug] = useState<string | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);

  const stepIndex = STUDIO_BUILDER_STEPS.indexOf(step);
  const readyToPublish = draftStatus === "reviewed" || Boolean(content?.approvals.globalApproved);
  const persistenceEnabled = Boolean(isAuthenticated && draftId);

  useEffect(() => {
    if (!isAuthenticated || !initialDraftId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const draft = await fetchBuilderDraft(initialDraftId);
        if (cancelled) return;
        setDraftId(draft.id);
        setTemplateType(draft.templateType);
        setStep(draft.builderStep);
        setContent(draft.content);
        setDraftStatus(draft.status);
        setSources((draft.sources ?? []).map(sourceDtoToLocalRow));
      } catch {
        if (!cancelled) setSaveMessage("Could not load draft.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialDraftId, isAuthenticated]);

  const ensureDraft = useCallback(async (): Promise<string | null> => {
    if (!isAuthenticated) return null;
    if (draftId) return draftId;
    if (!templateType) return null;
    setBusy(true);
    try {
      const draft = await createBuilderDraft({
        templateType,
        builderStep: step,
      });
      setDraftId(draft.id);
      router.replace(`/studios/create?draftId=${draft.id}`, { scroll: false });
      return draft.id;
    } catch (e) {
      setSaveMessage(e instanceof Error ? e.message : "Could not create draft.");
      return null;
    } finally {
      setBusy(false);
    }
  }, [isAuthenticated, draftId, templateType, step, router]);

  const goNext = useCallback(async () => {
    if (step === "choose_template" && !templateType) return;
    let activeDraftId = draftId;
    if (step === "choose_template" && isAuthenticated) {
      activeDraftId = await ensureDraft();
      if (!activeDraftId) return;
    }
    const next = STUDIO_BUILDER_STEPS[stepIndex + 1];
    if (!next) return;
    setStep(next);
    if (isAuthenticated && activeDraftId) {
      try {
        await patchBuilderDraft(activeDraftId, { builderStep: next });
      } catch {
        /* non-blocking */
      }
    }
  }, [step, stepIndex, templateType, isAuthenticated, ensureDraft, draftId]);

  const goBack = useCallback(() => {
    const prev = STUDIO_BUILDER_STEPS[stepIndex - 1];
    if (prev) setStep(prev);
  }, [stepIndex]);

  const handleSaveDraft = async () => {
    if (!isAuthenticated) {
      setSaveMessage("Sign in to save drafts to your account.");
      return;
    }
    if (!templateType) {
      setSaveMessage("Choose a studio type first.");
      return;
    }
    setBusy(true);
    setSaveMessage(null);
    try {
      if (draftId) {
        await patchBuilderDraft(draftId, {
          templateType,
          builderStep: step,
          ...(content ? { content } : {}),
        });
        setSaveMessage("Draft saved.");
      } else {
        const draft = await createBuilderDraft({ templateType, builderStep: step });
        setDraftId(draft.id);
        router.replace(`/studios/create?draftId=${draft.id}`, { scroll: false });
        setSaveMessage("Draft saved.");
      }
    } catch (e) {
      setSaveMessage(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleAddSource = async (row: Omit<LocalSourceRow, "id">) => {
    setSourceStatus(null);
    if (!isAuthenticated) {
      setSources((prev) => [
        ...prev,
        { ...row, id: `local-${Date.now()}-${prev.length}` },
      ]);
      setSourceStatus("Source added (sign in to persist).");
      return;
    }

    let activeDraftId = draftId;
    if (!activeDraftId) {
      activeDraftId = await ensureDraft();
      if (!activeDraftId) return;
    }

    setBusy(true);
    try {
      const source = await addBuilderSource(activeDraftId, {
        sourceType: row.sourceType,
        url: row.url || undefined,
        label: row.label || undefined,
      });
      setSources((prev) => [...prev, sourceDtoToLocalRow(source)]);
      setSourceStatus("Source saved.");
    } catch (e) {
      setSourceStatus(e instanceof Error ? e.message : "Invalid URL or source.");
    } finally {
      setBusy(false);
    }
  };

  const handleRemoveSource = async (id: string) => {
    setSourceStatus(null);
    if (id.startsWith("local-") || !draftId || !isAuthenticated) {
      setSources((prev) => prev.filter((s) => s.id !== id));
      return;
    }
    setBusy(true);
    try {
      await removeBuilderSource(draftId, id);
      setSources((prev) => prev.filter((s) => s.id !== id));
      setSourceStatus("Source removed.");
    } catch (e) {
      setSourceStatus(e instanceof Error ? e.message : "Could not remove source.");
    } finally {
      setBusy(false);
    }
  };

  const handleGenerate = async () => {
    if (!isAuthenticated) {
      setSaveMessage("Sign in to generate a draft.");
      return;
    }
    const id = await ensureDraft();
    if (!id) return;
    setBusy(true);
    setSaveMessage(null);
    try {
      const draft = await generateBuilderDraft(id);
      setContent(draft.content);
      setDraftStatus(draft.status);
      setSaveMessage("AI draft generated — review before publish.");
    } catch (e) {
      setSaveMessage(e instanceof Error ? e.message : "Generate failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleContentChange = async (next: StudioDraftContentDTO) => {
    setContent(next);
    if (draftId && isAuthenticated) {
      try {
        await patchBuilderDraft(draftId, { content: next });
      } catch {
        /* silent */
      }
    }
  };

  const handleMarkReady = async () => {
    if (!content || !draftId) return;
    const next = {
      ...content,
      approvals: {
        ...content.approvals,
        globalApproved: true,
        claimsConfirmed: content.approvals.claimsConfirmed,
      },
    };
    setContent(next);
    setBusy(true);
    try {
      await patchBuilderDraft(draftId, { status: "reviewed", content: next });
      setDraftStatus("reviewed");
      setSaveMessage("Ready to publish.");
    } catch (e) {
      setSaveMessage(e instanceof Error ? e.message : "Could not mark ready.");
    } finally {
      setBusy(false);
    }
  };

  const handlePublish = async () => {
    if (!draftId) return;
    setPublishError(null);
    setBusy(true);
    try {
      const result = await publishBuilderDraft(draftId);
      setPublishedSlug(result.slug);
      router.replace(`/studios/create?draftId=${draftId}`, { scroll: false });
      setDraftStatus("published");
      setContent(result.draft.content);
      setSaveMessage(result.alreadyPublished ? "Already published." : "Studio published.");
    } catch (e) {
      setPublishError(e instanceof Error ? e.message : "Publish failed.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center text-stone-500">
        Loading draft…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <header style={{ marginBottom: 28, textAlign: "center" }}>
        <p
          style={{
            margin: "0 0 8px",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "#a8a29e",
          }}
        >
          Studio Builder
        </p>
        <h1
          style={{
            margin: 0,
            fontSize: 28,
            fontWeight: 800,
            color: "#1c1917",
            letterSpacing: "-0.03em",
          }}
        >
          Create your published studio
        </h1>
        <p style={{ margin: "10px 0 0", fontSize: 14, color: "#78716c" }}>
          Template → sources → review → publish.{" "}
          <Link href="/studios/start" className="font-semibold text-stone-600 underline-offset-2 hover:underline">
            Classic editor
          </Link>
          {!isAuthenticated ? (
            <>
              {" · "}
              <Link href="/login" className="font-semibold text-stone-600 underline-offset-2 hover:underline">
                Sign in
              </Link>{" "}
              to save drafts
            </>
          ) : null}
        </p>
      </header>

      <nav
        aria-label="Builder steps"
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          justifyContent: "center",
          marginBottom: 28,
        }}
      >
        {STUDIO_BUILDER_STEPS.map((s, i) => {
          const active = s === step;
          const done = i < stepIndex;
          return (
            <span
              key={s}
              style={{
                padding: "6px 12px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 600,
                background: active ? "#44403c" : done ? "rgba(68,64,60,0.12)" : "rgba(255,255,255,0.6)",
                color: active ? "#fafaf9" : "#57534e",
                border: active ? "none" : "1px solid rgba(28,25,23,0.08)",
              }}
            >
              {i + 1}. {STEP_LABELS[s]}
            </span>
          );
        })}
      </nav>

      <div
        style={{
          padding: "24px 22px",
          borderRadius: 22,
          background: "rgba(255,255,255,0.55)",
          boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
          marginBottom: 20,
        }}
      >
        {step === "choose_template" ? (
          <StudioTemplateStep
            selected={templateType}
            onSelect={(id) => {
              setTemplateType(id);
              setSaveMessage(null);
            }}
          />
        ) : null}
        {step === "add_sources" ? (
          <StudioSourcesStep
            sources={sources}
            persistenceEnabled={persistenceEnabled}
            statusMessage={sourceStatus}
            disabled={busy}
            onAdd={handleAddSource}
            onRemove={handleRemoveSource}
          />
        ) : null}
        {step === "review_draft" ? (
          <>
            <StudioDraftPreviewStep
              templateType={templateType}
              sources={sources}
              content={content}
              onGenerate={() => void handleGenerate()}
              generating={busy}
              canGenerate={isAuthenticated}
            />
            {content ? (
              <div style={{ marginTop: 28, paddingTop: 24, borderTop: "1px solid rgba(28,25,23,0.1)" }}>
                <h3 style={{ margin: "0 0 12px", fontSize: 18, fontWeight: 700 }}>Edit draft</h3>
                <StudioDraftReviewStep
                  content={content}
                  onChange={(c) => void handleContentChange(c)}
                  onMarkReady={() => void handleMarkReady()}
                  readyToPublish={readyToPublish}
                  busy={busy}
                />
              </div>
            ) : null}
          </>
        ) : null}
        {step === "publish" ? (
          <StudioPublishStep
            readyToPublish={readyToPublish}
            publishing={busy}
            publishError={publishError}
            publishedSlug={publishedSlug}
            onPublish={() => void handlePublish()}
          />
        ) : null}
      </div>

      {saveMessage ? (
        <p role="status" style={{ margin: "0 0 16px", textAlign: "center", fontSize: 13, color: "#57534e" }}>
          {saveMessage}
        </p>
      ) : null}

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <button
          type="button"
          onClick={goBack}
          disabled={stepIndex === 0 || busy}
          style={{
            padding: "10px 18px",
            borderRadius: 14,
            border: "1px solid #d6d3d1",
            background: stepIndex === 0 ? "#f5f5f4" : "#fff",
            color: stepIndex === 0 ? "#a8a29e" : "#44403c",
            fontSize: 14,
            fontWeight: 600,
            cursor: stepIndex === 0 || busy ? "not-allowed" : "pointer",
          }}
        >
          Back
        </button>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={busy}
            style={{
              padding: "10px 18px",
              borderRadius: 14,
              border: "1px solid #d6d3d1",
              background: "rgba(255,255,255,0.9)",
              color: "#44403c",
              fontSize: 14,
              fontWeight: 600,
              cursor: busy ? "wait" : "pointer",
            }}
          >
            Save draft
          </button>
          {step !== "publish" ? (
            <button
              type="button"
              onClick={() => void goNext()}
              disabled={(step === "choose_template" && !templateType) || busy}
              style={{
                padding: "10px 22px",
                borderRadius: 14,
                border: "none",
                background:
                  (step === "choose_template" && !templateType) || busy ? "#d6d3d1" : "#44403c",
                color: "#fafaf9",
                fontSize: 14,
                fontWeight: 600,
                cursor:
                  (step === "choose_template" && !templateType) || busy ? "not-allowed" : "pointer",
              }}
            >
              Next
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
