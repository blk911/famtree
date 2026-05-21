import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-colors cursor-pointer border-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 disabled:opacity-50 disabled:cursor-not-allowed",
  {
    variants: {
      variant: {
        primary: "bg-stone-900 text-white hover:bg-stone-700 px-4 py-2",
        secondary:
          "bg-stone-100 text-stone-700 hover:bg-stone-200 border border-stone-200 px-4 py-2",
        ghost: "bg-transparent text-stone-600 hover:bg-stone-100 px-3 py-2",
      },
      size: {
        default: "",
        sm: "text-xs px-3 py-1.5 rounded-lg",
        lg: "text-base px-5 py-2.5",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = "button", ...props }, ref) => (
    <button ref={ref} type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  ),
);
Button.displayName = "Button";

export { buttonVariants };
