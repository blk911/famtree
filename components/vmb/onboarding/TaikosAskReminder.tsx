"use client";

type Props = {
  visible: boolean;
  onFocusInput: () => void;
};

export function TaikosAskReminder({ visible, onFocusInput }: Props) {
  if (!visible) return null;

  return (
    <button type="button" className="vmb-taikos-ask-reminder" onClick={onFocusInput}>
      ✨ Ask TAIKOS about your business
    </button>
  );
}
