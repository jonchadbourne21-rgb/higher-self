export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// The canonical manus.space domain that is registered with Manus OAuth.
// The custom domain (higherself.cloud) is NOT registered, so we always use
// this as the redirectUri in the OAuth request to avoid "Permission denied".
const CANONICAL_ORIGIN = "https://higherself-lqwmd5t8.manus.space";

// Generate login URL at runtime.
// - redirectUri always points to the CANONICAL (registered) manus.space domain
// - state encodes the user's actual current origin so the callback can
//   redirect back to higherself.cloud (or wherever) after login
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
