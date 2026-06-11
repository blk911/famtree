"use client";

import { WorkflowPanel } from "@/components/vmb/workflows/WorkflowPanel";
import { VMB_THEME } from "@/lib/vmb/theme";
import type { NewClientWelcomeRow } from "@/lib/vmb/operating-system/types";

type Props = {
  rows: NewClientWelcomeRow[];
  onClose: () => void;
};

export function WelcomeQueue({ rows, onClose }: Props) {
  return (
    <WorkflowPanel title="Welcome Queue" onClose={onClose}>
      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 0 }}>
        {rows.map((row) => (
          <li
            key={row.id}
            style={{
              padding: "16px 0",
              borderBottom: `1px solid ${VMB_THEME.line}`,
            }}
          >
            <p style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 800 }}>{row.clientName}</p>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: VMB_THEME.ink }}>
              {row.welcomeMessage}
            </p>
          </li>
        ))}
      </ul>
    </WorkflowPanel>
  );
}
