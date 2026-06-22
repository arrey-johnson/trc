"use client";

import { useEffect } from "react";
import { registerServiceWorker } from "@/lib/push/client";

/** Registers the service worker on app load so push is ready when user opts in. */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    registerServiceWorker();
  }, []);

  return null;
}
