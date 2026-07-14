/**
 * Demo Mode Utilities
 * 
 * Demo mode allows unauthenticated users to explore the app with a read-only
 * demo user. The server recognizes the x-demo-mode header and returns a
 * hardcoded demo user from context.ts.
 */

const DEMO_MODE_KEY = "mirrored_demo_mode";

export function isDemoMode(): boolean {
  return localStorage.getItem(DEMO_MODE_KEY) === "true";
}

export function enableDemoMode() {
  localStorage.setItem(DEMO_MODE_KEY, "true");
}

export function disableDemoMode() {
  localStorage.removeItem(DEMO_MODE_KEY);
}
