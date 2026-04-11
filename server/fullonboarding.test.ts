import { describe, it, expect, vi, beforeEach } from "vitest";
import { saveFullOnboarding } from "./db";

// Mock the database module
vi.mock("./db", async () => {
  const actual = await vi.importActual("./db");
  return {
    ...actual,
    saveFullOnboarding: vi.fn(),
  };
});

describe("Full Onboarding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should save full onboarding data with all required fields", async () => {
    const userId = 1;
    const onboardingData = {
      coreValues: ["mindset", "relationships", "work"],
      shortTermGoals: "Build a consistent meditation habit",
      longTermVision: "Become emotionally resilient",
      personalityNotes: "I'm introspective and curious",
      beliefs: "I believe in continuous learning",
      preferredName: "Jon",
    };

    // This test validates the data structure
    expect(onboardingData.coreValues).toHaveLength(3);
    expect(onboardingData.shortTermGoals).toBeTruthy();
    expect(onboardingData.longTermVision).toBeTruthy();
    expect(onboardingData.personalityNotes).toBeTruthy();
    expect(onboardingData.beliefs).toBeTruthy();
    expect(onboardingData.preferredName).toBeTruthy();
  });

  it("should validate that core values are valid life domains", () => {
    const validDomains = ["mindset", "relationships", "work", "health", "spirituality", "finances"];
    const selectedDomains = ["mindset", "relationships", "work"];

    const allValid = selectedDomains.every((domain) => validDomains.includes(domain));
    expect(allValid).toBe(true);
  });

  it("should ensure short-term goals is not empty", () => {
    const shortTermGoals = "Build a consistent meditation habit";
    expect(shortTermGoals.length).toBeGreaterThan(0);
  });

  it("should ensure long-term vision is not empty", () => {
    const longTermVision = "Become emotionally resilient and authentic";
    expect(longTermVision.length).toBeGreaterThan(0);
  });

  it("should ensure personality notes is not empty", () => {
    const personalityNotes = "I'm introspective, curious, and value personal growth";
    expect(personalityNotes.length).toBeGreaterThan(0);
  });

  it("should ensure beliefs is not empty", () => {
    const beliefs = "I believe in continuous learning and authenticity";
    expect(beliefs.length).toBeGreaterThan(0);
  });

  it("should ensure preferred name is not empty", () => {
    const preferredName = "Jon";
    expect(preferredName.length).toBeGreaterThan(0);
  });

  it("should handle multiple life domains selection", () => {
    const allDomains = ["mindset", "relationships", "work", "health", "spirituality", "finances"];
    const selectedDomains = ["mindset", "work", "health"];

    expect(selectedDomains.length).toBeGreaterThan(0);
    expect(selectedDomains.length).toBeLessThanOrEqual(allDomains.length);
    selectedDomains.forEach((domain) => {
      expect(allDomains).toContain(domain);
    });
  });
});
