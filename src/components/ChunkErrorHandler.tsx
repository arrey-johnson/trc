"use client";

import { useEffect } from "react";

const RELOAD_KEY = "trc-chunk-reload";

function isChunkError(message: string): boolean {
  return (
    message.includes("ChunkLoadError") ||
    message.includes("Loading chunk") ||
    message.includes("Failed to fetch dynamically imported module")
  );
}

/** Reload once when stale webpack chunks 404 after dev rebuilds or deploys. */
export function ChunkErrorHandler() {
  useEffect(() => {
    function tryReload(message: string) {
      if (!isChunkError(message)) return;

      if (!sessionStorage.getItem(RELOAD_KEY)) {
        sessionStorage.setItem(RELOAD_KEY, "1");
        window.location.reload();
      } else {
        sessionStorage.removeItem(RELOAD_KEY);
      }
    }

    function onError(event: ErrorEvent) {
      tryReload(event.message ?? "");
    }

    function onRejection(event: PromiseRejectionEvent) {
      const reason = event.reason;
      const message =
        reason instanceof Error
          ? reason.message
          : typeof reason === "string"
            ? reason
            : "";
      tryReload(message);
    }

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
