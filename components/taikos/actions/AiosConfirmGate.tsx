"use client";

import { confirmButtonLabel } from "@/lib/taikos/actions/confirm-gates";
import type { TaikosActionType } from "@/lib/taikos/types";

type Props = {
  actionType: TaikosActionType;
  confirming?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function AiosConfirmGate({ actionType, confirming, onConfirm, onCancel }: Props) {
  return (
    <div className="aios-confirm-gate">
      <p className="aios-confirm-gate__hint">
        Preview only — confirm records this draft. No message will be sent.
      </p>
      <div className="aios-confirm-gate__actions">
        <button
          type="button"
          className="aios-confirm-gate__confirm"
          onClick={onConfirm}
          disabled={confirming}
        >
          {confirming ? "Recording…" : confirmButtonLabel(actionType)}
        </button>
        <button
          type="button"
          className="aios-confirm-gate__cancel"
          onClick={onCancel}
          disabled={confirming}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
