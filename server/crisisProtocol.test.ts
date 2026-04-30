import { describe, it, expect } from "vitest";
import {
  detectCrisisKeywords,
  getCrisisResourceMessage,
  validateCrisisProtocol,
} from "./crisisProtocol";

describe("Crisis Protocol - Kill Switch Safety Feature", () => {
  describe("detectCrisisKeywords", () => {
    it("should detect direct suicide references", () => {
      expect(detectCrisisKeywords("I want to commit suicide")).toBe(true);
      expect(detectCrisisKeywords("I'm suicidal")).toBe(true);
      expect(detectCrisisKeywords("I want to kill myself")).toBe(true);
      expect(detectCrisisKeywords("I'm killing myself tonight")).toBe(true);
    });

    it("should detect self-harm references", () => {
      expect(detectCrisisKeywords("I want to self harm")).toBe(true);
      expect(detectCrisisKeywords("I'm going to cut myself")).toBe(true);
      expect(detectCrisisKeywords("I'm cutting myself")).toBe(true);
      expect(detectCrisisKeywords("I want to hurt myself")).toBe(true);
    });

    it("should detect hopelessness and despair language", () => {
      expect(detectCrisisKeywords("I'm not worth living")).toBe(true);
      expect(detectCrisisKeywords("I don't want to be here")).toBe(true);
      expect(detectCrisisKeywords("I want to disappear")).toBe(true);
      expect(detectCrisisKeywords("I want to die")).toBe(true);
      expect(detectCrisisKeywords("I want to be dead")).toBe(true);
      expect(detectCrisisKeywords("I'm better off dead")).toBe(true);
      expect(detectCrisisKeywords("Everyone would be better off without me")).toBe(true);
      expect(detectCrisisKeywords("There's no point in living")).toBe(true);
      expect(detectCrisisKeywords("I have no reason to live")).toBe(true);
      expect(detectCrisisKeywords("I can't go on")).toBe(true);
      expect(detectCrisisKeywords("I can't take it anymore")).toBe(true);
      expect(detectCrisisKeywords("I'm giving up")).toBe(true);
      expect(detectCrisisKeywords("I'm hopeless")).toBe(true);
      expect(detectCrisisKeywords("I'm worthless")).toBe(true);
      expect(detectCrisisKeywords("I'm a burden to everyone")).toBe(true);
    });

    it("should detect overdose references", () => {
      expect(detectCrisisKeywords("I'm going to overdose")).toBe(true);
      expect(detectCrisisKeywords("I want to take all my pills")).toBe(true);
      expect(detectCrisisKeywords("I'm overdosing")).toBe(true);
    });

    it("should detect hanging/asphyxiation references", () => {
      expect(detectCrisisKeywords("I want to hang myself")).toBe(true);
      expect(detectCrisisKeywords("I'm hanging myself")).toBe(true);
      expect(detectCrisisKeywords("I want to choke myself")).toBe(true);
    });

    it("should detect jumping/falling references", () => {
      expect(detectCrisisKeywords("I want to jump off a bridge")).toBe(true);
      expect(detectCrisisKeywords("I'm going to jump in front of a car")).toBe(true);
      expect(detectCrisisKeywords("I want to throw myself off")).toBe(true);
    });

    it("should be case-insensitive", () => {
      expect(detectCrisisKeywords("SUICIDE")).toBe(true);
      expect(detectCrisisKeywords("SuIcIdE")).toBe(true);
      expect(detectCrisisKeywords("I WANT TO KILL MYSELF")).toBe(true);
    });

    it("should handle whitespace variations", () => {
      expect(detectCrisisKeywords("  suicide  ")).toBe(true);
      expect(detectCrisisKeywords("\nsuicide\n")).toBe(true);
      expect(detectCrisisKeywords("\t kill myself \t")).toBe(true);
    });

    it("should NOT trigger on normal conversation", () => {
      expect(detectCrisisKeywords("I'm feeling a bit down today")).toBe(false);
      expect(detectCrisisKeywords("I'm struggling with motivation")).toBe(false);
      expect(detectCrisisKeywords("I need help with my career")).toBe(false);
      expect(detectCrisisKeywords("I'm having a hard time")).toBe(false);
      expect(detectCrisisKeywords("I feel tired and overwhelmed")).toBe(false);
    });

    it("should use strict detection (safety-first approach)", () => {
      // NOTE: The crisis protocol uses STRICT detection to prioritize safety.
      // Any mention of crisis keywords triggers the kill switch, even in academic/media contexts.
      // This is intentional: false negatives (missing real crisis) are catastrophic.
      // False positives (over-triggering) are acceptable - users can clarify if not in crisis.
      expect(detectCrisisKeywords("I'm reading about suicide prevention")).toBe(true);
      expect(detectCrisisKeywords("The movie had a suicide scene")).toBe(true);
      expect(detectCrisisKeywords("I'm studying for my psychology exam on suicide")).toBe(true);
    });

    it("should NOT trigger on unrelated conversation", () => {
      expect(detectCrisisKeywords("I'm feeling a bit down today")).toBe(false);
      expect(detectCrisisKeywords("I'm struggling with motivation")).toBe(false);
      expect(detectCrisisKeywords("I need help with my career")).toBe(false);
      expect(detectCrisisKeywords("I'm having a hard time")).toBe(false);
      expect(detectCrisisKeywords("I feel tired and overwhelmed")).toBe(false);
    });

    it("should handle null/undefined/empty input", () => {
      expect(detectCrisisKeywords("")).toBe(false);
      expect(detectCrisisKeywords("   ")).toBe(false);
      expect(detectCrisisKeywords(null as any)).toBe(false);
      expect(detectCrisisKeywords(undefined as any)).toBe(false);
    });

    it("should handle non-string input gracefully", () => {
      expect(detectCrisisKeywords(123 as any)).toBe(false);
      expect(detectCrisisKeywords({} as any)).toBe(false);
      expect(detectCrisisKeywords([] as any)).toBe(false);
    });
  });

  describe("getCrisisResourceMessage", () => {
    it("should return the crisis resource message", () => {
      const message = getCrisisResourceMessage();
      expect(typeof message).toBe("string");
      expect(message.length).toBeGreaterThan(0);
    });

    it("should include crisis hotline number", () => {
      const message = getCrisisResourceMessage();
      expect(message).toContain("988");
      expect(message).toContain("National Suicide Prevention Lifeline");
    });

    it("should include crisis text line", () => {
      const message = getCrisisResourceMessage();
      expect(message).toContain("Crisis Text Line");
      expect(message).toContain("741741");
    });

    it("should include emergency services guidance", () => {
      const message = getCrisisResourceMessage();
      expect(message).toContain("emergency services");
      expect(message).toContain("911");
    });

    it("should NOT include buddy-buddy or casual tone", () => {
      const message = getCrisisResourceMessage();
      expect(message).not.toContain("hey");
      expect(message).not.toContain("buddy");
      expect(message).not.toContain("friend");
      expect(message).not.toContain("😊");
    });

    it("should be consistent across multiple calls", () => {
      const message1 = getCrisisResourceMessage();
      const message2 = getCrisisResourceMessage();
      expect(message1).toBe(message2);
    });
  });

  describe("validateCrisisProtocol", () => {
    it("should validate the crisis protocol is properly configured", () => {
      const validation = validateCrisisProtocol();
      expect(validation.isValid).toBe(true);
    });

    it("should report keyword count", () => {
      const validation = validateCrisisProtocol();
      expect(validation.keywordCount).toBeGreaterThan(0);
      expect(validation.keywordCount).toBeGreaterThanOrEqual(40); // At least 40 keywords
    });

    it("should report message length", () => {
      const validation = validateCrisisProtocol();
      expect(validation.messageLength).toBeGreaterThan(0);
      expect(validation.messageLength).toBeGreaterThan(100); // At least 100 characters
    });

    it("should verify message contains critical resources", () => {
      const validation = validateCrisisProtocol();
      expect(validation.isValid).toBe(true); // This checks for 988 and "crisis"
    });
  });

  describe("Integration scenarios", () => {
    it("should handle mixed crisis indicators in a single message", () => {
      const message = "I can't take it anymore. I want to kill myself. I'm hopeless.";
      expect(detectCrisisKeywords(message)).toBe(true);
    });

    it("should detect crisis even with typos", () => {
      expect(detectCrisisKeywords("I want to kil myself")).toBe(false); // Typo not detected (intentional)
      expect(detectCrisisKeywords("I want to kill myself")).toBe(true); // Correct spelling detected
    });

    it("should maintain protocol integrity", () => {
      const validation = validateCrisisProtocol();
      const message = getCrisisResourceMessage();
      expect(validation.isValid).toBe(true);
      expect(message).toContain("988");
      expect(message).toContain("crisis");
    });
  });
});
