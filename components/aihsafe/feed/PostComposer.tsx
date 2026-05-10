"use client";

import { useState } from "react";
import { createActivityPost } from "@/components/aihsafe/common/apiClient";
import { SpaceBadge }         from "@/components/aihsafe/feed/SpaceBadge";
import type { TrustUnitDTO }  from "@/types/aihsafe/dto";

interface Props {
  trustUnits:    TrustUnitDTO[];
  currentUserId: string;
  onPosted:      () => void;
}

export function PostComposer({ trustUnits, currentUserId, onPosted }: Props) {
  const [body,        setBody]        = useState("");
  const [spaceId,     setSpaceId]     = useState<string>("");
  const [submitting,  setSubmitting]  = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  const selectedSpace = trustUnits.find((u) => u.id === spaceId);

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
      onPosted();
    } else if (r.kind === "denied") {
      setError(`Governance check: ${r.message}`);
    } else {
      setError("Something went wrong — please try again.");
    }
  }

  return (
    <div
      style={{
        background:   "#fff",
        borderRadius: 16,
        border:       "1px solid #e7e5e4",
        padding:      "14px 16px",
        marginBottom: 16,
        boxShadow:    "0 1px 3px rgba(0,0,0,0.04)",
      }}
    >
      {/* Space picker */}
      {trustUnits.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
          <button
            type="button"
            onClick={() => setSpaceId("")}
            style={{
              background:   spaceId === "" ? "#f3f4f6" : "#fff",
              border:       `1px solid ${spaceId === "" ? "#9ca3af" : "#e5e7eb"}`,
              borderRadius: 20,
              padding:      "3px 10px",
              fontSize:     11,
              fontWeight:   600,
              color:        "#374151",
              cursor:       "pointer",
            }}
          >
            Only me
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
                padding:      "3px 10px",
                fontSize:     11,
                fontWeight:   600,
                color:        spaceId === u.id ? "#7c3aed" : "#374151",
                cursor:       "pointer",
              }}
            >
              {u.name ?? u.kind}
            </button>
          ))}
        </div>
      )}

      {/* Text area */}
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={
          selectedSpace
            ? `Share something with ${selectedSpace.name ?? selectedSpace.kind}…`
            : "Share something with your family network…"
        }
        rows={3}
        disabled={submitting}
        aria-label="Post body"
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
        }}
      />

      {/* Footer row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
        <div style={{ fontSize: 11, color: "#9ca3af" }}>
          {selectedSpace ? (
            <>Sharing to: <SpaceBadge name={selectedSpace.name ?? selectedSpace.kind} /></>
          ) : (
            "Visible only to you"
          )}
        </div>
        <button
          type="button"
          onClick={submit}
          disabled={submitting || !body.trim()}
          style={{
            background:   "#7c3aed",
            color:        "#fff",
            border:       "none",
            borderRadius: 10,
            padding:      "8px 18px",
            fontSize:     13,
            fontWeight:   600,
            cursor:       "pointer",
            opacity:      submitting || !body.trim() ? 0.5 : 1,
          }}
          aria-label="Post to family network"
        >
          {submitting ? "Posting…" : "Post"}
        </button>
      </div>

      {error && (
        <p
          role="alert"
          style={{ marginTop: 8, fontSize: 12, color: "#dc2626", background: "#fef2f2", borderRadius: 8, padding: "4px 10px" }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
