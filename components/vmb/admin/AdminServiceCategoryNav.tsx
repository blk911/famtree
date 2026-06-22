"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { ServiceCategoryId } from "@/lib/vmb/services/canonical-catalog-types";
import { listServiceCategories } from "@/lib/vmb/services/canonical-service-catalog";

const categories = listServiceCategories();

function resolveCategory(value: string | null): ServiceCategoryId {
  return categories.some((category) => category.id === value)
    ? value as ServiceCategoryId
    : "nails";
}

export function AdminServiceCategoryNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeCategory = resolveCategory(searchParams.get("categoryId"));

  return (
    <nav className="vmb-service-catalog__nav vmb-admin-service-category-nav" aria-label="Service categories">
      <p className="vmb-service-catalog__nav-label">Categories</p>
      <ul className="vmb-service-catalog__nav-list">
        {categories.map((category) => (
          <li key={category.id}>
            <Link
              href={`${pathname}?categoryId=${encodeURIComponent(category.id)}`}
              className={`vmb-service-catalog__nav-item${activeCategory === category.id ? " vmb-service-catalog__nav-item--active" : ""}`}
              aria-current={activeCategory === category.id ? "page" : undefined}
            >
              {category.name}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
