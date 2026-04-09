export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// OAuth Redirect URI Strategy:
// =============================
// The OAuth server requires exact redirect URI matching. To support multiple domains
// (higherself-lqwmd5t8.manus.space, synapset.manus.space, higherself.cloud, www.higherself.cloud),
// we use the CURRENT domain as the redirect URI and encode it in the state.
//
// Flow:
//   1. User is on domain X (e.g., higherself.cloud)
//   2. Send redirectUri = X/api/oauth/callback to OAuth server
//   3. After OAuth succeeds, callback fires on domain X
//   4. Server sets cookie and redirects to returnPath
//   5. No cross-domain redirects needed
//
// IMPORTANT: All domains MUST be registered in the Manus OAuth app settings:
//   - https://higherself-lqwmd5t8.manus.space/api/oauth/callback
//   - https://synapset.manus.space/api/oauth/callback
//   - https://higherself.cloud/api/oauth/callback
//   - https://www.higherself.cloud/api/oauth/callback

export const getLoginUrl = (returnPath = "/") => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;

  // Use the CURRENT domain as the redirect URI
  // This ensures OAuth server accepts it (assuming all domains are registered)
  const currentOrigin = window.location.origin;
  const redirectUri = `${currentOrigin}/api/oauth/callback`;

  // Encode redirect URI and return path in state for the callback handler
  const statePayload = JSON.stringify({ redirectUri, returnPath });
  const state = btoa(statePayload);

  const url = new URL(`${oauthPortalUrl}/app-auth`);
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");

  return url.toString();
};
