"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Image as ImageIcon, X } from "lucide-react";
import { checkBrowserPostMediaFile } from "@/lib/media/image-sniff";
import {
  BROWSER_POST_MEDIA_ACCEPT,
  MAX_IMAGE_UPLOAD_BYTES,
  MAX_VIDEO_UPLOAD_BYTES,
} from "@/lib/media/upload-limits";

type SpaceOption = { id: string; kind: "BUSINESS" | "CLUB" | "CHURCH"; name: string | null };

type Member = { id: string; firstName: string; lastName: string };

const SCOPES = ["FAMILY", "BUSINESS", "CLUB", "CHURCH", "PRIVATE"] as const;

type Scope = (typeof SCOPES)[number];

export function DashboardPostComposer({
  composerSpaces,
  onRequestClose,
}: {
  composerSpaces: SpaceOption[];
  /** When set, shows a Close control to dismiss the composer (e.g. collapsed dashboard panel). */
  onRequestClose?: () => void;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [scope, setScope] = useState<Scope>("FAMILY");
  const [spaceId, setSpaceId] = useState("");
  const [visibleTo, setVisibleTo] = useState<string[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [previewFailed, setPreviewFailed] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/members")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.members)) setMembers(data.members);
      })
      .catch(() => {});
  }, []);

  const spacesForScope = useMemo(
    () => composerSpaces.filter((s) => s.kind === scope),
    [composerSpaces, scope],
  );

  useEffect(() => {
    if (scope !== "BUSINESS" && scope !== "CLUB" && scope !== "CHURCH") {
      setSpaceId("");
      return;
    }
    const first = composerSpaces.find((s) => s.kind === scope);
    setSpaceId((prev) => {
      if (prev && composerSpaces.some((s) => s.id === prev && s.kind === scope)) return prev;
      return first?.id ?? "";
    });
  }, [scope, composerSpaces]);

  useEffect(() => {
    if (scope !== "PRIVATE") setVisibleTo([]);
  }, [scope]);

  const clearImage = () => {
    setImageFile(null);
    setPreviewFailed(false);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const handleImageSelect = (file: File) => {
    setError("");
    void (async () => {
      const r = await checkBrowserPostMediaFile(file);
      if (!r.ok) {
        setError(r.error);
        clearImage();
        return;
      }
      setPreviewFailed(false);
      setImageFile(file);
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      setImagePreview(URL.createObjectURL(file));
    })();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;

    setSubmitting(true);
    setError("");

    try {
      let res: Response;
      if (imageFile) {
        const fd = new FormData();
        fd.append("body", text);
        fd.append("scope", scope);
        if (scope === "BUSINESS" || scope === "CLUB" || scope === "CHURCH") {
          if (spaceId) fd.append("spaceId", spaceId);
        }
        fd.append("image", imageFile);
        if (imageUrl.trim()) fd.append("imageUrl", imageUrl.trim());
        if (scope === "PRIVATE" && visibleTo.length > 0) {
          fd.append("visibleTo", JSON.stringify(visibleTo));
        }
        res = await fetch("/api/profile/posts", { method: "POST", body: fd });
      } else {
        res = await fetch("/api/profile/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            body: text,
            scope,
            ...(scope === "BUSINESS" || scope === "CLUB" || scope === "CHURCH"
              ? spaceId
                ? { spaceId }
                : {}
              : {}),
            imageUrl: imageUrl.trim() || undefined,
            ...(scope === "PRIVATE" && visibleTo.length > 0 ? { visibleTo } : {}),
          }),
        });
      }

      const raw = await res.text();
      let data: { error?: string; code?: string } = {};
      if (raw) {
        try {
          data = JSON.parse(raw) as typeof data;
        } catch {
          /* non-JSON (e.g. HTML error page) */
        }
      }

      if (!res.ok) {
        if (res.status === 413) {
          setError(
            `That attachment is too large for the server (images max ${MAX_IMAGE_UPLOAD_BYTES / (1024 * 1024)} MB, videos max ${MAX_VIDEO_UPLOAD_BYTES / (1024 * 1024)} MB). Try a smaller file or shorter clip.`,
          );
          return;
        }
        if (data?.code === "NOT_ALLOWED_FOR_SCOPE") {
          setError("You don't have access to post in that space.");
        } else if (typeof data?.error === "string" && data.error.trim()) {
          setError(data.error);
        } else {
          setError(`Could not create post (${res.status}).`);
        }
        return;
      }

      setBody("");
      setImageUrl("");
      setVisibleTo([]);
      clearImage();
      router.refresh();
    } catch {
      setError("Network error — check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const labStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    color: "#78716c",
    display: "block",
    marginBottom: 4,
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        marginBottom: 14,
        padding: "12px 14px",
        borderRadius: 10,
        border: "1px solid #e7e5e4",
        background: "#fafaf9",
      }}
    >
      {onRequestClose ? (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
          <button
            type="button"
            onClick={onRequestClose}
            style={{
              background: "none",
              border: "none",
              padding: "4px 8px",
              fontSize: 12,
              fontWeight: 600,
              color: "#78716c",
              cursor: "pointer",
              borderRadius: 6,
            }}
          >
            Close
          </button>
        </div>
      ) : null}

      {error ? (
        <div
          style={{
            marginBottom: 10,
            padding: "8px 10px",
            borderRadius: 8,
            background: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#b91c1c",
            fontSize: 12,
          }}
        >
          {error}
        </div>
      ) : null}

      <label style={labStyle}>What&apos;s on your mind?</label>
      <textarea
        value={body}
        onChange={(ev) => setBody(ev.target.value)}
        rows={2}
        placeholder="Write a short update…"
        style={{
          width: "100%",
          boxSizing: "border-box",
          resize: "none",
          borderRadius: 8,
          border: "1px solid #d6d3d1",
          padding: "8px 10px",
          fontSize: 13,
          marginBottom: 10,
          fontFamily: "inherit",
        }}
      />

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 10, alignItems: "flex-end" }}>
        <div style={{ flex: "1 1 140px", minWidth: 0 }}>
          <label style={labStyle}>Visibility</label>
          <select
            value={scope}
            onChange={(ev) => setScope(ev.target.value as Scope)}
            style={{
              width: "100%",
              borderRadius: 8,
              border: "1px solid #d6d3d1",
              padding: "7px 8px",
              fontSize: 12,
              background: "#fff",
            }}
          >
            <option value="FAMILY">Family</option>
            <option value="BUSINESS">Business</option>
            <option value="CLUB">Club</option>
            <option value="CHURCH">Church</option>
            <option value="PRIVATE">Private</option>
          </select>
        </div>

        {(scope === "BUSINESS" || scope === "CLUB" || scope === "CHURCH") && (
          <div style={{ flex: "1 1 160px", minWidth: 0 }}>
            <label style={labStyle}>Space</label>
            <select
              value={spaceId}
              onChange={(ev) => setSpaceId(ev.target.value)}
              style={{
                width: "100%",
                borderRadius: 8,
                border: "1px solid #d6d3d1",
                padding: "7px 8px",
                fontSize: 12,
                background: "#fff",
              }}
            >
              {spacesForScope.length === 0 ? (
                <option value="">No spaces — ask an admin</option>
              ) : (
                spacesForScope.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name?.trim() || `${s.kind} space`}
                  </option>
                ))
              )}
            </select>
          </div>
        )}
      </div>

      {scope === "PRIVATE" && members.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <label style={labStyle}>Share with (optional)</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {members.map((m) => {
              const on = visibleTo.includes(m.id);
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() =>
                    setVisibleTo((prev) => (on ? prev.filter((id) => id !== m.id) : [...prev, m.id]))
                  }
                  style={{
                    borderRadius: 999,
                    padding: "4px 10px",
                    fontSize: 11,
                    fontWeight: 600,
                    border: `1px solid ${on ? "#1c1917" : "#d6d3d1"}`,
                    background: on ? "#1c1917" : "#fff",
                    color: on ? "#fff" : "#44403c",
                    cursor: "pointer",
                  }}
                >
                  {m.firstName}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <label style={labStyle}>Image URL (optional)</label>
      <input
        value={imageUrl}
        onChange={(ev) => setImageUrl(ev.target.value)}
        placeholder="https://…"
        style={{
          width: "100%",
          boxSizing: "border-box",
          borderRadius: 8,
          border: "1px solid #d6d3d1",
          padding: "7px 10px",
          fontSize: 12,
          marginBottom: 10,
        }}
      />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {imagePreview ? (
            <div style={{ position: "relative", width: 44, height: 44, borderRadius: 8, overflow: "hidden", background: "#f5f5f4" }}>
              {imageFile?.type.startsWith("video/") ? (
                <video
                  src={imagePreview}
                  muted
                  playsInline
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : previewFailed ? (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  title="Preview not supported in this browser; upload may still work"
                >
                  <ImageIcon style={{ width: 20, height: 20, color: "#78716c" }} />
                </div>
              ) : (
                <img
                  src={imagePreview}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  onError={() => setPreviewFailed(true)}
                />
              )}
              <button
                type="button"
                onClick={clearImage}
                style={{
                  position: "absolute",
                  top: 2,
                  right: 2,
                  width: 18,
                  height: 18,
                  borderRadius: 999,
                  border: "none",
                  background: "rgba(0,0,0,0.55)",
                  color: "#fff",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 0,
                }}
              >
                <X style={{ width: 10, height: 10 }} />
              </button>
            </div>
          ) : null}
          <input
            ref={imageInputRef}
            type="file"
            accept={BROWSER_POST_MEDIA_ACCEPT}
            className="hidden"
            style={{ display: "none" }}
            onChange={(ev) => ev.target.files?.[0] && handleImageSelect(ev.target.files[0])}
          />
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 12px",
              borderRadius: 8,
              border: "1px solid #d6d3d1",
              background: "#fff",
              fontSize: 12,
              fontWeight: 600,
              color: "#44403c",
              cursor: "pointer",
            }}
          >
            <ImageIcon style={{ width: 14, height: 14 }} />
            Attach photo / video
          </button>
          <span style={{ fontSize: 10, color: "#a8a29e", flex: "1 1 180px" }}>
            Images JPG/PNG/WebP/GIF · max {MAX_IMAGE_UPLOAD_BYTES / (1024 * 1024)} MB · Videos MP4/MOV/WebM · max{" "}
            {MAX_VIDEO_UPLOAD_BYTES / (1024 * 1024)} MB
          </span>
        </div>

        <button
          type="submit"
          disabled={submitting || !body.trim()}
          style={{
            padding: "8px 18px",
            borderRadius: 8,
            border: "none",
            background: submitting || !body.trim() ? "#d6d3d1" : "#1c1917",
            color: "#fff",
            fontSize: 13,
            fontWeight: 700,
            cursor: submitting || !body.trim() ? "not-allowed" : "pointer",
          }}
        >
          {submitting ? "Posting…" : "Post"}
        </button>
      </div>
    </form>
  );
}
