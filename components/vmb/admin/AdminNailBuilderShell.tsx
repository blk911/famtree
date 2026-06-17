import type { ReactNode } from "react";

import {
  AdminNailBuilderFlowNav,
  type AdminNailBuilderStep,
} from "@/components/vmb/admin/AdminNailBuilderFlowNav";

type Props = {
  title: string;
  activeStep: AdminNailBuilderStep;
  headerExtra?: ReactNode;
  children: ReactNode;
};

export function AdminNailBuilderShell({
  title,
  activeStep,
  headerExtra,
  children,
}: Props) {
  return (
    <div className="vmb-admin-nail-builder">
      <header className="vmb-admin-nail-builder__header">
        <h1 className="vmb-admin-nail-builder__title">{title}</h1>
        <AdminNailBuilderFlowNav active={activeStep} />
        {headerExtra}
      </header>
      {children}
    </div>
  );
}
