"use client";

/** Revoke is not available on the guardian-links API yet (Agent 65). */
export function RevokeLinkButton() {
  return (
    <button
      type="button"
      disabled
      title="Removing a link will be available in a future update. Contact your family steward if a link needs to change."
      style={{
        padding:      "4px 10px",
        borderRadius: 7,
        border:       "1px solid #e7e5e4",
        background:   "#fafaf9",
        color:        "#a8a29e",
        fontSize:     11,
        fontWeight:   600,
        cursor:       "not-allowed",
        flexShrink:   0,
      }}
    >
      Remove
    </button>
  );
}
