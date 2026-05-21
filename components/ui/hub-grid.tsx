import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Main column + right contextual rail (dashboard, private threads, Family Safe). */
export function HubGrid({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "grid w-full grid-cols-1 items-start gap-4 max-[860px]:grid-cols-1 min-[861px]:grid-cols-[minmax(0,1fr)_minmax(0,232px)]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function HubGridMain({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("min-w-0 overflow-hidden max-[860px]:order-2", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function HubGridRail({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("min-w-0 max-[860px]:order-1", className)} {...props}>
      {children}
    </div>
  );
}

export function HubGridMainColumn({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <HubGridMain className={cn("flex flex-col gap-4", className)}>{children}</HubGridMain>
  );
}
