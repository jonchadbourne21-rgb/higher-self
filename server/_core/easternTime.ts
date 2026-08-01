/**
 * Eastern-time helpers for the program lesson unlock gate.
 *
 * The gate opens the next lesson at 6:00 AM Eastern. "Eastern" is not a fixed
 * offset: it is UTC-5 (EST) in winter and UTC-4 (EDT) from the second Sunday in
 * March to the first Sunday in November — roughly eight months of the year.
 *
 * The previous implementation hardcoded UTC-5 year-round, so through the whole
 * of EDT the gate opened at 7:00 AM local while the client countdown — which
 * formats with the real `America/New_York` zone — displayed 6:00 AM.
 *
 * These helpers resolve the offset from the IANA database via Intl, so they stay
 * correct through DST transitions and any future legislative change to the
 * rules. They also do not depend on the server's own TZ setting; the old code
 * used Date#setHours, which silently assumed the process ran in UTC.
 */

export const PROGRAM_TIME_ZONE = "America/New_York";

/** Hour of the day, in PROGRAM_TIME_ZONE, at which the next lesson unlocks. */
export const UNLOCK_HOUR = 6;

type WallClock = {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  second: number;
};

const partsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: PROGRAM_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

/** Wall-clock reading in PROGRAM_TIME_ZONE for a given UTC instant. */
export function getEasternWallClock(instant: Date): WallClock {
  const parts: Record<string, string> = {};
  for (const part of partsFormatter.formatToParts(instant)) {
    if (part.type !== "literal") parts[part.type] = part.value;
  }
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    // hourCycle h23 keeps midnight at 00, but guard anyway — some ICU builds
    // have historically emitted 24 here.
    hour: Number(parts.hour) % 24,
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

/**
 * Offset of PROGRAM_TIME_ZONE from UTC at a given instant, in milliseconds.
 * Negative west of Greenwich: -5h during EST, -4h during EDT.
 */
function easternOffsetMs(instant: Date): number {
  const wall = getEasternWallClock(instant);
  const asIfUtc = Date.UTC(
    wall.year,
    wall.month - 1,
    wall.day,
    wall.hour,
    wall.minute,
    wall.second
  );
  // Drop sub-second precision from the original instant so the difference is a
  // clean offset rather than offset-minus-milliseconds.
  return asIfUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

/**
 * Convert a wall-clock time in PROGRAM_TIME_ZONE to the UTC instant it names.
 *
 * 6 AM is never ambiguous (the fall-back repeat is at 1 AM) nor nonexistent
 * (the spring-forward skip is at 2 AM), but the second pass below resolves both
 * cases correctly anyway, so this stays safe if UNLOCK_HOUR ever changes.
 */
export function easternWallTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute = 0,
  second = 0
): Date {
  const naive = Date.UTC(year, month - 1, day, hour, minute, second);

  // First pass: assume the offset in effect at the naive instant.
  const firstGuess = naive - easternOffsetMs(new Date(naive));

  // Second pass: the offset at the corrected instant may differ if the naive
  // guess landed on the far side of a transition.
  const refinedOffset = easternOffsetMs(new Date(firstGuess));
  return new Date(naive - refinedOffset);
}

/**
 * The next UNLOCK_HOUR in PROGRAM_TIME_ZONE strictly after `afterUtc`.
 *
 * If `afterUtc` falls before today's unlock hour (Eastern), returns today's.
 * Otherwise returns tomorrow's.
 */
export function nextUnlockAfter(afterUtc: Date): Date {
  const wall = getEasternWallClock(afterUtc);

  const todayUnlock = easternWallTimeToUtc(wall.year, wall.month, wall.day, UNLOCK_HOUR);
  if (afterUtc.getTime() < todayUnlock.getTime()) return todayUnlock;

  // Advance one Eastern calendar day. Stepping the date through Date.UTC keeps
  // month and year rollover correct without touching the offset.
  const nextDay = new Date(Date.UTC(wall.year, wall.month - 1, wall.day) + 24 * 60 * 60 * 1000);
  return easternWallTimeToUtc(
    nextDay.getUTCFullYear(),
    nextDay.getUTCMonth() + 1,
    nextDay.getUTCDate(),
    UNLOCK_HOUR
  );
}
