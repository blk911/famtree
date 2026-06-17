import type { ReactNode } from "react";

import {
  AdminBuilderFlowNav,
  type AdminBuilderStep,
} from "@/components/vmb/admin/AdminBuilderFlowNav";

type Props = {
  title: string;
  subtitle?: string;
  activeStep: AdminBuilderStep;
  /** Shown on the same row as flow nav (e.g. Manage Preset Cards). */
  flowActions?: ReactNode;
  /** Shown below flow nav (e.g. builder flow guide). */
  headerExtra?: ReactNode;
  children: ReactNode;
};

/** Page header + flow row for admin builder pages (Services, Template Library). */
export function AdminBuilderShell({
  title,
  subtitle,
  activeStep,
  flowActions,
  headerExtra,
  children,
}: Props) {
  return (
    <div className="vmb-admin-builder">
      <header className="vmb-admin-builder__header">
        <h1 className="vmb-admin-builder__title">{title}</h1>
        {subtitle ? <p className="vmb-admin-builder__subtitle">{subtitle}</p> : null}
        <div className="vmb-admin-builder__header-flow">
          <AdminBuilderFlowNav active={activeStep} />
          {flowActions ? <div className="vmb-admin-builder__flow-actions">{flowActions}</div> : null}
        </div>
        {headerExtra}
      </header>
      {children}
    </div>
  );
}
