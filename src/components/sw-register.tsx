"use client";

import { useEffect } from "react";

/** Registra o service worker das notificações (lembretes e Pomodoro). */
export function SwRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}
