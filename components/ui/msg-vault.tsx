import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes, type HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function MsgVaultWorkspace({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "grid w-full min-h-[480px] items-stretch gap-2.5",
        "grid-cols-1",
        /* Fixed side tracks — minmax(0, Npx) let the nav column collapse to 0 under pressure (LT regression). */
        "min-[861px]:grid-cols-[172px_minmax(0,1fr)_188px]",
        "max-[1024px]:min-[861px]:grid-cols-[160px_minmax(0,1fr)_176px]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function MsgVaultWorkspaceNav({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "min-w-0 shrink-0 max-[860px]:order-1 min-[861px]:w-[172px] max-[1024px]:min-[861px]:w-[160px]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function MsgVaultWorkspaceMain({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex min-h-[480px] min-w-0 flex-col overflow-hidden rounded-2xl border border-stone-300 bg-white shadow-[0_2px_14px_rgba(0,0,0,0.06)] max-[860px]:order-3 max-[860px]:min-h-[360px]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function MsgVaultWorkspaceContext({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "min-w-0 shrink-0 max-[860px]:order-2 min-[861px]:w-[188px] max-[1024px]:min-[861px]:w-[176px]",
        "[&_.context-rail]:gap-1.5 [&_.context-rail-section]:rounded-[10px] [&_.context-rail-section]:border [&_.context-rail-section]:border-[#f0efee] [&_.context-rail-section]:bg-[var(--surface)] [&_.context-rail-section]:p-[9px_11px] [&_.context-rail-section]:shadow-none",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function MsgVaultLeftNavShell({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex max-h-[min(72vh,640px)] min-h-[480px] flex-col overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] max-[860px]:max-h-[240px] max-[860px]:min-h-0",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function MsgVaultLeftNavTabs({ className, children, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <nav
      className={cn("shrink-0 border-b border-[var(--border-subtle)] px-1.5 pt-1.5 pb-1", className)}
      {...props}
    />
  );
}

export function MsgVaultLeftNavBody({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex-1 overflow-y-auto px-1 py-2", className)} {...props} />;
}

const navTabVariants = cva(
  "mb-px flex w-full items-center justify-between rounded-lg border-0 bg-transparent px-2 py-1.5 text-left text-[11px] font-medium text-[var(--muted)] cursor-pointer font-inherit",
  {
    variants: {
      active: {
        true: "bg-indigo-50 font-semibold text-[var(--ink)] [&_.msg-vault-tab-count]:text-[var(--accent)]",
        false: "hover:bg-stone-100 hover:text-[var(--ink)]",
      },
    },
    defaultVariants: { active: false },
  },
);

export const MsgVaultNavTab = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof navTabVariants>
>(({ className, active, ...props }, ref) => (
  <button ref={ref} type="button" className={cn(navTabVariants({ active }), className)} {...props} />
));
MsgVaultNavTab.displayName = "MsgVaultNavTab";

export function MsgVaultTabCount({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className={cn("msg-vault-tab-count text-[10px] font-semibold text-stone-400", className)} {...props} />
  );
}

export function MsgVaultTabBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-violet-600 px-1 text-[9px] font-bold text-white">
      {children}
    </span>
  );
}

const navRowVariants = cva(
  "mb-px flex w-full items-center justify-between rounded-lg border-0 bg-transparent px-2 py-1.5 text-left text-xs font-medium text-[var(--muted-body)] cursor-pointer font-inherit",
  {
    variants: {
      active: { true: "bg-indigo-50 font-semibold text-[var(--ink)]", false: "hover:bg-stone-100 hover:text-[var(--ink)]" },
      urgent: { true: "[&_.msg-vault-nav-count]:font-bold [&_.msg-vault-nav-count]:text-[var(--urgent)]", false: "" },
    },
    defaultVariants: { active: false, urgent: false },
  },
);

export const MsgVaultNavRowButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof navRowVariants>
>(({ className, active, urgent, ...props }, ref) => (
  <button ref={ref} type="button" className={cn(navRowVariants({ active, urgent }), className)} {...props} />
));
MsgVaultNavRowButton.displayName = "MsgVaultNavRowButton";

export function MsgVaultNavCount({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className={cn("msg-vault-nav-count shrink-0 text-[11px] font-semibold text-stone-400", className)} {...props} />
  );
}

export function MsgVaultNavSectionLabel({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("mx-2 mb-1 mt-2 text-[10px] font-bold uppercase tracking-wide text-stone-400", className)}
      {...props}
    />
  );
}

export function MsgVaultNavAction({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        "cursor-pointer border-0 bg-transparent px-2 pb-1.5 font-inherit text-[10px] font-bold text-[var(--accent)]",
        className,
      )}
      {...props}
    />
  );
}

export function MsgVaultNavEmpty({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("mx-2 my-1 text-[11px] leading-snug text-stone-400", className)} {...props} />;
}

export function MsgVaultOverviewCenter({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex-1 px-5 py-5", className)} {...props}>{children}</div>;
}

export function MsgVaultOverviewTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("m-0 mb-1 text-base font-semibold text-[var(--ink)]", className)} {...props} />;
}

export function MsgVaultOverviewSub({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("m-0 text-xs text-[var(--muted)]", className)} {...props} />;
}

export function MsgVaultSummaryList({ className, children, ...props }: HTMLAttributes<HTMLUListElement>) {
  return <ul className={cn("m-3 mt-3 list-none p-0", className)} {...props}>{children}</ul>;
}

export const MsgVaultSummaryRow = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => (
  <button
    ref={ref}
    type="button"
    className={cn(
      "flex w-full cursor-pointer items-center justify-between rounded-lg border-0 border-b border-stone-100 bg-transparent px-1 py-2.5 text-left font-inherit text-[13px] text-stone-700 transition hover:bg-indigo-50/80 hover:text-[var(--ink)]",
      className,
    )}
    {...props}
  />
));
MsgVaultSummaryRow.displayName = "MsgVaultSummaryRow";

export function MsgVaultSummaryCount({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("text-xs font-semibold text-[var(--muted)]", className)} {...props} />;
}

export function MsgVaultNoticesGrid({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "grid items-start gap-4 max-[860px]:grid-cols-1 min-[861px]:grid-cols-[minmax(0,1fr)_minmax(0,232px)]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function MsgVaultNoticesList({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("min-w-0 max-[860px]:order-2", className)} {...props}>{children}</div>;
}

export function MsgVaultNoticesRail({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("min-w-0 max-[860px]:order-1", className)} {...props}>{children}</div>;
}
