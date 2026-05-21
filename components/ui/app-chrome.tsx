import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes, type HTMLAttributes } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";

export function AppMain({ className, children, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <main className={cn("app-main min-h-screen bg-[#f8f7f4]", className)} {...props}>
      {children}
    </main>
  );
}

export function AppTopBar({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "sticky top-0 z-30 flex h-[60px] items-center gap-2.5 border-b border-[var(--border-subtle)] bg-white px-4 shadow-[0_1px_8px_rgba(0,0,0,0.04)]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export const AppMenuButton = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      className={cn(
        "md:hidden shrink-0 cursor-pointer rounded-[9px] border border-[#e0ddd7] bg-transparent p-1.5 leading-none text-stone-600",
        className,
      )}
      {...props}
    />
  ),
);
AppMenuButton.displayName = "AppMenuButton";

export function AppContentWrap({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("app-content-pad mx-auto max-w-[900px]", className)} {...props}>
      {children}
    </div>
  );
}

export function AppAnnouncementBanner({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "mb-4 flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export const AppBannerExpandButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => (
  <button
    ref={ref}
    type="button"
    className={cn(
      "flex min-w-0 flex-1 cursor-pointer items-center gap-1.5 border-0 bg-transparent p-0 text-left",
      className,
    )}
    {...props}
  />
));
AppBannerExpandButton.displayName = "AppBannerExpandButton";

export const AppBannerIconButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => (
  <button
    ref={ref}
    type="button"
    className={cn("shrink-0 cursor-pointer border-0 bg-transparent p-0.5 leading-none text-amber-600", className)}
    {...props}
  />
));
AppBannerIconButton.displayName = "AppBannerIconButton";

export function AppMobileBackdrop({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("fixed inset-0 z-[35] bg-black/52 md:hidden", className)}
      aria-hidden
      {...props}
    />
  );
}

const sidebarLinkVariants = cva(
  "mb-0.5 flex items-center gap-3 rounded-xl border px-4 py-2.5 text-[15px] no-underline transition-all duration-150",
  {
    variants: {
      active: {
        true: "border-white/10 bg-gradient-to-br from-[rgba(233,108,80,0.75)] to-[rgba(244,162,97,0.55)] font-semibold text-white",
        false: "border-transparent font-medium text-white/60 hover:text-white/80",
      },
    },
    defaultVariants: { active: false },
  },
);

export function SidebarNavLink({
  href,
  active,
  className,
  children,
}: {
  href: string;
  active: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={cn(sidebarLinkVariants({ active }), className)}>
      {children}
    </Link>
  );
}

const sidebarSubLinkVariants = cva(
  "mb-0.5 flex items-center gap-2.5 rounded-[10px] border border-transparent py-2 pl-11 pr-4 text-[13px] no-underline transition-all duration-100",
  {
    variants: {
      active: { true: "bg-white/10 font-semibold text-white", false: "font-normal text-white/50" },
    },
    defaultVariants: { active: false },
  },
);

export function SidebarSubNavLink({
  href,
  active,
  className,
  children,
}: {
  href: string;
  active: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={cn(sidebarSubLinkVariants({ active }), className)}>
      {children}
    </Link>
  );
}

export const SidebarNavButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof sidebarLinkVariants>
>(({ className, active, ...props }, ref) => (
  <button ref={ref} type="button" className={cn(sidebarLinkVariants({ active }), "w-full", className)} {...props} />
));
SidebarNavButton.displayName = "SidebarNavButton";

export function SidebarShell({ open, className, children }: { open?: boolean; className?: string; children: React.ReactNode }) {
  return (
    <aside
      className={cn("app-sidebar", open && "sidebar-open", className)}
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        height: "100%",
        width: 260,
        background: "linear-gradient(180deg,#1a1a2e 0%,#16213e 55%,#0f3460 100%)",
        display: "flex",
        flexDirection: "column",
        zIndex: 40,
        boxShadow: "4px 0 24px rgba(0,0,0,0.18)",
      }}
    >
      {children}
    </aside>
  );
}

export function SidebarBrand({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("flex items-center gap-3 border-b border-white/[0.08] px-5 py-4", className)}>
      {children}
    </div>
  );
}

export function SidebarNav({ className, children }: { className?: string; children: React.ReactNode }) {
  return <nav className={cn("flex-1 overflow-y-auto px-2.5 py-3.5", className)}>{children}</nav>;
}

export function SidebarFooter({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("border-t border-white/[0.08] px-2.5 pb-4 pt-2.5", className)}>{children}</div>
  );
}

export const SidebarLogoutButton = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      className={cn(
        "mt-2 flex w-full cursor-pointer items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.08] px-3 py-2.5 text-sm font-semibold text-white/80",
        className,
      )}
      {...props}
    />
  ),
);
SidebarLogoutButton.displayName = "SidebarLogoutButton";

export function SidebarVaultBadge({ count }: { count: number }) {
  return (
    <span
      className="inline-flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold leading-none text-white"
      aria-label={`${count} vault notifications`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
