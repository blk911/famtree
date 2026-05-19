"use client";

export type MsgVaultTabId = "overview" | "chats" | "threads" | "notices";

const TABS: { id: MsgVaultTabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "chats",    label: "Chats" },
  { id: "threads",  label: "Threads" },
  { id: "notices",  label: "Notices" },
];

interface Props {
  active: MsgVaultTabId;
  onChange: (tab: MsgVaultTabId) => void;
  badges?: Partial<Record<MsgVaultTabId, number>>;
}

const barStyle: React.CSSProperties = {
  display:        "flex",
  gap:            4,
  overflowX:      "auto",
  scrollbarWidth: "none",
  borderBottom:   "1px solid #ece9e3",
  marginBottom:   16,
};

export function MsgVaultTabs({ active, onChange, badges }: Props) {
  return (
    <div role="tablist" aria-label="Msg Vault sections">
      <div style={barStyle}>
        {TABS.map(({ id, label }) => {
          const isActive = active === id;
          const badge = badges?.[id];
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(id)}
              style={{
                display:      "flex",
                alignItems:   "center",
                gap:          6,
                padding:      "8px 14px 10px",
                flexShrink:   0,
                background:   "none",
                border:       "none",
                borderBottom: isActive ? "2px solid #6366f1" : "2px solid transparent",
                color:        isActive ? "#1c1917" : "#78716c",
                fontWeight:   isActive ? 650 : 500,
                fontSize:     13,
                cursor:       "pointer",
                whiteSpace:   "nowrap",
              }}
            >
              {label}
              {badge !== undefined && badge > 0 && (
                <span
                  style={{
                    display:        "inline-flex",
                    alignItems:     "center",
                    justifyContent: "center",
                    background:     "#ef4444",
                    color:          "white",
                    borderRadius:   999,
                    fontSize:       10,
                    fontWeight:     700,
                    minWidth:       16,
                    height:         16,
                    padding:        "0 4px",
                  }}
                >
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
