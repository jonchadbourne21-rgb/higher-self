import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Capacitor configuration — wraps the existing Vite web build as a native
 * iOS/Android app. The web app keeps working in browsers unchanged.
 *
 * Bundle ID: cloud.higherself.app
 * App Name: Mirrored
 * URL Scheme: higherself://
 *
 * Setup (one time on Mac with Xcode):
 *   pnpm cap:add:ios
 * Build & sync:
 *   pnpm cap:build
 * Open in Xcode:
 *   pnpm cap:open:ios
 */
const config: CapacitorConfig = {
  appId: "cloud.higherself.app",
  appName: "Mirrored",
  webDir: "dist/public",

  server: {
    // Allow navigation to the production API + OAuth portal from the WebView.
    allowNavigation: [
      "mirroredapp.manus.space",
      "themirroredapp.com",
      "*.themirroredapp.com",
      "manus.im",
      "*.manus.im",
      "api.hume.ai",
    ],
  },

  ios: {
    // Custom URL scheme for OAuth deep-link callback
    scheme: "higherself",
    // Content inset behavior for safe areas
    contentInset: "automatic",
    // Background color while web view loads
    backgroundColor: "#0a0a1a",
    // Allow inline media playback (needed for voice)
    allowsLinkPreview: false,
    preferredContentMode: "mobile",
  },

  android: {
    allowMixedContent: false,
    backgroundColor: "#0a0a1a",
  },

  plugins: {
    PushNotifications: {
      // Request push permission on first launch
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
