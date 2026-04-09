export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Generate login URL at runtime so redirect URI reflects the current origin.
// This allows OAuth to work on any domain (higherself.cloud, synapset.manus.space, etc.)
// without needing to register each domain separately.
export const getLoginUrl = (returnPath = "/") => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;
  
  // Use the current domain as the redirect URI
  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  
  // Encode the redirect URI in state for the callback handler
  const state = btoa(redirectUri);
  
  const url = new URL(`${oauthPortalUrl}/app-auth`);
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");
  
  return url.toString();
};
