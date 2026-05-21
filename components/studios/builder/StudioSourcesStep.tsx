"use client";

import { STUDIO_SOURCE_TYPES, type StudioSourceType } from "@/types/studios/builder";

const SOURCE_LABELS: Record<StudioSourceType, string> = {
  instagram: "Instagram",
  website: "Website",
  booking: "Booking page",
  glossgenius: "GlossGenius",
  vagaro: "Vagaro",
  square: "Square",
  youtube: "YouTube",
  facebook: "Facebook",
  google_business: "Google Business Profile",
  linkedin: "LinkedIn",
  manual: "Manual notes",
};

export type LocalSourceRow = {
  id: string;
  sourceType: StudioSourceType;
  url: string;
  label: string;
};

type Props = {
  sources: LocalSourceRow[];
  onAdd: (row: Omit<LocalSourceRow, "id">) => void | Promise<void>;
  onRemove: (id: string) => void | Promise<void>;
  persistenceEnabled?: boolean;
  statusMessage?: string | null;
  disabled?: boolean;
};

export function StudioSourcesStep({
  sources,
  onAdd,
  onRemove,
  persistenceEnabled = false,
  statusMessage,
  disabled = false,
}: Props) {
  return (
    <div>
      <h2
        style={{
          margin: "0 0 8px",
          fontSize: 22,
          fontWeight: 700,
          color: "#1c1917",
        }}
      >
        Add source links
      </h2>
      <p style={{ margin: "0 0 16px", fontSize: 14, color: "#78716c", lineHeight: 1.5 }}>
        Public URLs only — no passwords or private scraping. AI draft generation comes in a later
        step.
        {!persistenceEnabled ? (
          <span style={{ display: "block", marginTop: 8, color: "#a8a29e" }}>
            Sign in and save a draft to persist sources to your account.
          </span>
        ) : (
          <span style={{ display: "block", marginTop: 8, color: "#78716c" }}>
            Sources are saved to your draft.
          </span>
        )}
      </p>
      {statusMessage ? (
        <p
          role="status"
          style={{
            margin: "0 0 12px",
            fontSize: 13,
            color: statusMessage.toLowerCase().includes("invalid") ? "#b45309" : "#57534e",
          }}
        >
          {statusMessage}
        </p>
      ) : null}
      <StudioSourceAddForm onAdd={onAdd} disabled={disabled} />
      {sources.length > 0 ? (
        <ul style={{ listStyle: "none", margin: "20px 0 0", padding: 0, display: "grid", gap: 10 }}>
          {sources.map((s) => (
            <li
              key={s.id}
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 12,
                padding: "12px 14px",
                borderRadius: 14,
                background: "rgba(255,255,255,0.85)",
                border: "1px solid rgba(28,25,23,0.08)",
              }}
            >
              <div>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#44403c" }}>
                  {SOURCE_LABELS[s.sourceType]}
                  {s.label ? ` · ${s.label}` : ""}
                </span>
                {s.url ? (
                  <span
                    style={{
                      display: "block",
                      fontSize: 12,
                      color: "#78716c",
                      marginTop: 4,
                      wordBreak: "break-all",
                    }}
                  >
                    {s.url}
                  </span>
                ) : (
                  <span style={{ display: "block", fontSize: 12, color: "#78716c", marginTop: 4 }}>
                    Manual entry
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => void onRemove(s.id)}
                disabled={disabled}
                style={{
                  flexShrink: 0,
                  fontSize: 12,
                  color: "#78716c",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p style={{ marginTop: 20, fontSize: 13, color: "#a8a29e" }}>No sources added yet.</p>
      )}
    </div>
  );
}

function StudioSourceAddForm({
  onAdd,
  disabled,
}: {
  onAdd: (row: Omit<LocalSourceRow, "id">) => void | Promise<void>;
  disabled?: boolean;
}) {
  return (
    <form
      style={{
        display: "grid",
        gap: 10,
        padding: 16,
        borderRadius: 16,
        background: "rgba(255,255,255,0.65)",
        border: "1px dashed rgba(28,25,23,0.15)",
      }}
      onSubmit={(e) => {
        e.preventDefault();
        if (disabled) return;
        const fd = new FormData(e.currentTarget);
        const sourceType = fd.get("sourceType") as StudioSourceType;
        const url = String(fd.get("url") ?? "").trim();
        const label = String(fd.get("label") ?? "").trim();
        if (sourceType !== "manual" && !url) return;
        void Promise.resolve(onAdd({ sourceType, url, label })).then(() => {
          e.currentTarget.reset();
        });
      }}
    >
      <label style={{ fontSize: 12, fontWeight: 600, color: "#57534e" }}>
        Source type
        <select
          name="sourceType"
          defaultValue="website"
          style={{
            display: "block",
            width: "100%",
            marginTop: 4,
            padding: "8px 10px",
            borderRadius: 10,
            border: "1px solid #d6d3d1",
          }}
        >
          {STUDIO_SOURCE_TYPES.map((t) => (
            <option key={t} value={t}>
              {SOURCE_LABELS[t]}
            </option>
          ))}
        </select>
      </label>
      <label style={{ fontSize: 12, fontWeight: 600, color: "#57534e" }}>
        URL (https)
        <input
          name="url"
          type="url"
          placeholder="https://"
          style={{
            display: "block",
            width: "100%",
            marginTop: 4,
            padding: "8px 10px",
            borderRadius: 10,
            border: "1px solid #d6d3d1",
          }}
        />
      </label>
      <label style={{ fontSize: 12, fontWeight: 600, color: "#57534e" }}>
        Label (optional)
        <input
          name="label"
          type="text"
          style={{
            display: "block",
            width: "100%",
            marginTop: 4,
            padding: "8px 10px",
            borderRadius: 10,
            border: "1px solid #d6d3d1",
          }}
        />
      </label>
      <button
        type="submit"
        disabled={disabled}
        style={{
          justifySelf: "start",
          padding: "8px 16px",
          borderRadius: 12,
          border: "none",
          background: "#44403c",
          color: "#fafaf9",
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        Add source
      </button>
    </form>
  );
}
