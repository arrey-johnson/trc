"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export function NavigationProgress() {
  const pathname = usePathname();
  const [active, setActive] = useState(false);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const link = target?.closest("a[href]") as HTMLAnchorElement | null;
      if (!link) return;

      const href = link.getAttribute("href");
      if (!href || !href.startsWith("/") || href === pathname) return;
      if (link.target === "_blank") return;

      setActive(true);
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [pathname]);

  useEffect(() => {
    setActive(false);
  }, [pathname]);

  return (
    <div
      className={`pointer-events-none fixed left-0 top-0 z-[100] h-[3px] bg-brand shadow-[0_0_8px_var(--brand-ring)] transition-[width,opacity] duration-300 ease-out ${
        active ? "w-full opacity-100" : "w-0 opacity-0"
      }`}
      aria-hidden
    />
  );
}
