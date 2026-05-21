"use client";

import type { StudioDraftContentDTO, StudioTemplateType } from "@/types/studios/builder";
import { getStudioBuilderTemplate } from "@/lib/studios/builder/templates";
import type { LocalSourceRow } from "@/components/studios/builder/StudioSourcesStep";

type Props = {
  templateType: StudioTemplateType | null;
  sources: LocalSourceRow[];
  content: StudioDraftContentDTO | null;
  onGenerate: () => void;
  generating?: boolean;
  canGenerate: boolean;
};

export function StudioDraftPreviewStep({
  templateType,
  sources,
  content,
  onGenerate,
  generating,
  canGenerate,
}: Props) {
  const meta = templateType ? getStudioBuilderTemplate(templateType) : null;

  return (
    <div>
      <h2 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 700, color: "#1c1917" }}>
        AI draft
      </h2>
      <p style={{ margin: "0 0 16px", fontSize: 14, color: "#78716c", lineHeight: 1.5 }}>
        Generate a safe mock draft from your template and public source links — review every section
        before publish.
      </p>

      {content?.aiDraftLabel ? (
        <p
          style={{
            margin: "0 0 12px",
            padding: "10px 12px",
            borderRadius: 12,
            background: "#f5f5f4",
            fontSize: 13,
            fontWeight: 600,
            color: "#57534e",
          }}
        >
          {content.aiDraftLabel}
        </p>
      ) : null}

      <button
        type="button"
        disabled={!canGenerate || generating}
        onClick={onGenerate}
        style={{
          marginBottom: 20,
          padding: "10px 20px",
          borderRadius: 14,
          border: "none",
          background: !canGenerate || generating ? "#d6d3d1" : "#44403c",
          color: "#fafaf9",
          fontSize: 14,
          fontWeight: 600,
          cursor: !canGenerate || generating ? "not-allowed" : "pointer",
        }}
      >
        {generating ? "Generating…" : content ? "Regenerate draft" : "Generate draft"}
      </button>

      <div
        style={{
          padding: 20,
          borderRadius: 18,
          background: "rgba(255,255,255,0.9)",
          border: "1px solid rgba(28,25,23,0.08)",
        }}
      >
        <p style={{ margin: "0 0 12px", fontSize: 12, fontWeight: 600, color: "#a8a29e" }}>TEMPLATE</p>
        <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#1c1917" }}>
          {meta?.title ?? "— Select a template —"}
        </p>
        {content ? (
          <>
            <p style={{ margin: "16px 0 8px", fontSize: 12, fontWeight: 600, color: "#a8a29e" }}>HERO</p>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{content.hero.headline}</p>
            <p style={{ margin: "8px 0 0", fontSize: 13, color: "#57534e" }}>{content.hero.subcopy[0]}</p>
          </>
        ) : null}
        <p style={{ margin: "16px 0 8px", fontSize: 12, fontWeight: 600, color: "#a8a29e" }}>
          SOURCES ({sources.length})
        </p>
        {sources.length === 0 ? (
          <p style={{ margin: 0, fontSize: 13, color: "#78716c" }}>No public links — draft uses template defaults.</p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "#44403c" }}>
            {sources.map((s) => (
              <li key={s.id}>{s.sourceType}{s.url ? ` — ${s.url}` : ""}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
