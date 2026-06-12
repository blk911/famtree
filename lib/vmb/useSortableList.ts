"use client";

import { useMemo, useRef, useState } from "react";

export type SortDirection = "asc" | "desc";

type SortValue = string | number | null | undefined;

function compareValues(a: SortValue, b: SortValue): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), undefined, { sensitivity: "base", numeric: true });
}

type SortAccessors<T> = Record<string, (item: T) => SortValue>;

export function useSortableList<T, Accessors extends SortAccessors<T>>(
  items: T[],
  config: {
    defaultKey: keyof Accessors & string;
    defaultDirection?: SortDirection;
    accessors: Accessors;
  },
) {
  type SortKey = keyof Accessors & string;

  const [sortKey, setSortKey] = useState<SortKey>(config.defaultKey);
  const [sortDirection, setSortDirection] = useState<SortDirection>(
    config.defaultDirection ?? "desc",
  );

  const accessorsRef = useRef(config.accessors);
  accessorsRef.current = config.accessors;

  const sortedItems = useMemo(() => {
    const accessor = accessorsRef.current[sortKey];
    const copy = [...items];
    copy.sort((a, b) => {
      const cmp = compareValues(accessor(a), accessor(b));
      return sortDirection === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [items, sortKey, sortDirection]);

  function setSort(key: SortKey): void {
    if (key === sortKey) {
      setSortDirection((dir) => (dir === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDirection("desc");
  }

  return { sortedItems, sortKey, sortDirection, setSort };
}
