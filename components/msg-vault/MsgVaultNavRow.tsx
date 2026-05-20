"use client";

export function MsgVaultNavRow({
  label,
  count,
  onClick,
  active,
  urgent,
}: {
  label: string;
  count?: number;
  onClick: () => void;
  active?: boolean;
  urgent?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`msg-vault-nav-row${active ? " msg-vault-nav-row--active" : ""}${urgent ? " msg-vault-nav-row--urgent" : ""}`}
    >
      <span className="msg-vault-nav-row__label">{label}</span>
      {count !== undefined && (
        <span className="msg-vault-nav-row__count">{count}</span>
      )}
    </button>
  );
}
