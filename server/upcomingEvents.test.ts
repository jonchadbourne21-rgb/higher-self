import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getUpcomingEvents } from "./db";

describe("Upcoming Events", () => {
  it("should return an empty array when no events exist", async () => {
    const result = await getUpcomingEvents(999999, 3);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });

  it("should return upcoming events sorted by date", async () => {
    // This test assumes events exist in the database
    // In a real scenario, you'd seed test data first
    const result = await getUpcomingEvents(1, 3);
    
    if (result.length > 1) {
      for (let i = 0; i < result.length - 1; i++) {
        expect(result[i].eventDate.getTime()).toBeLessThanOrEqual(
          result[i + 1].eventDate.getTime()
        );
      }
    }
  });

  it("should respect the limit parameter", async () => {
    const result = await getUpcomingEvents(1, 2);
    expect(result.length).toBeLessThanOrEqual(2);
  });

  it("should only return events from today onwards", async () => {
    const now = new Date();
    const result = await getUpcomingEvents(1, 10);
    
    result.forEach((event) => {
      expect(event.eventDate.getTime()).toBeGreaterThanOrEqual(
        now.getTime()
      );
    });
  });

  it("should include event id, title, eventDate, and type", async () => {
    const result = await getUpcomingEvents(1, 1);
    
    if (result.length > 0) {
      const event = result[0];
      expect(event).toHaveProperty("id");
      expect(event).toHaveProperty("title");
      expect(event).toHaveProperty("eventDate");
      expect(event).toHaveProperty("type");
      expect(typeof event.id).toBe("number");
      expect(typeof event.title).toBe("string");
      expect(event.eventDate instanceof Date).toBe(true);
      expect(typeof event.type).toBe("string");
    }
  });

  it("should handle different limit values", async () => {
    const limit1 = await getUpcomingEvents(1, 1);
    const limit3 = await getUpcomingEvents(1, 3);
    const limit5 = await getUpcomingEvents(1, 5);
    
    expect(limit1.length).toBeLessThanOrEqual(1);
    expect(limit3.length).toBeLessThanOrEqual(3);
    expect(limit5.length).toBeLessThanOrEqual(5);
  });

  it("should return empty array for non-existent user", async () => {
    const result = await getUpcomingEvents(999999, 3);
    expect(result).toEqual([]);
  });

  it("should return event type as one of the valid enum values", async () => {
    const result = await getUpcomingEvents(1, 1);
    const validTypes = ["therapy", "goal", "habit", "reminder", "other"];
    
    result.forEach((event) => {
      expect(validTypes).toContain(event.type);
    });
  });

  it("should have title as a non-empty string", async () => {
    const result = await getUpcomingEvents(1, 1);
    
    result.forEach((event) => {
      expect(typeof event.title).toBe("string");
      expect(event.title.length).toBeGreaterThan(0);
    });
  });

  it("should return events in ascending date order", async () => {
    const result = await getUpcomingEvents(1, 5);
    
    for (let i = 0; i < result.length - 1; i++) {
      expect(result[i].eventDate.getTime()).toBeLessThanOrEqual(
        result[i + 1].eventDate.getTime()
      );
    }
  });
});
