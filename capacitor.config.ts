import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Capacitor configuration — wraps the existing Vite web build as a native
 * iOS/Android app. The web app keeps working in browsers unchanged.
 *
 * Setup (one time):
 *   pnpm cap:add:ios && pnpm cap:add:android
 * Iterate:
 *   pnpm build && pnpm cap:sync
 */
const config: CapacitorConfig = {
  appId: "cloud.higherself.app",
  appName: "Mirrored",
  webDir: "dist/public",
  server: {
    // Allow navigation to the production API + OAuth portal from the WebView.
    allowNavigation: ["higherself.cloud", "*.higherself.cloud"],
  },
  ios: {
    scheme: "higherself",
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
