import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes, type HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

/* ── Agent 107 — IG / iMessage communication shell ─────────────────────── */

export function CommunicationGrid({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "grid w-full min-h-[min(72vh,640px)] items-stretch gap-2",
        "grid-cols-1",
        "min-[861px]:grid-cols-[minmax(240px,280px)_minmax(0,1fr)_minmax(200px,220px)]",
        "max-[1024px]:min-[861px]:grid-cols-[minmax(220px,260px)_minmax(0,1fr)_minmax(188px,200px)]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CommunicationListColumn({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("min-w-0 shrink-0 max-[860px]:order-1", className)} {...props}>
      {children}
    </div>
  );
}

export function CommunicationMainPane({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex min-h-[min(60vh,520px)] min-w-0 flex-col overflow-hidden rounded-xl border border-stone-200/90 bg-white shadow-sm max-[860px]:order-3",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CommunicationContextPane({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "min-w-0 shrink-0 max-[860px]:order-2",
        "[&_.context-rail]:gap-1 [&_.context-rail-section]:rounded-lg [&_.context-rail-section]:border [&_.context-rail-section]:border-stone-100 [&_.context-rail-section]:bg-white [&_.context-rail-section]:p-2 [&_.context-rail-section]:shadow-none",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

const statusPillVariants = cva(
  "inline-flex cursor-pointer items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-tight transition font-inherit",
  {
    variants: {
      active: {
        true: "border-stone-800 bg-stone-900 text-white",
        false: "border-stone-200 bg-white text-stone-600 hover:border-stone-300 hover:bg-stone-50",
      },
    },
    defaultVariants: { active: false },
  },
);

export const CommunicationStatusPill = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof statusPillVariants>
>(({ className, active, type = "button", ...props }, ref) => (
  <button ref={ref} type={type} className={cn(statusPillVariants({ active }), className)} {...props} />
));
CommunicationStatusPill.displayName = "CommunicationStatusPill";

export function CommunicationListPane({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex max-h-[min(72vh,640px)] min-h-[min(60vh,520px)] flex-col overflow-hidden rounded-xl border border-stone-200/90 bg-white shadow-sm max-[860px]:max-h-[280px] max-[860px]:min-h-0",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CommunicationListHeader({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-between gap-2 border-b border-stone-100 px-2.5 py-2",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export const CommunicationListNewAction = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => (
  <button
    ref={ref}
    type="button"
    className={cn(
      "cursor-pointer rounded-md border-0 bg-indigo-50 px-2 py-0.5 font-inherit text-[10px] font-bold text-indigo-700 hover:bg-indigo-100",
      className,
    )}
    {...props}
  />
));
CommunicationListNewAction.displayName = "CommunicationListNewAction";

export function CommunicationListScroll({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex-1 overflow-y-auto px-1 py-1", className)} {...props}>
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  );
}

export function CommunicationListEmpty({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("px-2.5 py-6 text-center text-[12px] text-stone-400", className)} {...props} />
  );
}

const listRowVariants = cva(
  "flex w-full items-center gap-2.5 rounded-lg border border-transparent bg-transparent px-2 py-2 text-left transition",
  {
    variants: {
      active: {
        true: "border-indigo-200/80 bg-indigo-50/90",
        false: "hover:bg-stone-50",
      },
    },
    defaultVariants: { active: false },
  },
);

export const CommunicationListRow = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof listRowVariants>
>(({ className, active, type = "button", ...props }, ref) => (
  <button ref={ref} type={type} className={cn(listRowVariants({ active }), className)} {...props} />
));
CommunicationListRow.displayName = "CommunicationListRow";

export function CommunicationCenterEmpty({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-1 flex-col items-center justify-center px-6 py-10 text-center",
        className,
      )}
      {...props}
    />
  );
}

export function CommunicationCenterEmptyTitle({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("m-0 text-[15px] font-medium text-stone-600", className)} {...props} />
  );
}

export function CommunicationThreadHeader({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "shrink-0 border-b border-stone-100 bg-white px-3 py-2.5",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CommunicationThreadTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("m-0 text-[15px] font-semibold text-stone-900", className)} {...props} />;
}

export function CommunicationMessageFeed({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex-1 overflow-y-auto bg-stone-50/80 px-3 py-2", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function CommunicationComposerWrap({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("shrink-0 border-t border-stone-100 bg-white", className)} {...props}>
      {children}
    </div>
  );
}

export function CommunicationAttachHint({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("m-0 border-t border-stone-50 px-3 py-1 text-[10px] text-stone-400", className)}
      {...props}
    />
  );
}

/* Legacy aliases — dashboard-era names; prefer Communication* exports (Agent 107). */
export const MsgVaultWorkspace = CommunicationGrid;
export const MsgVaultWorkspaceNav = CommunicationListColumn;
export const MsgVaultWorkspaceMain = CommunicationMainPane;
export const MsgVaultWorkspaceContext = CommunicationContextPane;
