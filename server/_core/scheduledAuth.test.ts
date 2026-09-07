import { afterEach, describe, expect, it, vi } from "vitest";
import { scheduledJobAuth } from "./scheduledAuth";

function makeResponse() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
}

function makeRequest(authorization?: string) {
  return {
    get: vi.fn((name: string) =>
      name.toLowerCase() === "authorization" ? authorization : undefined
    ),
  };
}

const originalSecret = process.env.SCHEDULED_JOB_SECRET;

afterEach(() => {
  if (originalSecret === undefined) delete process.env.SCHEDULED_JOB_SECRET;
  else process.env.SCHEDULED_JOB_SECRET = originalSecret;
  vi.restoreAllMocks();
});

describe("scheduledJobAuth", () => {
  it("fails closed when scheduled jobs are not configured", () => {
    delete process.env.SCHEDULED_JOB_SECRET;
    const req = makeRequest();
    const res = makeResponse();
    const next = vi.fn();

    scheduledJobAuth(req as any, res as any, next);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({ error: "scheduled jobs are not configured" });
    expect(next).not.toHaveBeenCalled();
  });

  it.each([
    ["missing authorization", undefined],
    ["wrong bearer token", "Bearer wrong-secret"],
    ["wrong scheme", "Basic correct-secret"],
  ])("rejects %s", (_label, authorization) => {
    process.env.SCHEDULED_JOB_SECRET = "correct-secret";
    const req = makeRequest(authorization);
    const res = makeResponse();
    const next = vi.fn();

    scheduledJobAuth(req as any, res as any, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "unauthorized scheduled request" });
    expect(next).not.toHaveBeenCalled();
  });

  it("allows an exact bearer secret and delegates to the scheduled handler", () => {
    process.env.SCHEDULED_JOB_SECRET = "correct-secret";
    const req = makeRequest("Bearer correct-secret");
    const res = makeResponse();
    const next = vi.fn();

    scheduledJobAuth(req as any, res as any, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
});
