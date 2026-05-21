import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes, type HTMLAttributes } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";

export function AihsafeGrid({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("grid grid-cols-1 gap-4 min-[901px]:grid-cols-[minmax(0,1fr)_minmax(0,380px)]", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export const AihsafeTabsBar = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      role="tablist"
      className={cn(
        "mb-[22px] flex gap-0.5 overflow-x-auto rounded-[14px] bg-[#f0efee] p-1 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  ),
);
AihsafeTabsBar.displayName = "AihsafeTabsBar";

const aihsafeTabVariants = cva(
  "shrink-0 whitespace-nowrap rounded-[10px] border-0 bg-transparent px-4 py-2 text-[13px] font-medium leading-snug text-[var(--muted)] cursor-pointer transition-[background,color,box-shadow] duration-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600",
  {
    variants: {
      active: {
        true: "bg-white font-semibold text-[var(--ink)] shadow-[0_1px_4px_rgba(0,0,0,0.09),0_0_0_1px_rgba(0,0,0,0.04)]",
        false: "hover:bg-white/65 hover:text-[var(--ink)]",
      },
    },
    defaultVariants: { active: false },
  },
);

export const AihsafeTab = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof aihsafeTabVariants>
>(({ className, active, type = "button", ...props }, ref) => (
  <button ref={ref} type={type} className={cn(aihsafeTabVariants({ active }), className)} {...props} />
));
AihsafeTab.displayName = "AihsafeTab";

export function AihsafeTabBadge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-600 px-1 align-middle text-[10px] font-bold leading-none text-white",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function AihsafeOverview({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex flex-col gap-1", className)} {...props}>
      {children}
    </div>
  );
}

export function AihsafeOverviewSection({ className, children, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <section
      className={cn("mb-2.5 rounded-[14px] border border-stone-300 bg-white px-4 py-3.5", className)}
      {...props}
    >
      {children}
    </section>
  );
}

export function AihsafeOverviewTwoCol({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("grid grid-cols-1 gap-2.5 max-[720px]:grid-cols-1 min-[721px]:grid-cols-2", className)} {...props}>
      {children}
    </div>
  );
}

export function AihsafeOverviewEmpty({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("m-0 text-[13px] leading-snug text-[var(--muted)]", className)} {...props} />;
}

export function AihsafeOverviewHint({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("mb-2 text-[13px] leading-snug text-[var(--muted-body)]", className)} {...props} />;
}

export const AihsafeOverviewRow = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => (
  <button
    ref={ref}
    type="button"
    className={cn(
      "mb-1.5 flex w-full cursor-pointer items-center justify-between gap-2.5 rounded-[10px] border border-[#f0efee] bg-[var(--surface)] px-3 py-2.5 text-left text-[13px] text-[var(--ink)] hover:border-stone-300 hover:bg-stone-100",
      className,
    )}
    {...props}
  />
));
AihsafeOverviewRow.displayName = "AihsafeOverviewRow";

export function AihsafeOverviewMeta({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("whitespace-nowrap text-[11px] text-[var(--muted)]", className)} {...props} />;
}

export function AihsafeOverviewList({ className, children, ...props }: HTMLAttributes<HTMLUListElement>) {
  return <ul className={cn("m-0 list-none p-0", className)} {...props}>{children}</ul>;
}

export function AihsafeOverviewPeople({ className, children, ...props }: HTMLAttributes<HTMLUListElement>) {
  return <ul className={cn("m-0 list-none p-0 text-[13px]", className)} {...props}>{children}</ul>;
}

export function AihsafeOverviewPeopleItem({ className, children, ...props }: HTMLAttributes<HTMLLIElement>) {
  return (
    <li
      className={cn(
        "flex flex-wrap gap-x-2 gap-y-1 border-b border-stone-100 py-1.5 last:border-b-0 [&_strong]:font-semibold [&_strong]:text-[var(--ink)] [&_span]:text-xs [&_span]:text-[var(--muted)]",
        className,
      )}
      {...props}
    >
      {children}
    </li>
  );
}

export const AihsafeOverviewLinkBtn = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => (
  <button
    ref={ref}
    type="button"
    className={cn("mt-2 cursor-pointer border-0 bg-transparent p-0 text-xs font-semibold text-[var(--accent)]", className)}
    {...props}
  />
));
AihsafeOverviewLinkBtn.displayName = "AihsafeOverviewLinkBtn";

export const AihsafeOverviewSectionLink = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => (
  <button
    ref={ref}
    type="button"
    className={cn("cursor-pointer border-0 bg-transparent p-0 text-xs font-semibold text-[var(--accent)]", className)}
    {...props}
  />
));
AihsafeOverviewSectionLink.displayName = "AihsafeOverviewSectionLink";

