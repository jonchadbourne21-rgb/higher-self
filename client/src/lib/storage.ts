/**
 * Unified storage abstraction.
 *
 * All client-side persistence goes through this module instead of touching
 * localStorage / sessionStorage directly.
 *
 * Backends:
 *  - Web:    localStorage / sessionStorage (unchanged behavior)
 *  - Native: a synchronous in-memory cache hydrated from
 *            @capacitor/preferences at startup (see initStorage), with
 *            write-through persistence. This keeps the existing sync API
 *            intact so no call site had to change.
 *
 * On native, call `await initStorage()` BEFORE rendering the app (done in
 * main.tsx) so the cache is warm before anything reads from it.
 *
 * Two namespaces:
 *   storage  — persistent across sessions (was localStorage)
 *   session  — ephemeral, cleared when the app/session ends (was sessionStorage)
 */

import { isNative } from "@/lib/platform";

export const STORAGE_KEYS = {
  sessionToken: "app_session_token",
  theme: "theme",
  sidebarWidth: "mirrored_sidebar_width",
  runtimeUserInfo: "manus-runtime-user-info",
  demoMode: "mirrored_demo_mode",
  faqPulseDismissed: "mirrored_faq_pulse_dismissed",
  faqPulseCount: "mirrored_faq_pulse_count",
  checkInInsight: "checkInInsight",
} as const;

export function programInsightKey(programId: string | number, day: string | number) {
  return `program_insight_${programId}_${day}`;
}

/* ── Native persistent cache (hydrated from @capacitor/preferences) ──────── */

const nativeCache = new Map<string, string>();
let nativeHydrated = false;

type PreferencesPlugin = {
  get(opts: { key: string }): Promise<{ value: string | null }>;
  set(opts: { key: string; value: string }): Promise<void>;
  remove(opts: { key: string }): Promise<void>;
  keys(): Promise<{ keys: string[] }>;
};

let preferencesPlugin: PreferencesPlugin | null = null;

async function getPreferences(): Promise<PreferencesPlugin | null> {
  if (preferencesPlugin) return preferencesPlugin;
  try {
    const mod = await import("@capacitor/preferences");
    preferencesPlugin = mod.Preferences as unknown as PreferencesPlugin;
    return preferencesPlugin;
  } catch {
    return null;
  }
}

/**
 * Hydrate the native storage cache. No-op on web. Call once before render.
 */
export async function initStorage(): Promise<void> {
  if (!isNative() || nativeHydrated) return;
  const prefs = await getPreferences();
  if (!prefs) {
    nativeHydrated = true;
    return;
  }
  try {
    const { keys } = await prefs.keys();
    await Promise.all(
      keys.map(async (key) => {
        const { value } = await prefs.get({ key });
        if (value !== null) nativeCache.set(key, value);
      })
    );
  } catch {
    /* cache stays empty — reads fall through to defaults */
  }
  nativeHydrated = true;
}

function nativePersistSet(key: string, value: string): void {
  void getPreferences().then(
    (prefs) => prefs?.set({ key, value }),
    () => {}
  );
}

function nativePersistRemove(key: string): void {
  void getPreferences().then(
    (prefs) => prefs?.remove({ key }),
    () => {}
  );
}

/* ── Persistent storage ──────────────────────────────────────────────────── */

function safeGet(key: string): string | null {
  if (isNative()) return nativeCache.get(key) ?? null;
  try {
    return globalThis.localStorage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  if (isNative()) {
    nativeCache.set(key, value);
    nativePersistSet(key, value);
    return;
  }
  try {
    globalThis.localStorage?.setItem(key, value);
  } catch {
    /* storage unavailable (private mode, webview edge cases) */
  }
}

function safeRemove(key: string): void {
  if (isNative()) {
    nativeCache.delete(key);
    nativePersistRemove(key);
    return;
  }
  try {
    globalThis.localStorage?.removeItem(key);
  } catch {
    /* ignore */
  }
}

/* ── Ephemeral session storage (sessionStorage on web, memory on native) ─── */

const memorySession = new Map<string, string>();

function sessionGet(key: string): string | null {
  if (isNative()) return memorySession.get(key) ?? null;
  try {
    return globalThis.sessionStorage?.getItem(key) ?? memorySession.get(key) ?? null;
  } catch {
    return memorySession.get(key) ?? null;
  }
}

function sessionSet(key: string, value: string): void {
  memorySession.set(key, value);
  if (isNative()) return;
  try {
    globalThis.sessionStorage?.setItem(key, value);
  } catch {
    /* memory fallback already recorded */
  }
}

function sessionRemove(key: string): void {
  memorySession.delete(key);
  if (isNative()) return;
  try {
    globalThis.sessionStorage?.removeItem(key);
  } catch {
    /* ignore */
  }
}

export const storage = {
  getItem: safeGet,
  setItem: safeSet,
  removeItem: safeRemove,
};

export const session = {
  getItem: sessionGet,
  setItem: sessionSet,
  removeItem: sessionRemove,
};
