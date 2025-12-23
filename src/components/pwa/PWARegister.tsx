"use client";

import { useEffect } from "react";

export default function PWARegister() {
  useEffect(() => {
    // En DEV desactivamos SW: evita caché agresiva que hace que no se vean cambios
    // (y diferencias raras entre localhost vs IP).
    if (process.env.NODE_ENV !== "production") return;
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
