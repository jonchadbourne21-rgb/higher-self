/**
 * Validates that the Hume AI credentials (HUME_API_KEY + HUME_SECRET_KEY) can
 * successfully mint an access token from the Hume OAuth2 endpoint.
 */
import { describe, it, expect } from "vitest";

describe("Hume AI credentials", () => {
  it("should mint an access token from HUME_API_KEY + HUME_SECRET_KEY", async () => {
    const apiKey = process.env.HUME_API_KEY;
    const secretKey = process.env.HUME_SECRET_KEY;

    // Skip if not configured (CI without secrets)
    if (!apiKey || !secretKey) {
      console.warn("HUME_API_KEY / HUME_SECRET_KEY not set — skipping credential test");
      return;
    }

    const basic = Buffer.from(`${apiKey}:${secretKey}`).toString("base64");
    const res = await fetch("https://api.hume.ai/oauth2-cc/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basic}`,
      },
      body: "grant_type=client_credentials",
    });

    expect(res.ok).toBe(true);
    const json = await res.json();
    expect(json.access_token).toBeDefined();
    expect(typeof json.access_token).toBe("string");
    expect(json.access_token.length).toBeGreaterThan(0);
  });
});
