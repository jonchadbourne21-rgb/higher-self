/**
 * CORS behaviour for the native app shells.
 *
 * Exercises the real middleware from _core/cors.ts over a live HTTP server,
 * mounted exactly as server/_core/index.ts mounts it.
 */

import { describe, it, expect } from "vitest";
import express from "express";
import { createServer, type Server } from "http";
import type { AddressInfo } from "net";
import { nativeCors } from "./_core/cors";

async function withServer<T>(fn: (baseUrl: string) => Promise<T>): Promise<T> {
  const app = express();
  app.use("/api", nativeCors);
  app.all("/api/trpc/ping", (_req, res) => res.json({ ok: true }));

  const server: Server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const { port } = server.address() as AddressInfo;

  try {
    return await fn(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

describe("native CORS middleware", () => {
  it("allows the iOS WebView origin", async () => {
    await withServer(async (base) => {
      const res = await fetch(`${base}/api/trpc/ping`, {
        headers: { origin: "capacitor://localhost" },
      });
      expect(res.headers.get("access-control-allow-origin")).toBe("capacitor://localhost");
      expect(res.headers.get("access-control-allow-credentials")).toBe("true");
    });
  });

  it("allows the Android WebView origin", async () => {
    await withServer(async (base) => {
      const res = await fetch(`${base}/api/trpc/ping`, {
        headers: { origin: "http://localhost" },
      });
      expect(res.headers.get("access-control-allow-origin")).toBe("http://localhost");
    });
  });

  it("echoes the exact origin rather than a wildcard", async () => {
    // Browsers reject Access-Control-Allow-Origin: * when the request carries
    // credentials, and the tRPC client sends credentials: "include".
    await withServer(async (base) => {
      const res = await fetch(`${base}/api/trpc/ping`, {
        headers: { origin: "capacitor://localhost" },
      });
      expect(res.headers.get("access-control-allow-origin")).not.toBe("*");
    });
  });

  it("answers the preflight so the real request is allowed to follow", async () => {
    await withServer(async (base) => {
      const res = await fetch(`${base}/api/trpc/ping`, {
        method: "OPTIONS",
        headers: {
          origin: "capacitor://localhost",
          "access-control-request-method": "POST",
          "access-control-request-headers": "authorization",
        },
      });
      expect(res.status).toBe(204);
      expect(res.headers.get("access-control-allow-methods")).toContain("POST");
    });
  });

  it("permits the headers the tRPC client actually sends", async () => {
    await withServer(async (base) => {
      const res = await fetch(`${base}/api/trpc/ping`, {
        method: "OPTIONS",
        headers: { origin: "capacitor://localhost" },
      });
      const allowed = res.headers.get("access-control-allow-headers") ?? "";
      expect(allowed).toContain("authorization");
      expect(allowed).toContain("content-type");
      expect(allowed).toContain("x-demo-mode");
    });
  });

  it("does not grant access to an arbitrary website", async () => {
    await withServer(async (base) => {
      const res = await fetch(`${base}/api/trpc/ping`, {
        headers: { origin: "https://evil.example.com" },
      });
      expect(res.headers.get("access-control-allow-origin")).toBeNull();
    });
  });

  it("leaves same-origin requests untouched", async () => {
    // The web app sends no Origin header on same-origin requests; it must keep
    // working exactly as before.
    await withServer(async (base) => {
      const res = await fetch(`${base}/api/trpc/ping`);
      expect(res.status).toBe(200);
      expect(res.headers.get("access-control-allow-origin")).toBeNull();
      expect(await res.json()).toEqual({ ok: true });
    });
  });

  it("sets Vary: Origin so shared caches do not serve the wrong headers", async () => {
    await withServer(async (base) => {
      const res = await fetch(`${base}/api/trpc/ping`, {
        headers: { origin: "capacitor://localhost" },
      });
      expect(res.headers.get("vary")).toContain("Origin");
    });
  });
});
