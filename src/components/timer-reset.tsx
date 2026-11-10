"use client";

import { useEffect } from "react";

/** Zera o cronômetro depois que uma sessão foi salva. */
export function TimerReset() {
  useEffect(() => {
    try {
      localStorage.removeItem("focus-timer");
    } catch {
      /* ignora */
    }
  }, []);
  return null;
}
