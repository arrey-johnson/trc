"use client";

import { useEffect } from "react";

function hideSplash() {
  const splash = document.getElementById("app-splash");
  if (!splash || splash.classList.contains("app-splash--hide")) return;
  splash.classList.add("app-splash--hide");
  window.setTimeout(() => splash.remove(), 400);
}

export function SplashDismiss() {
  useEffect(() => {
    if (document.readyState === "complete") {
      window.requestAnimationFrame(() => hideSplash());
    } else {
      window.addEventListener("load", hideSplash, { once: true });
    }

    const fallback = window.setTimeout(hideSplash, 4000);
    return () => window.clearTimeout(fallback);
  }, []);

  return null;
}
