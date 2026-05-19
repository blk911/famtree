"use client";

import type { ReactNode } from "react";

export function ThreadSelectorList({
  title,
  children,
  footer,
}: {
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="thread-selector-list">
      {title ? <p className="thread-selector-list__title">{title}</p> : null}
      <div className="thread-selector-list__items">{children}</div>
      {footer}
    </div>
  );
}
