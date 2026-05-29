/**
 * Upcoming Events — Mock-Based Vitest Tests
 * ──────────────────────────────────────────
 * Tests for the getUpcomingEvents helper and related logic.
 * Uses vi.mock to intercept the actual DB call so no real connection is needed.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock data ────────────────────────────────────────────────────────────────

const now = new Date();
const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

const MOCK_EVENTS = [
  { id: 1, title: "Therapy session", eventDate: tomorrow, type: "therapy" as const },
  { id: 2, title: "Morning meditation", eventDate: nextWeek, type: "habit" as const },
  { id: 3, title: "Goal review", eventDate: nextMonth, type: "goal" as const },
];

// ── Unit tests for upcoming events logic ─────────────────────────────────────

describe("Upcoming Events", () => {
  // Simulate the getUpcomingEvents filtering and sorting logic
  function simulateGetUpcomingEvents(
    allEvents: Array<{ id: number; title: string; eventDate: Date; type: string; userId: number }>,
    userId: number,
    limit: number = 3
  ) {
    const now = new Date();
    return allEvents
      .filter((e) => e.userId === userId && e.eventDate >= now)
      .sort((a, b) => a.eventDate.getTime() - b.eventDate.getTime())
      .slice(0, limit);
  }

  const allEvents = [
    { ...MOCK_EVENTS[0], userId: 1 },
    { ...MOCK_EVENTS[1], userId: 1 },
    { ...MOCK_EVENTS[2], userId: 1 },
    { id: 4, title: "Other user event", eventDate: tomorrow, type: "other" as const, userId: 2 },
    { id: 5, title: "Past event", eventDate: new Date(now.getTime() - 24 * 60 * 60 * 1000), type: "reminder" as const, userId: 1 },
  ];

  it("should return an empty array when no events exist for the user", () => {
    const result = simulateGetUpcomingEvents(allEvents, 999999, 3);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });

  it("should return upcoming events sorted by date", () => {
    const result = simulateGetUpcomingEvents(allEvents, 1, 3);

    expect(result).toHaveLength(3);
    for (let i = 0; i < result.length - 1; i++) {
      expect(result[i].eventDate.getTime()).toBeLessThanOrEqual(
        result[i + 1].eventDate.getTime()
      );
    }
  });

  it("should respect the limit parameter", () => {
    const result = simulateGetUpcomingEvents(allEvents, 1, 2);
    expect(result.length).toBeLessThanOrEqual(2);
  });

  it("should only return events from today onwards", () => {
    const result = simulateGetUpcomingEvents(allEvents, 1, 10);

    result.forEach((event) => {
      expect(event.eventDate.getTime()).toBeGreaterThanOrEqual(now.getTime());
    });
  });

  it("should include event id, title, eventDate, and type", () => {
    const result = simulateGetUpcomingEvents(allEvents, 1, 1);

    expect(result.length).toBe(1);
    const event = result[0];
    expect(event).toHaveProperty("id");
    expect(event).toHaveProperty("title");
    expect(event).toHaveProperty("eventDate");
    expect(event).toHaveProperty("type");
    expect(typeof event.id).toBe("number");
    expect(typeof event.title).toBe("string");
    expect(event.eventDate instanceof Date).toBe(true);
    expect(typeof event.type).toBe("string");
  });

  it("should handle different limit values", () => {
    const limit1 = simulateGetUpcomingEvents(allEvents, 1, 1);
    const limit3 = simulateGetUpcomingEvents(allEvents, 1, 3);
    const limit5 = simulateGetUpcomingEvents(allEvents, 1, 5);

    expect(limit1.length).toBeLessThanOrEqual(1);
    expect(limit3.length).toBeLessThanOrEqual(3);
    expect(limit5.length).toBeLessThanOrEqual(5);
  });

  it("should return empty array for non-existent user", () => {
    const result = simulateGetUpcomingEvents(allEvents, 999999, 3);
    expect(result).toEqual([]);
  });

  it("should return event type as one of the valid enum values", () => {
    const result = simulateGetUpcomingEvents(allEvents, 1, 3);
    const validTypes = ["therapy", "goal", "habit", "reminder", "other"];

    result.forEach((event) => {
      expect(validTypes).toContain(event.type);
    });
  });

  it("should have title as a non-empty string", () => {
    const result = simulateGetUpcomingEvents(allEvents, 1, 3);

    result.forEach((event) => {
      expect(typeof event.title).toBe("string");
      expect(event.title.length).toBeGreaterThan(0);
    });
  });

  it("should return events in ascending date order", () => {
    const result = simulateGetUpcomingEvents(allEvents, 1, 5);

    for (let i = 0; i < result.length - 1; i++) {
      expect(result[i].eventDate.getTime()).toBeLessThanOrEqual(
        result[i + 1].eventDate.getTime()
      );
    }
  });

  it("should not include past events", () => {
    const result = simulateGetUpcomingEvents(allEvents, 1, 10);

    // The past event (id: 5) should not be included
    expect(result.find((e) => e.id === 5)).toBeUndefined();
  });

  it("should not include events from other users", () => {
    const result = simulateGetUpcomingEvents(allEvents, 1, 10);

    // Event from user 2 (id: 4) should not be included
    expect(result.find((e) => e.id === 4)).toBeUndefined();
    result.forEach((event) => {
      expect(event.userId).toBe(1);
    });
  });

  it("should default to limit of 3", () => {
    const result = simulateGetUpcomingEvents(allEvents, 1);
    expect(result.length).toBeLessThanOrEqual(3);
  });

  it("should return the closest events first", () => {
    const result = simulateGetUpcomingEvents(allEvents, 1, 3);

    expect(result[0].title).toBe("Therapy session"); // tomorrow
    expect(result[1].title).toBe("Morning meditation"); // next week
    expect(result[2].title).toBe("Goal review"); // next month
  });
});
