"use client";

import { useState, useEffect } from "react";
import { createActivityPost }  from "@/components/aihsafe/common/apiClient";
import { SpaceBadge }          from "@/components/aihsafe/feed/SpaceBadge";
import {
  INTEREST_CATEGORIES,
  getAllowedCategories,
  type InterestCategory,
} from "@/lib/aihsafe/interests/categories";
import type { TrustUnitDTO } from "@/types/aihsafe/dto";
import {
  vaultSpaceTypeHeaderLabel,
  vaultSpaceTypeShortLabel,
} from "@/lib/aihsafe/vault-space";
import { SPACES } from "@/lib/product/communication-copy";

// ─── Category chip (child PostComposer) ───────────────────────────────────────

function CategoryChip({
  category,
  selected,
  onSelect,
}: {
  category: InterestCategory;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      title={category.description}
      style={{
        display:      "inline-flex",
        alignItems:   "center",
        gap:          5,
        padding:      "4px 10px",
        borderRadius: 20,
        border:       `1px solid ${selected ? "#6366f1" : "#e7e5e4"}`,
        background:   selected ? "#eef2ff" : "#fff",
        color:        selected ? "#4338ca" : "#57534e",
        fontSize:     12,
        fontWeight:   selected ? 700 : 500,
        cursor:       "pointer",
        transition:   "all 0.12s",
        userSelect:   "none",
      }}
    >
      <span style={{ fontSize: 14 }}>{category.emoji}</span>
      {category.label}
    </button>
  );
}

interface Props {
  trustUnits:    TrustUnitDTO[];
  currentUserId: string;
  onPosted:      () => void;
  /** Softens copy for minors — UI only; governance remains authoritative. */
  viewerMode?:   "founder" | "member" | "child";
  /**
   * IDs of categories the child may select. Empty = all enabled categories.
   * Only used when viewerMode === "child". UI-local — not submitted to API this pass.
   */
  allowedCategoryIds?: string[];
  /**
   * When Activity tab is scoped to one trust unit, pre-select it in the composer.
   */
  composerPresetTrustUnitId?: string | null;
}

