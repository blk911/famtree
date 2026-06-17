"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { dispatchLaunchGuideRestart } from "@/lib/vmb/onboarding/vmb-launch-guide";

export function VmbHelpMenu() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function handleLaunchGuide() {
    setOpen(false);
    if (pathname === "/vmb/today") {
      dispatchLaunchGuideRestart();
      return;
    }
    window.location.href = "/vmb/today?launchGuide=1";
  }

  return (
    <div className="vmb-help-menu" ref={rootRef}>
      <button
        type="button"
        className="vmb-help-menu__trigger"
        data-launch-target="help-menu"
        aria-label="Help menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        ?
      </button>
      {open ? (
        <div className="vmb-help-menu__panel" role="menu">
          <Link href="/vmb/start" className="vmb-help-menu__item" role="menuitem" onClick={() => setOpen(false)}>
            Load your book
          </Link>
          <button type="button" className="vmb-help-menu__item" role="menuitem" onClick={handleLaunchGuide}>
            Launch Guide
          </button>
          <Link href="/vmb/faq" className="vmb-help-menu__item" role="menuitem" onClick={() => setOpen(false)}>
            FAQ
          </Link>
          <Link href="/vmb/support" className="vmb-help-menu__item" role="menuitem" onClick={() => setOpen(false)}>
            Support
          </Link>
          <Link href="/admin/service-catalog" className="vmb-help-menu__item" role="menuitem" onClick={() => setOpen(false)}>
            Services
          </Link>
          <Link href="/admin/invites/builder" className="vmb-help-menu__item" role="menuitem" onClick={() => setOpen(false)}>
            Template Builder
          </Link>
          <Link href="/admin/invites/library" className="vmb-help-menu__item" role="menuitem" onClick={() => setOpen(false)}>
            Nails Library
          </Link>
        </div>
      ) : null}
    </div>
  );
}
