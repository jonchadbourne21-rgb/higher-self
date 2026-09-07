import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Capacitor configuration for the canonical Mirrored product.
 *
 * Build 4 parity branch:
 * - Existing App Store bundle identity: com.mirrored.aiself
 * - Native URL scheme: mirrored://
 * - Production API: Railway
 * - No Manus runtime/navigation dependency
 */
const config: CapacitorConfig = {
  appId: "com.mirrored.aiself",
  appName: "Mirrored",
  webDir: "dist/public",

  server: {
    // Native API and voice provider origins only. Authentication uses the
    // native Sign in with Apple flow and does not navigate to Manus.
    allowNavigation: [
      "mirrored-backend-production.up.railway.app",
      "api.hume.ai",
    ],
  },

  ios: {
    scheme: "mirrored",
    contentInset: "automatic",
    backgroundColor: "#0a0a1a",
    allowsLinkPreview: false,
    preferredContentMode: "mobile",
  },

  android: {
    allowMixedContent: false,
    backgroundColor: "#0a0a1a",
  },

  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
