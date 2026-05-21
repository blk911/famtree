import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes, type HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const ctaCardVariants = cva(
  [
    "flex w-full min-w-0 flex-col items-start gap-1 rounded-[14px] border p-3 text-left",
    "bg-[var(--surface-elevated)] border-[var(--border-subtle)]",
    "shadow-[var(--shadow-card)] font-inherit appearance-none m-0 cursor-pointer",
    "transition-[border-color,box-shadow,background] duration-100",
    "hover:border-[var(--border-muted)] hover:shadow-[var(--shadow-card-hover)]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40",
  ].join(" "),
  {
    variants: {
      urgent: {
        true: "border-amber-200 bg-amber-50",
        false: "",
      },
      active: {
        true: "border-[var(--accent)] shadow-[0_0_0_1px_var(--accent)]",
        false: "",
      },
    },
    compoundVariants: [
      {
        urgent: true,
        active: true,
        class: "border-[var(--accent)] bg-violet-50",
      },
    ],
    defaultVariants: {
      urgent: false,
      active: false,
    },
  },
);

export type CtaCardProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof ctaCardVariants>;

export const CtaCard = forwardRef<HTMLButtonElement, CtaCardProps>(
  ({ className, urgent, active, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(ctaCardVariants({ urgent, active }), className)}
      {...props}
    />
  ),
);
CtaCard.displayName = "CtaCard";

export function CtaCardGrid({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "grid w-full grid-cols-1 gap-2.5 min-[481px]:grid-cols-2 min-[901px]:grid-cols-4",
        className,
      )}
      {...props}
    />
  );
}

export function CtaCardIcon({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn("flex text-[var(--accent)]", className)}
      aria-hidden
      {...props}
    />
  );
}

export function CtaCardLabel({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "text-[11px] font-bold uppercase tracking-wide text-[var(--muted)]",
        className,
      )}
      {...props}
    />
  );
}

const ctaCardStatusVariants = cva(
  "text-lg font-extrabold leading-tight tracking-tight text-[var(--ink)]",
  {
    variants: {
      urgent: { true: "text-[var(--urgent)]", false: "" },
      active: { true: "", false: "" },
    },
    compoundVariants: [
      { urgent: true, active: true, class: "text-[var(--urgent-ink)]" },
    ],
    defaultVariants: { urgent: false, active: false },
  },
);

export function CtaCardStatus({
  className,
  urgent,
  active,
  ...props
}: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof ctaCardStatusVariants>) {
  return (
    <span className={cn(ctaCardStatusVariants({ urgent, active }), className)} {...props} />
  );
}

export function CtaCardAction({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn("text-xs font-medium leading-snug text-[var(--muted-body)]", className)}
      {...props}
    />
  );
}

export { ctaCardVariants };
