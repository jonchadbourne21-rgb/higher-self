import { storage, STORAGE_KEYS } from "@/lib/storage";

/**
 * Demo Mode Utilities
 * 
 * Demo mode allows unauthenticated users to explore the app with a read-only
 * demo user. The server recognizes the x-demo-mode header and returns a
 * hardcoded demo user from context.ts.
 */



export function isDemoMode(): boolean {
  return storage.getItem(STORAGE_KEYS.demoMode) === "true";
}

export function enableDemoMode() {
  storage.setItem(STORAGE_KEYS.demoMode, "true");
}

export function disableDemoMode() {
  storage.removeItem(STORAGE_KEYS.demoMode);
}
