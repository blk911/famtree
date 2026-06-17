import type { ReactNode } from "react";

import {
  AdminNailBuilderFlowNav,
  type AdminNailBuilderStep,
} from "@/components/vmb/admin/AdminNailBuilderFlowNav";

type Props = {
  title: string;
  subtitle?: string;
  activeStep: AdminNailBuilderStep;
  /** Shown on the same row as flow nav (e.g. Manage Preset Cards). */
  flowActions?: ReactNode;
  /** Shown below flow nav (e.g. builder flow guide and template pills). */
  headerExtra?: ReactNode;
  children: ReactNode;
};

export function AdminNailBuilderShell({
  title,
  subtitle,
  activeStep,
  flowActions,
  headerExtra,
  children,
}: Props) {
  return (
    <div className="vmb-admin-nail-builder">
      <header className="vmb-admin-nail-builder__header">
        <h1 className="vmb-admin-nail-builder__title">{title}</h1>
        {subtitle ? <p className="vmb-admin-nail-builder__subtitle">{subtitle}</p> : null}
        <div className="vmb-admin-nail-builder__header-flow">
          <AdminNailBuilderFlowNav active={activeStep} />
          {flowActions ? (
            <div className="vmb-admin-nail-builder__flow-actions">{flowActions}</div>
          ) : null}
        </div>
        {headerExtra}
      </header>
      {children}
    </div>
  );
}
