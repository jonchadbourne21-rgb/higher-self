import { timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

function constantTimeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function scheduledJobAuth(req: Request, res: Response, next: NextFunction) {
  const expected = process.env.SCHEDULED_JOB_SECRET?.trim();
  if (!expected) {
    res.status(503).json({ error: "scheduled jobs are not configured" });
    return;
  }

  const authorization = req.get("authorization") || "";
  const prefix = "Bearer ";
  const supplied = authorization.startsWith(prefix)
    ? authorization.slice(prefix.length).trim()
    : "";

  if (!supplied || !constantTimeEqual(supplied, expected)) {
    res.status(401).json({ error: "unauthorized scheduled request" });
    return;
  }

  next();
}