export function PostComposer({
  trustUnits,
  currentUserId,
  onPosted,
  viewerMode = "founder",
  allowedCategoryIds = [],
  composerPresetTrustUnitId = null,
}: Props) {
  const [body,               setBody]               = useState("");
  const [spaceId,            setSpaceId]            = useState<string>("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [submitting,         setSubmitting]          = useState(false);
  const [error,              setError]               = useState<string | null>(null);

  // Categories for child view — all enabled by default (empty allowedIds = no filter).
  const childCategories: readonly InterestCategory[] =
    viewerMode === "child" ? getAllowedCategories(allowedCategoryIds) : [];

  useEffect(() => {
    if (
      composerPresetTrustUnitId &&
      trustUnits.some((u) => u.id === composerPresetTrustUnitId)
    ) {
      setSpaceId(composerPresetTrustUnitId);
    }
  }, [composerPresetTrustUnitId, trustUnits]);

  const selectedSpace = trustUnits.find((u) => u.id === spaceId);
  const hasSpaces     = trustUnits.length > 0;

  async function submit() {
    if (!body.trim()) return;
    setSubmitting(true);
    setError(null);

    const r = await createActivityPost({
      bodyText:        body.trim(),
      trustUnitId:     spaceId || undefined,
      visibilityScope: spaceId ? "trust_unit" : "private",
    });

    setSubmitting(false);

    if (r.kind === "ok") {
      setBody("");
      setSpaceId("");
      setSelectedCategoryId(null);
      onPosted();
    } else if (r.kind === "denied") {
      setError(`Governance check: ${r.message}`);
    } else {
      setError("Something went wrong — please try again.");
    }
  }

  /* ── No-spaces state ── */
  if (!hasSpaces) {
    return (
      <div
        style={{
          background:   "#fff",
          borderRadius: 16,
          border:       "1px solid #e7e5e4",
          padding:      "20px 20px",
          marginBottom: 16,
          boxShadow:    "0 1px 3px rgba(0,0,0,0.04)",
          textAlign:    "center",
        }}
      >
        <div style={{ fontSize: 28, marginBottom: 8 }}>🤝</div>
        <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: 14, color: "#1c1917" }}>
          Create a trusted space to start sharing
        </p>
        <p style={{ margin: 0, fontSize: 12, color: "#78716c", maxWidth: 320, marginInline: "auto" }}>
          Posts are scoped to trusted spaces — your family, a peer pod, or any circle you govern. Use Quick Actions to create your first space.
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        background:   "#fff",
        borderRadius: 16,
        border:       "1px solid #e7e5e4",
        padding:      "14px 16px 12px",
        marginBottom: 16,
        boxShadow:    "0 1px 3px rgba(0,0,0,0.04)",
      }}
    >
      {/* Audience label — phrasing adjusted for minor accounts */}
      <div style={{ fontSize: 11, fontWeight: 600, color: "#a8a29e", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>
        {viewerMode === "child" ? "Share within your approved circle" : "Who sees this?"}
      </div>

      {/* Space picker */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        <button
          type="button"
          onClick={() => setSpaceId("")}
          style={{
            background:   spaceId === "" ? "#f3f4f6" : "#fff",
            border:       `1px solid ${spaceId === "" ? "#9ca3af" : "#e5e7eb"}`,
            borderRadius: 20,
            padding:      "4px 12px",
            fontSize:     12,
            fontWeight:   spaceId === "" ? 700 : 500,
            color:        "#374151",
            cursor:       "pointer",
            transition:   "all 0.12s",
          }}
        >
          🔒 Only me
        </button>
        {trustUnits.map((u) => (
          <button
            key={u.id}
            type="button"
            onClick={() => setSpaceId(u.id)}
            style={{
              background:   spaceId === u.id ? "#ede9fe" : "#fff",
              border:       `1px solid ${spaceId === u.id ? "#7c3aed" : "#e5e7eb"}`,
              borderRadius: 20,
              padding:      "4px 12px",
              fontSize:     12,
              fontWeight:   spaceId === u.id ? 700 : 500,
              color:        spaceId === u.id ? "#7c3aed" : "#374151",
              cursor:       "pointer",
              transition:   "all 0.12s",
            }}
          >
            {u.name?.trim()
              ? u.name
              : vaultSpaceTypeShortLabel(u.vaultSpaceType)}
          </button>
        ))}
      </div>

      {/* Category chip row — child/teen viewerMode only (UI-local; not submitted to API) */}
      {viewerMode === "child" && childCategories.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#a8a29e", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>
            What&apos;s this about?
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {childCategories.map((cat) => (
              <CategoryChip
                key={cat.id}
                category={cat}
                selected={selectedCategoryId === cat.id}
                onSelect={() =>
                  setSelectedCategoryId((prev) => (prev === cat.id ? null : cat.id))
                }
              />
            ))}
          </div>
        </div>
      )}

      {/* Text area */}
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={
          selectedSpace
            ? SPACES.postPlaceholder(vaultSpaceTypeHeaderLabel(selectedSpace.vaultSpaceType))
            : viewerMode === "child"
              ? "Visible only to you — select an approved space above to post an update."
              : SPACES.postPlaceholderNoSpace
        }
        rows={3}
        disabled={submitting}
        aria-label="Post body"
        onKeyDown={(e) => {
          if (e.key === "Enter" && e.metaKey) { e.preventDefault(); submit(); }
        }}
        style={{
          width:      "100%",
          borderRadius: 10,
          border:     "1px solid #e5e7eb",
          padding:    "8px 12px",
          fontSize:   13,
          resize:     "vertical",
          outline:    "none",
          fontFamily: "inherit",
          color:      "#111827",
          boxSizing:  "border-box",
          background: "#fafaf9",
          minHeight:  72,
        }}
      />

      {/* Footer row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
        <div style={{ fontSize: 11, color: "#9ca3af" }}>
          {selectedSpace ? (
            <>
              Sharing to:{" "}
              <SpaceBadge
                name={
                  selectedSpace.name?.trim()
                    ? `${selectedSpace.name} (${vaultSpaceTypeShortLabel(selectedSpace.vaultSpaceType)})`
                    : vaultSpaceTypeHeaderLabel(selectedSpace.vaultSpaceType)
                }
              />
            </>
          ) : (
            <span style={{ fontStyle: "italic" }}>Visible only to you</span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, color: "#c4c0bb" }}>⌘↵ to post</span>
          <button
            type="button"
            onClick={submit}
            disabled={submitting || !body.trim()}
            style={{
              background:   "#7c3aed",
              color:        "#fff",
              border:       "none",
              borderRadius: 10,
              padding:      "8px 20px",
              fontSize:     13,
              fontWeight:   600,
              cursor:       submitting || !body.trim() ? "not-allowed" : "pointer",
              opacity:      submitting || !body.trim() ? 0.45 : 1,
              transition:   "opacity 0.12s",
            }}
            aria-label="Post to family network"
          >
            {submitting ? "Posting…" : "Post"}
          </button>
        </div>
      </div>

      {error && (
        <p
          role="alert"
          style={{ marginTop: 8, fontSize: 12, color: "#dc2626", background: "#fef2f2", borderRadius: 8, padding: "6px 10px", margin: "8px 0 0" }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
