export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// higherself.cloud is the primary published domain and is registered with
// Manus OAuth. We always use it as the redirectUri so the OAuth server
// accepts the callback. The state payload carries the user's actual origin
// (could be higherself.cloud, www.higherself.cloud, or higherself.manus.space)
// so the server can redirect back to wherever they came from after login.
const CANONICAL_ORIGIN = "https://higherself.cloud";

// Generate login URL at runtime.
// - redirectUri always points to the CANONICAL registered domain
// - state encodes the user's actual origin + return path so the callback
//   can redirect back to the right domain after login
export const getLoginUrl = (returnPath = "/") => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;

  // Always use the registered canonical domain for the OAuth redirect URI
  const redirectUri = `${CANONICAL_ORIGIN}/api/oauth/callback`;

  // Encode the user's actual origin + return path in state so the server
  // can redirect back to the right domain after login
  const actualOrigin = window.location.origin;
  const statePayload = JSON.stringify({ redirectUri, returnOrigin: actualOrigin, returnPath });
  const state = btoa(statePayload);

  const url = new URL(`${oauthPortalUrl}/app-auth`);
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");

  return url.toString();
};
