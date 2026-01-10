// app/lib/inactivity.ts
import { logout } from "@/app/lib/auth";

let timer: NodeJS.Timeout | null = null;
const TIMEOUT = 60 * 60 * 1000; // 1 hour

function reset() {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => logout(), TIMEOUT);
}

export function startInactivityListener() {
  const events = ["mousemove", "keydown", "scroll", "click", "touchstart"];
  events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
  reset();

  return () => {
    events.forEach((e) => window.removeEventListener(e, reset));
    if (timer) clearTimeout(timer);
  };
}
