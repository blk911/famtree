"use client";

export type RoleBannerVariant = "founder" | "member" | "child";

const COPY: Record<RoleBannerVariant, string> = {
  founder: "You are stewarding this family network.",
  member: "You are participating in trusted spaces.",
  child: "You are sharing inside approved circles.",
};

export function RoleBanner({ variant }: { variant: RoleBannerVariant }) {
  return (
    <div
      role="status"
      style={{
        background:   "#f4f4f5",
        border:       "1px solid #e4e4e7",
        borderRadius: 12,
        padding:      "12px 18px",
        marginBottom: 16,
        fontSize:     13,
        color:        "#3f3f46",
        lineHeight:   1.45,
      }}
    >
      {COPY[variant]}
    </div>
  );
}
