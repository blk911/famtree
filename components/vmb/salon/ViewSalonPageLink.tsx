import Link from "next/link";

export function ViewSalonPageLink({ className }: { className?: string }) {
  return (
    <Link href="/vmb/salon-page" className={`vmb-view-salon-page-link${className ? ` ${className}` : ""}`}>
      View Salon Page
    </Link>
  );
}
