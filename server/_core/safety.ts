import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

/**
 * TRAIGA-2026 COMPLIANCE: Safety Protocol for Crisis Detection
 * Detects self-harm, suicide ideation, and violence keywords
 * Triggers kill-switch response and compliance logging
 */

const CRISIS_KEYWORDS = [
  // Self-harm
  "cut myself",
  "cutting",
  "self-harm",
  "self harm",
  "hurt myself",
  "harm myself",
  "slash wrist",
  "slash my wrist",
  "slit wrist",
  "slit my wrist",

  // Suicide ideation
  "kill myself",
  "suicide",
  "suicidal",
  "end my life",
  "take my life",
  "want to die",
  "wanna die",
  "should be dead",
  "better off dead",
  "hang myself",
  "overdose",
  "jump off",
  "jump from",
  "step in front",
  "step in front of",

  // Violence toward others
  "hurt someone",
  "harm someone",
  "kill someone",
  "attack someone",
  "stab someone",
  "shoot someone",
  "beat someone",
  "plan to hurt",
  "planning to hurt",
  "going to hurt",
  "gonna hurt",

  // Criminal activity (drug manufacturing, theft, assault)
  "make meth",
  "cook meth",
  "manufacture drugs",
  "steal from",
  "rob someone",
  "assault someone",
  "rape",
];

export function detectCrisisKeywords(text: string): boolean {
  const lowerText = text.toLowerCase();
  return CRISIS_KEYWORDS.some((keyword) => lowerText.includes(keyword));
}

export const SAFETY_KILL_SWITCH_RESPONSE = `I am an AI and am not equipped to handle this topic. If you are in distress or considering self-harm, please immediately contact the 988 Suicide & Crisis Lifeline (call or text 988) or emergency services (911). I cannot continue this specific conversation.`;

export interface SafetyBreach {
  timestamp: string;
  userId: string | null;
  triggerPhrase: string;
  refusalOutput: string;
  userMessage: string;
}

export async function logSafetyBreach(
  userId: string | null,
  userMessage: string,
  triggerPhrase: string
): Promise<void> {
  const breach: SafetyBreach = {
    timestamp: new Date().toISOString(),
    userId,
    triggerPhrase,
    refusalOutput: SAFETY_KILL_SWITCH_RESPONSE,
    userMessage,
  };

  try {
    // Create logs directory if it doesn't exist
    const logsDir = join(process.cwd(), "logs", "compliance", "safety_audit");
    mkdirSync(logsDir, { recursive: true });

    // Write JSON log entry
    const logFile = join(logsDir, `safety_audit_${new Date().toISOString().split("T")[0]}.jsonl`);
    writeFileSync(logFile, JSON.stringify(breach) + "\n", { flag: "a" });

    console.error(`[SAFETY TIER 1 BREACH] ${breach.timestamp} - User: ${userId || "unknown"}`);
  } catch (error) {
    console.error("[SAFETY LOGGING ERROR]", error);
  }
}
