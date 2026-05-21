"use client";

import Link from "next/link";

type Props = {
  readyToPublish: boolean;
  publishing?: boolean;
  publishError?: string | null;
  publishedSlug?: string | null;
  onPublish: () => void;
};

export function StudioPublishStep({
  readyToPublish,
  publishing,
  publishError,
  publishedSlug,
  onPublish,
}: Props) {
  if (publishedSlug) {
    return (
      <div>
        <h2 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 700, color: "#1c1917" }}>
          Published
        </h2>
        <p style={{ margin: "0 0 16px", fontSize: 14, color: "#78716c" }}>
          Your studio is live. Members join via AIH invite — messaging stays in Msg Vault.
        </p>
        <Link
          href={`/studios/${publishedSlug}`}
          style={{
            display: "inline-flex",
            padding: "12px 20px",
            borderRadius: 14,
            background: "#44403c",
            color: "#fafaf9",
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          View public studio
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 700, color: "#1c1917" }}>
        Publish
      </h2>
      <p style={{ margin: "0 0 20px", fontSize: 14, color: "#78716c", lineHeight: 1.5 }}>
        Creates your Published Studio page and a governed AIH Space (Trust Unit). Access stays
        invite-only — no separate Studio auth or messaging.
      </p>
      <ul style={{ margin: "0 0 20px", paddingLeft: 18, fontSize: 14, color: "#57534e", lineHeight: 1.6 }}>
        <li>Public preview at /studios/[slug]</li>
        <li>Private member Space linked for Msg Vault</li>
        <li>Request access → steward approval → AIH invite</li>
      </ul>
      {!readyToPublish ? (
        <p style={{ fontSize: 13, color: "#b45309", marginBottom: 16 }}>
          Mark your draft ready to publish on the review step first.
        </p>
      ) : null}
      {publishError ? (
        <p style={{ fontSize: 13, color: "#b45309", marginBottom: 12 }}>{publishError}</p>
      ) : null}
      <button
        type="button"
        disabled={!readyToPublish || publishing}
        onClick={onPublish}
        style={{
          padding: "12px 22px",
          borderRadius: 14,
          border: "none",
          background: !readyToPublish || publishing ? "#d6d3d1" : "#44403c",
          color: "#fafaf9",
          fontSize: 14,
          fontWeight: 600,
          cursor: !readyToPublish || publishing ? "not-allowed" : "pointer",
        }}
      >
        {publishing ? "Publishing…" : "Publish studio"}
      </button>
    </div>
  );
}
