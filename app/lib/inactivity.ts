// app/lib/inactivity.ts
import { logout } from "@/app/lib/auth";

let timer: NodeJS.Timeout | null = null;
const TIMEOUT = 60 * 60 * 1000; // 1 hour
const LAST_ACTIVITY_KEY = "lastActivityTime";

function updateLastActivity() {
  localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
}

function reset() {
  updateLastActivity();
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => logout(), TIMEOUT);
}

export function checkInactivityOnLoad() {
  const lastActivityStr = localStorage.getItem(LAST_ACTIVITY_KEY);

  if (lastActivityStr) {
    const lastActivityTime = parseInt(lastActivityStr, 10);
    const timeSinceLastActivity = Date.now() - lastActivityTime;

    if (timeSinceLastActivity > TIMEOUT) {
      // User has been inactive for more than 1 hour
      logout();
      return true; // Session expired
    }
  }

  return false; // Session still valid
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
