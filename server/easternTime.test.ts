/**
 * Eastern-time unlock gate.
 *
 * The regression these guard: the gate previously hardcoded UTC-5 year-round, so
 * for the ~8 months of EDT it opened lessons at 7:00 AM local while the client
 * countdown (which formats with the real America/New_York zone) said 6:00 AM.
 */

import { describe, it, expect } from "vitest";
import {
  nextUnlockAfter,
  easternWallTimeToUtc,
  getEasternWallClock,
  PROGRAM_TIME_ZONE,
  UNLOCK_HOUR,
} from "./_core/easternTime";

/** Render an instant as Eastern wall time, the way the client's UI does. */
function easternClock(d: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: PROGRAM_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(d);
}

function easternDate(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: PROGRAM_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

describe("easternWallTimeToUtc", () => {
  it("maps 6 AM winter (EST, UTC-5) to 11:00 UTC", () => {
    expect(easternWallTimeToUtc(2026, 1, 15, 6).toISOString()).toBe("2026-01-15T11:00:00.000Z");
  });

  it("maps 6 AM summer (EDT, UTC-4) to 10:00 UTC", () => {
    // The old fixed-offset code produced 11:00Z here, i.e. 7 AM local.
    expect(easternWallTimeToUtc(2026, 7, 15, 6).toISOString()).toBe("2026-07-15T10:00:00.000Z");
  });

  it("round-trips to 6 AM local on both sides of the spring transition", () => {
    // DST begins Sunday 8 March 2026 at 02:00 local.
    expect(easternClock(easternWallTimeToUtc(2026, 3, 7, 6))).toBe("06:00");
    expect(easternClock(easternWallTimeToUtc(2026, 3, 8, 6))).toBe("06:00");
    expect(easternClock(easternWallTimeToUtc(2026, 3, 9, 6))).toBe("06:00");
  });

  it("round-trips to 6 AM local on both sides of the autumn transition", () => {
    // DST ends Sunday 1 November 2026 at 02:00 local.
    expect(easternClock(easternWallTimeToUtc(2026, 10, 31, 6))).toBe("06:00");
    expect(easternClock(easternWallTimeToUtc(2026, 11, 1, 6))).toBe("06:00");
    expect(easternClock(easternWallTimeToUtc(2026, 11, 2, 6))).toBe("06:00");
  });
});

describe("getEasternWallClock", () => {
  it("reads summer instants as EDT", () => {
    const w = getEasternWallClock(new Date("2026-07-15T16:30:00Z"));
    expect(w).toMatchObject({ year: 2026, month: 7, day: 15, hour: 12, minute: 30 });
  });

  it("reads winter instants as EST", () => {
    const w = getEasternWallClock(new Date("2026-01-15T16:30:00Z"));
    expect(w).toMatchObject({ year: 2026, month: 1, day: 15, hour: 11, minute: 30 });
  });

  it("attributes a late-evening Eastern instant to the correct local day", () => {
    // 03:00 UTC on the 16th is still 23:00 on the 15th in New York (EDT, UTC-4).
    const w = getEasternWallClock(new Date("2026-07-16T03:00:00Z"));
    expect(w).toMatchObject({ month: 7, day: 15, hour: 23 });
  });
});

describe("nextUnlockAfter", () => {
  it("always lands on 6 AM Eastern, whatever the season", () => {
    for (const iso of [
      "2026-01-15T09:00:00Z",
      "2026-04-15T09:00:00Z",
      "2026-07-15T09:00:00Z",
      "2026-10-15T09:00:00Z",
      "2026-12-31T23:30:00Z",
    ]) {
      expect(easternClock(nextUnlockAfter(new Date(iso)))).toBe("06:00");
    }
  });

  it("returns today's unlock when the completion was before 6 AM Eastern", () => {
    // 08:00Z on 15 July = 04:00 EDT, still before the gate.
    const unlock = nextUnlockAfter(new Date("2026-07-15T08:00:00Z"));
    expect(unlock.toISOString()).toBe("2026-07-15T10:00:00.000Z");
  });

  it("returns tomorrow's unlock when the completion was after 6 AM Eastern", () => {
    // 14:00Z on 15 July = 10:00 EDT, past the gate.
    const unlock = nextUnlockAfter(new Date("2026-07-15T14:00:00Z"));
    expect(unlock.toISOString()).toBe("2026-07-16T10:00:00.000Z");
  });

  it("treats exactly 6 AM Eastern as already passed, so the gate moves to tomorrow", () => {
    const unlock = nextUnlockAfter(new Date("2026-07-15T10:00:00.000Z"));
    expect(easternDate(unlock)).toBe("2026-07-16");
  });

  it("rolls over the month boundary", () => {
    const unlock = nextUnlockAfter(new Date("2026-07-31T14:00:00Z"));
    expect(easternDate(unlock)).toBe("2026-08-01");
  });

  it("rolls over the year boundary", () => {
    // 20:00Z on 31 Dec = 15:00 EST, past the gate.
    const unlock = nextUnlockAfter(new Date("2026-12-31T20:00:00Z"));
    expect(easternDate(unlock)).toBe("2027-01-01");
    expect(easternClock(unlock)).toBe("06:00");
  });

  it("handles a completion on the day the clocks spring forward", () => {
    // Completed 14:00Z on 8 March 2026 (10:00 EDT, transition already past).
    const unlock = nextUnlockAfter(new Date("2026-03-08T14:00:00Z"));
    expect(easternDate(unlock)).toBe("2026-03-09");
    expect(easternClock(unlock)).toBe("06:00");
    expect(unlock.toISOString()).toBe("2026-03-09T10:00:00.000Z");
  });

  it("handles a completion the evening before the clocks spring forward", () => {
    // 23:00 EST on 7 March. Next unlock is 6 AM on the 8th, which is EDT.
    const unlock = nextUnlockAfter(new Date("2026-03-08T04:00:00Z"));
    expect(easternDate(unlock)).toBe("2026-03-08");
    expect(easternClock(unlock)).toBe("06:00");
    expect(unlock.toISOString()).toBe("2026-03-08T10:00:00.000Z");
  });

  it("handles a completion on the day the clocks fall back", () => {
    // Completed 16:00Z on 1 Nov 2026 (11:00 EST, transition already past).
    const unlock = nextUnlockAfter(new Date("2026-11-01T16:00:00Z"));
    expect(easternDate(unlock)).toBe("2026-11-02");
    expect(easternClock(unlock)).toBe("06:00");
    expect(unlock.toISOString()).toBe("2026-11-02T11:00:00.000Z");
  });

  it("handles a completion the evening before the clocks fall back", () => {
    // 22:00 EDT on 31 Oct. Next unlock is 6 AM on 1 Nov, which is EST.
    const unlock = nextUnlockAfter(new Date("2026-11-01T02:00:00Z"));
    expect(easternDate(unlock)).toBe("2026-11-01");
    expect(unlock.toISOString()).toBe("2026-11-01T11:00:00.000Z");
  });

  it("never returns an instant in the past relative to its input", () => {
    // Walk an entire year at 7-hour steps, crossing both transitions.
    const start = Date.UTC(2026, 0, 1);
    const step = 7 * 60 * 60 * 1000;
    for (let t = start; t < start + 365 * 24 * 60 * 60 * 1000; t += step) {
      const from = new Date(t);
      const unlock = nextUnlockAfter(from);
      expect(unlock.getTime()).toBeGreaterThan(from.getTime());
      expect(easternClock(unlock)).toBe(`0${UNLOCK_HOUR}:00`);
      // Never further out than a day and a bit.
      expect(unlock.getTime() - from.getTime()).toBeLessThanOrEqual(25 * 60 * 60 * 1000);
    }
  });
});