export function AihsafeOverviewActions({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-wrap gap-2", className)} {...props}>{children}</div>;
}

const actionChipVariants = cva(
  "inline-flex items-center gap-1.5 rounded-[10px] border border-stone-300 bg-[var(--surface)] px-3 py-2 text-xs font-medium text-stone-700 cursor-pointer no-underline hover:border-stone-300 hover:bg-stone-100",
  { variants: { link: { true: "text-stone-700", false: "" } }, defaultVariants: { link: false } },
);

export function AihsafeOverviewActionChip({
  className,
  link,
  href,
  children,
  onClick,
}: {
  className?: string;
  link?: boolean;
  href?: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  const cls = cn(actionChipVariants({ link }), className);
  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" className={cls} onClick={onClick}>
      {children}
    </button>
  );
}

const spacesCtaVariants = cva(
  "inline-flex cursor-pointer items-center gap-1 rounded-lg border border-stone-300 bg-white px-3 py-1 text-xs font-semibold text-stone-700",
  {
    variants: {
      primary: { true: "border-violet-300 bg-violet-50 text-violet-900", false: "" },
      empty: { true: "border-dashed px-4 py-2 text-[13px]", false: "" },
    },
    defaultVariants: { primary: false, empty: false },
  },
);

export function AihsafeSpacesCta({
  className,
  primary,
  empty,
  href,
  onClick,
  children,
}: {
  className?: string;
  primary?: boolean;
  empty?: boolean;
  href?: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  const cls = cn(spacesCtaVariants({ primary, empty }), className);
  if (href) return <Link href={href} className={cls}>{children}</Link>;
  return (
    <button type="button" className={cls} onClick={onClick}>
      {children}
    </button>
  );
}

export function AihsafeSpacesDraftNote({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn(
        "mb-4 rounded-[10px] border border-stone-300 bg-[var(--surface)] px-3 py-2.5 text-xs leading-snug text-[var(--muted)]",
        className,
      )}
      {...props}
    />
  );
}

export function AihsafeSpacesAllEmpty({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("mt-2 rounded-2xl border border-stone-300 bg-white px-6 py-10 text-center", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function AihsafeCreateFlow({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn(className)} {...props}>{children}</div>;
}

export function AihsafeCreateFlowProgress({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mb-2.5 flex gap-1.5", className)} aria-hidden {...props}>{children}</div>;
}

export function AihsafeCreateFlowDot({ on }: { on: boolean }) {
  return <div className={cn("h-1 flex-1 rounded", on ? "bg-violet-600" : "bg-stone-300")} />;
}

export function AihsafeCreateFlowStepLabel({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("mb-1 text-[11px] font-semibold uppercase tracking-wide text-stone-400", className)}
      {...props}
    />
  );
}

export function AihsafeCreateFlowTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("mb-4 text-base font-bold text-[var(--ink)]", className)} {...props} />;
}

export function AihsafeCreateFlowFooter({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("mt-5 flex justify-end gap-2.5 border-t border-[#f0efee] pt-4", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function AihsafeCreateFlowTypeGrid({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("grid grid-cols-2 gap-2", className)} {...props}>{children}</div>;
}

const createFlowTypeVariants = cva(
  "flex cursor-pointer flex-col items-start rounded-xl border border-stone-300 bg-[var(--surface)] p-3 text-left",
  {
    variants: { on: { true: "border-violet-600 bg-violet-50 shadow-[0_0_0_1px_#c4b5fd]", false: "" } },
    defaultVariants: { on: false },
  },
);

export const AihsafeCreateFlowType = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof createFlowTypeVariants>
>(({ className, on, type = "button", ...props }, ref) => (
  <button ref={ref} type={type} className={cn(createFlowTypeVariants({ on }), className)} {...props} />
));
AihsafeCreateFlowType.displayName = "AihsafeCreateFlowType";

export function AihsafeCreateFlowTypeLabel({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("text-sm font-semibold text-[var(--ink)]", className)} {...props} />;
}

export function AihsafeCreateFlowTypeHint({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("mt-1 text-[11px] leading-snug text-[var(--muted)]", className)} {...props} />;
}

export function AihsafeCreateFlowReview({ className, children, ...props }: HTMLAttributes<HTMLDListElement>) {
  return (
    <dl
      className={cn(
        "m-0 text-[13px] [&_div]:flex [&_div]:justify-between [&_div]:gap-3 [&_div]:border-b [&_div]:border-stone-100 [&_div]:py-2 [&_dt]:font-medium [&_dt]:text-[var(--muted)] [&_dd]:m-0 [&_dd]:font-semibold [&_dd]:text-[var(--ink)] [&_dd]:text-right",
        className,
      )}
      {...props}
    >
      {children}
    </dl>
  );
}
