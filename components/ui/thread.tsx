import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes, type HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const threadSelectorRowVariants = cva(
  "flex w-full items-center gap-2 -mx-2 rounded-[10px] border border-transparent bg-transparent px-2 py-1.5 text-left cursor-pointer disabled:cursor-default disabled:opacity-65",
  {
    variants: {
      active: {
        true: "border-indigo-200 bg-indigo-50/90",
        false: "",
      },
      compact: {
        true: "min-h-0 rounded-lg py-1.5",
        false: "",
      },
    },
    defaultVariants: { active: false, compact: false },
  },
);

export const ThreadSelectorRow = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof threadSelectorRowVariants>
>(({ className, active, compact, type = "button", ...props }, ref) => (
  <button
    ref={ref}
    type={type}
    className={cn(threadSelectorRowVariants({ active, compact }), className)}
    {...props}
  />
));
ThreadSelectorRow.displayName = "ThreadSelectorRow";

export function ThreadSelectorRowLabel({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-xs font-medium text-[var(--ink)]",
        className,
      )}
      {...props}
    />
  );
}

export function ThreadSelectorRowActions({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("flex shrink-0 items-center gap-1", className)} {...props} />;
}

const threadTuVariants = cva(
  "flex w-full items-center justify-between gap-2 -mx-2 rounded-lg border border-transparent bg-transparent px-2 py-1 text-left text-xs font-semibold text-stone-700 cursor-pointer",
  {
    variants: { active: { true: "border-indigo-200 bg-indigo-50/90", false: "" } },
    defaultVariants: { active: false },
  },
);

export const ThreadTrustUnitButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof threadTuVariants>
>(({ className, active, type = "button", ...props }, ref) => (
  <button ref={ref} type={type} className={cn(threadTuVariants({ active }), className)} {...props} />
));
ThreadTrustUnitButton.displayName = "ThreadTrustUnitButton";

export function ThreadSelectorList({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div>
      {title ? (
        <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--muted)]">{title}</p>
      ) : null}
      <div className="flex min-w-0 flex-col gap-1.5 overflow-hidden">{children}</div>
    </div>
  );
}

export function ThreadEmptyState({
  title,
  body,
  compact,
}: {
  title: string;
  body?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "w-full text-center",
        compact
          ? "border-0 bg-transparent p-2 text-left"
          : "rounded-[18px] border border-dashed border-stone-300 bg-[var(--surface)] px-5 py-10",
      )}
    >
      <p
        className={cn(
          "m-0 font-semibold leading-snug text-[var(--muted)]",
          compact ? "text-[11px] font-medium" : "text-sm",
        )}
      >
        {title}
      </p>
      {body ? <p className="mt-2 text-[13px] text-stone-400">{body}</p> : null}
    </div>
  );
}

const threadBadgeVariants = cva(
  "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
  {
    variants: {
      kind: {
        tu: "bg-violet-100 text-violet-700",
        direct: "bg-blue-100 text-blue-800",
        group: "bg-green-100 text-green-800",
      },
    },
    defaultVariants: { kind: "direct" },
  },
);

export function ThreadBadge({
  kind,
  className,
  children,
}: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof threadBadgeVariants>) {
  return <span className={cn(threadBadgeVariants({ kind }), className)}>{children}</span>;
}

export function ThreadActivePanel({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex flex-col gap-4", className)} {...props}>
      {children}
    </div>
  );
}

export function ThreadActiveHeader({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <header className={cn("flex flex-wrap items-center justify-between gap-3", className)} {...props}>
      {children}
    </header>
  );
}

export function ThreadActiveTitle({ className, children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("m-0 text-base font-bold tracking-tight text-[var(--ink)]", className)}
      {...props}
    >
      {children}
    </h3>
  );
}

export function ThreadUnreadDot({ className }: { className?: string }) {
  return (
    <span
      className={cn("h-[7px] w-[7px] shrink-0 rounded-full bg-stone-300", className)}
      aria-hidden
      title="No unread messages"
    />
  );
}

export function ThreadUnreadBadge({ count, className }: { count: number; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[10px] font-bold leading-none text-white",
        className,
      )}
    >
      {count}
    </span>
  );
}

export function ThreadMemberAvatar({
  className,
  style,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#1a1a2e] to-[#0f3460] font-bold text-white",
        className,
      )}
      style={style}
      {...props}
    >
      {children}
    </div>
  );
}

export function ThreadComposerShell({
  className,
  style,
  children,
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("rounded-2xl p-3.5", className)} style={style}>
      {children}
    </div>
  );
}

export function ThreadComposerError({ children }: { children: React.ReactNode }) {
  return <p className="mb-2 text-xs font-medium text-red-700">{children}</p>;
}

export function ThreadComposerInput({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full resize-none rounded-xl border border-black/[0.08] bg-white px-3 py-2.5 text-sm leading-snug outline-none font-inherit",
        className,
      )}
      {...props}
    />
  );
}

export function ThreadComposerFooter({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("mt-3 flex items-center justify-between gap-3", className)} {...props}>
      {children}
    </div>
  );
}

export const ThreadComposerSend = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => (
  <button
    ref={ref}
    type="button"
    className={cn(
      "inline-flex items-center gap-2 rounded-xl border-0 bg-[var(--ink)] px-4 py-2 text-sm font-semibold text-white cursor-pointer disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
  />
));
ThreadComposerSend.displayName = "ThreadComposerSend";
