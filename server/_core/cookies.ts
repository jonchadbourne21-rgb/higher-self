import type { CookieOptions, Request } from "express";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function isIpAddress(host: string) {
  // Basic IPv4 check and IPv6 presence detection.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
  return host.includes(":");
}

export function getSessionCookieOptions(
  req: Request
): Pick<CookieOptions, "domain" | "httpOnly" | "path" | "sameSite" | "secure"> {
  const hostname = req.hostname || "";
  const isLocal = LOCAL_HOSTS.has(hostname) || isIpAddress(hostname);

  // Local dev: use lax + no secure so cookies work without HTTPS
  if (isLocal) {
    return {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: false,
    };
  }

  // Published domain (manus.space or any HTTPS host):
  // sameSite=none requires secure=true for cross-site cookies
  // The published app is always served over HTTPS
  return {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: true,
  };
}
