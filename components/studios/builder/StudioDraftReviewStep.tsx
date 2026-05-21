"use client";

import type { StudioDraftContentDTO, StudioDraftConfidenceWarning } from "@/types/studios/builder";

type Props = {
  content: StudioDraftContentDTO | null;
  onChange: (content: StudioDraftContentDTO) => void;
  onMarkReady: () => void;
  readyToPublish: boolean;
  busy?: boolean;
};

function Field({
  label,
  value,
  onChange,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  const style = {
    display: "block",
    width: "100%",
    marginTop: 4,
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid #d6d3d1",
    fontSize: 13,
  } as const;
  return (
    <label style={{ display: "block", marginBottom: 12, fontSize: 12, fontWeight: 600, color: "#57534e" }}>
      {label}
      {multiline ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} style={style} />
      ) : (
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} style={style} />
      )}
    </label>
  );
}

function Warnings({ warnings }: { warnings: StudioDraftConfidenceWarning[] }) {
  if (!warnings.length) return null;
  return (
    <ul style={{ margin: "0 0 16px", padding: "12px 14px", borderRadius: 12, background: "#fffbeb", listStyle: "none" }}>
      {warnings.map((w, i) => (
        <li key={i} style={{ fontSize: 13, color: w.severity === "high" ? "#b45309" : "#78716c", marginBottom: 6 }}>
          <strong>{w.severity}:</strong> {w.message}
        </li>
      ))}
    </ul>
  );
}

export function StudioDraftReviewStep({ content, onChange, onMarkReady, readyToPublish, busy }: Props) {
  if (!content) {
    return (
      <p style={{ fontSize: 14, color: "#78716c" }}>
        Generate a draft first, then edit sections here.
      </p>
    );
  }

  const patch = (partial: Partial<StudioDraftContentDTO>) => onChange({ ...content, ...partial });

  return (
    <div>
      {content.aiDraftLabel ? (
        <p
          style={{
            margin: "0 0 16px",
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

      <Warnings warnings={content.confidenceWarnings} />

      <Field
        label="Studio name"
        value={content.identity.name}
        onChange={(name) => patch({ identity: { ...content.identity, name } })}
      />
      <Field
        label="Hero headline"
        value={content.hero.headline}
        onChange={(headline) => patch({ hero: { ...content.hero, headline } })}
      />
      <Field
        label="Hero subcopy"
        value={content.hero.subcopy.join("\n")}
        multiline
        onChange={(v) => patch({ hero: { ...content.hero, subcopy: v.split("\n").filter(Boolean) } })}
      />
      <Field
        label="Why Studios / benefits"
        value={content.benefits.body}
        multiline
        onChange={(body) => patch({ benefits: { ...content.benefits, body } })}
      />
      <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, fontSize: 13 }}>
        <input
          type="checkbox"
          checked={content.benefits.visible}
          onChange={(e) => patch({ benefits: { ...content.benefits, visible: e.target.checked } })}
        />
        Show benefits section
      </label>
      <Field
        label="How it works"
        value={content.howItWorks.body}
        multiline
        onChange={(body) => patch({ howItWorks: { ...content.howItWorks, body } })}
      />
      <Field
        label="Invite message"
        value={content.inviteCopy.inviteMessage}
        multiline
        onChange={(inviteMessage) =>
          patch({ inviteCopy: { ...content.inviteCopy, inviteMessage } })
        }
      />
      <Field
        label="Request access headline"
        value={content.requestAccessCopy.headline}
        onChange={(headline) =>
          patch({ requestAccessCopy: { ...content.requestAccessCopy, headline } })
        }
      />
      <Field
        label="First post"
        value={content.firstPosts[0]?.body ?? ""}
        multiline
        onChange={(body) => {
          const firstPosts = [...content.firstPosts];
          if (firstPosts[0]) firstPosts[0] = { ...firstPosts[0], body };
          else firstPosts.push({ id: "welcome-1", body, audience: "members", approved: false });
          patch({ firstPosts });
        }}
      />

      <label style={{ display: "flex", alignItems: "center", gap: 8, margin: "16px 0", fontSize: 13 }}>
        <input
          type="checkbox"
          checked={content.approvals.claimsConfirmed}
          onChange={(e) =>
            patch({
              approvals: { ...content.approvals, claimsConfirmed: e.target.checked },
            })
          }
        />
        I have reviewed generated claims and contact details
      </label>

      <button
        type="button"
        disabled={busy || readyToPublish}
        onClick={onMarkReady}
        style={{
          padding: "10px 18px",
          borderRadius: 14,
          border: "none",
          background: readyToPublish ? "#d6d3d1" : "#44403c",
          color: "#fafaf9",
          fontSize: 14,
          fontWeight: 600,
          cursor: busy || readyToPublish ? "not-allowed" : "pointer",
        }}
      >
        {readyToPublish ? "Ready to publish" : "Mark ready to publish"}
      </button>
    </div>
  );
}
