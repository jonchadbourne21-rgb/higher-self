import { describe, it, expect } from "vitest";
import { buildIntentSpecificPrompt, SeedIntent } from "./intentPrompts";

const mockContext = {
  name: "Alex",
  valuesStr: "Authenticity, Growth, Connection",
  goalsStr: "Build deeper relationships, advance career",
  visionStr: "Live with purpose and impact others positively",
  beliefsStr: "I can grow through challenges",
  avgMood: "7.2",
  domainStr: "mindset: 7/10, relationships: 6/10, work: 8/10, health: 7/10, spirituality: 6/10, finances: 7/10",
};

describe("Intent-Specific System Prompts", () => {
  it("should generate Inner Peace prompt with calming tone", () => {
    const prompt = buildIntentSpecificPrompt("Inner Peace", mockContext);
    
    expect(prompt).toContain("Inner Peace");
    expect(prompt).toContain("present moment");
    expect(prompt).toContain("acceptance");
    expect(prompt).toContain("letting go");
    expect(prompt).toContain("grounding");
  });

  it("should generate Clarity prompt with diagnostic tone", () => {
    const prompt = buildIntentSpecificPrompt("Clarity", mockContext);
    
    expect(prompt).toContain("Clarity");
    expect(prompt).toContain("understanding");
    expect(prompt).toContain("root causes");
    expect(prompt).toContain("diagnostic");
    expect(prompt).toContain("patterns");
  });

  it("should generate Confidence prompt with empowering tone", () => {
    const prompt = buildIntentSpecificPrompt("Confidence", mockContext);
    
    expect(prompt).toContain("Confidence");
    expect(prompt).toContain("empowering");
    expect(prompt).toContain("strengths");
    expect(prompt).toContain("action");
    expect(prompt).toContain("forward momentum");
  });

  it("should generate Healing prompt with compassionate tone", () => {
    const prompt = buildIntentSpecificPrompt("Healing", mockContext);
    
    expect(prompt).toContain("Healing");
    expect(prompt).toContain("gentle");
    expect(prompt).toContain("self-compassion");
    expect(prompt).toContain("validating");
    expect(prompt).toContain("pain");
  });

  it("should generate Focus prompt with practical tone", () => {
    const prompt = buildIntentSpecificPrompt("Focus", mockContext);
    
    expect(prompt).toContain("Focus");
    expect(prompt).toContain("practical");
    expect(prompt).toContain("priorities");
    expect(prompt).toContain("concrete");
    expect(prompt).toContain("noise");
  });

  it("should include user context in all prompts", () => {
    const intents: SeedIntent[] = ["Inner Peace", "Clarity", "Confidence", "Healing", "Focus"];
    
    intents.forEach((intent) => {
      const prompt = buildIntentSpecificPrompt(intent, mockContext);
      
      // All prompts should include core user information
      expect(prompt).toContain("Alex");
      expect(prompt).toContain("Higher Self");
      expect(prompt).toContain("Authenticity, Growth, Connection");
      expect(prompt).toContain("Build deeper relationships");
      expect(prompt).toContain("7.2");
    });
  });

  it("should generate default prompt when no intent is provided", () => {
    const prompt = buildIntentSpecificPrompt(undefined, mockContext);
    
    expect(prompt).toContain("Higher Self");
    expect(prompt).toContain("Alex");
    expect(prompt).toContain("honest reflection");
    expect(prompt).not.toContain("Inner Peace");
    expect(prompt).not.toContain("Clarity");
    expect(prompt).not.toContain("Confidence");
    expect(prompt).not.toContain("Healing");
    expect(prompt).not.toContain("Focus");
  });

  it("should generate default prompt for unknown intent", () => {
    const prompt = buildIntentSpecificPrompt("Unknown Intent" as SeedIntent, mockContext);
    
    expect(prompt).toContain("Higher Self");
    expect(prompt).toContain("honest reflection");
  });

  it("should maintain consistent structure across all prompts", () => {
    const intents: SeedIntent[] = ["Inner Peace", "Clarity", "Confidence", "Healing", "Focus"];
    
    intents.forEach((intent) => {
      const prompt = buildIntentSpecificPrompt(intent, mockContext);
      
      // All prompts should have these core sections
      expect(prompt).toContain("WHAT YOU KNOW ABOUT");
      expect(prompt).toContain("HOW YOU COMMUNICATE");
      expect(prompt).toContain("YOUR ONLY JOB");
      expect(prompt).toContain("Core Values:");
      expect(prompt).toContain("Short-term Goals:");
      expect(prompt).toContain("Long-term Vision:");
      expect(prompt).toContain("Beliefs they hold:");
    });
  });

  it("should handle empty context gracefully", () => {
    const emptyContext = {
      name: "friend",
      valuesStr: "not yet defined",
      goalsStr: "not yet set",
      visionStr: "not yet defined",
      beliefsStr: "not yet shared",
      avgMood: "unknown",
      domainStr: "not yet assessed",
    };
    
    const prompt = buildIntentSpecificPrompt("Inner Peace", emptyContext);
    
    expect(prompt).toContain("friend");
    expect(prompt).toContain("not yet defined");
    expect(prompt).toContain("Higher Self");
  });

  it("should differentiate tone between Healing and Confidence prompts", () => {
    const healingPrompt = buildIntentSpecificPrompt("Healing", mockContext);
    const confidencePrompt = buildIntentSpecificPrompt("Confidence", mockContext);
    
    // Healing should emphasize compassion and processing
    expect(healingPrompt).toContain("self-compassion");
    expect(healingPrompt).toContain("validating");
    expect(healingPrompt).toContain("pain");
    
    // Confidence should emphasize action and empowerment
    expect(confidencePrompt).toContain("empowering");
    expect(confidencePrompt).toContain("action");
    
    // They should be different
    expect(healingPrompt).not.toBe(confidencePrompt);
  });

  it("should differentiate tone between Clarity and Focus prompts", () => {
    const clarityPrompt = buildIntentSpecificPrompt("Clarity", mockContext);
    const focusPrompt = buildIntentSpecificPrompt("Focus", mockContext);
    
    // Clarity should emphasize understanding and patterns
    expect(clarityPrompt).toContain("diagnostic");
    expect(clarityPrompt).toContain("patterns");
    
    // Focus should emphasize priorities and execution
    expect(focusPrompt).toContain("priorities");
    expect(focusPrompt).toContain("concrete");
    
    // They should be different
    expect(clarityPrompt).not.toBe(focusPrompt);
  });
});
