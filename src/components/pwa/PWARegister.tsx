"use client";

import { useEffect } from "react";

export default function PWARegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const run = async () => {
      try {
        await navigator.serviceWorker.register("/sw.js");
      } catch {
        // silencio: PWA es opcional
      }
    };

    run();
  }, []);

  return null;
}
