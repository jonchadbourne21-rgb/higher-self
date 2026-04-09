export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// IMPORTANT: The Manus OAuth server only has higherself-lqwmd5t8.manus.space
// registered as an allowed redirect URI. higherself.cloud is NOT registered
// with the OAuth server (it's only a Cloudflare proxy alias).
//
// Strategy:
//   1. Always send redirectUri = higherself-lqwmd5t8.manus.space/api/oauth/callback
//      (the registered domain the OAuth server accepts)
//   2. Encode the user's actual origin (higherself.cloud) in the state
//   3. After the callback succeeds on manus.space, the server redirects
//      the user back to higherself.cloud with the session token in ?_t=
//
// This way higherself.cloud users log in seamlessly without hitting
// "Permission denied - Redirect URI is not set".
const CANONICAL_ORIGIN = "https://higherself-lqwmd5t8.manus.space";

export const getLoginUrl = (returnPath = "/") => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;

  // Always use the registered canonical domain for the OAuth redirect URI
  const redirectUri = `${CANONICAL_ORIGIN}/api/oauth/callback`;

  // Encode the user's actual origin + return path in state so the server
  // can redirect back to higherself.cloud (or wherever) after login
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
