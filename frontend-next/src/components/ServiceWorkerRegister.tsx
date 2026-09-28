"use client";

import { useEffect } from "react";

// Registers /sw.js once (prod only — a dev SW would serve stale bundles).
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Offline support is best-effort; the app works without it.
    });
  }, []);
  return null;
}
