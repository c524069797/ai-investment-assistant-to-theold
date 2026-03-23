"use client";

import { useEffect } from "react";

const STORAGE_KEY = "chunk-error-reload";
const RETRY_WINDOW = 15000;

function shouldHandleChunkError(message: string) {
  return (
    message.includes("ChunkLoadError") ||
    message.includes("Failed to load chunk") ||
    message.includes("Loading chunk") ||
    message.includes("/_next/static/chunks/")
  );
}

function tryReloadOnce(reason: string) {
  if (typeof window === "undefined") {
    return;
  }

  const now = Date.now();
  const currentPath = `${window.location.pathname}${window.location.search}`;

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const cached = JSON.parse(raw) as { path?: string; time?: number };
      if (cached.path === currentPath && cached.time && now - cached.time < RETRY_WINDOW) {
        console.warn("[chunk-error] duplicate chunk reload prevented", reason);
        return;
      }
    }

    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ path: currentPath, time: now }));
  } catch {
    // ignore storage failures
  }

  window.location.reload();
}

export default function ChunkErrorHandler() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      const message = event.message || event.error?.message || "";
      if (!shouldHandleChunkError(message)) {
        return;
      }

      console.warn("[chunk-error] window error detected", message);
      tryReloadOnce(message);
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message = reason instanceof Error ? reason.message : String(reason || "");
      if (!shouldHandleChunkError(message)) {
        return;
      }

      console.warn("[chunk-error] promise rejection detected", message);
      tryReloadOnce(message);
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  return null;
}
