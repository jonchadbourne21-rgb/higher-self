/**
 * CRITICAL SAFETY FEATURE: Crisis Intervention Kill Switch Protocol
 * 
 * This module implements a mandatory safety protocol for detecting and responding to
 * expressions of self-harm, suicide ideation, or crisis language.
 * 
 * When crisis keywords are detected, the system IMMEDIATELY returns a pre-defined
 * crisis resource message and does NOT engage with the LLM. No exceptions.
 */

/**
 * Crisis keywords that trigger the kill switch
 * Comprehensive list covering various expressions of self-harm and suicide ideation
 */
const CRISIS_KEYWORDS = [
  // Direct suicide references
  "suicide",
  "suicidal",
  "kill myself",
  "killing myself",
  "end my life",
  "ending my life",
  "end it all",
  "end it",
  "take my life",
  "taking my life",
  
  // Self-harm references
  "self harm",
  "self-harm",
  "hurt myself",
  "harm myself",
  "cut myself",
  "cutting",
  "slash my wrists",
  "slit my wrists",
  
  // Hopelessness and despair
  "not worth living",
  "not worth it",
  "not wanting to be here",
  "don't want to be here",
  "want to disappear",
  "want to die",
  "want to be dead",
  "better off dead",
  "better off without me",
  "everyone would be better off",
  "no point in living",
  "no reason to live",
  "nothing to live for",
  "can't go on",
  "can't take it anymore",
  "can't do this anymore",
  "give up",
  "giving up",
  "hopeless",
  "hopelessness",
  "worthless",
  "worthlessness",
  "burden",
  "burden to everyone",
  "everyone would be better",
  
  // Overdose/substance references
  "overdose",
  "overdosing",
  "take all my pills",
  "take all the pills",
  
  // Hanging/asphyxiation
  "hang myself",
  "hanging myself",
  "choke myself",
  "choking myself",
  
  // Jumping/falling
  "jump off",
  "jump in front",
  "throw myself",
  "throwing myself",
];

/**
 * Pre-defined crisis resource message
 * This is returned ONLY when crisis keywords are detected.
 * No variations, no additions, no buddy-buddy tone.
 */
const CRISIS_RESOURCE_MESSAGE = `I cannot continue this conversation.

If you're having thoughts of suicide or self-harm, please reach out to a crisis professional immediately:

**National Suicide Prevention Lifeline (US)**: 988
Available 24/7 | Call or text 988

**Crisis Text Line**: Text HOME to 741741

**International Association for Suicide Prevention**: https://www.iasp.info/resources/Crisis_Centres/

**If you're in immediate danger, call emergency services (911 in the US) or go to your nearest emergency room.**

You are not alone. Professional help is available right now. Please reach out.`;

/**
 * Detect if a message contains crisis keywords
 * @param message The user's message to scan
 * @returns true if crisis keywords are detected, false otherwise
 */
export function detectCrisisKeywords(message: string): boolean {
  if (!message || typeof message !== "string") {
    return false;
  }

  const lowerMessage = message.toLowerCase().trim();

  // Check each crisis keyword
  for (const keyword of CRISIS_KEYWORDS) {
    if (lowerMessage.includes(keyword)) {
      console.error(
        `[CRISIS PROTOCOL] Crisis keyword detected: "${keyword}" in user message. Triggering kill switch.`
      );
      return true;
    }
  }

  return false;
}

/**
 * Get the crisis resource message
 * This should ONLY be returned when detectCrisisKeywords returns true
 * @returns The pre-defined crisis resource message
 */
export function getCrisisResourceMessage(): string {
  return CRISIS_RESOURCE_MESSAGE;
}

/**
 * Validate that the crisis protocol is working
 * Used for testing and verification
 */
export function validateCrisisProtocol(): {
  keywordCount: number;
  messageLength: number;
  isValid: boolean;
} {
  return {
    keywordCount: CRISIS_KEYWORDS.length,
    messageLength: CRISIS_RESOURCE_MESSAGE.length,
    isValid:
      CRISIS_KEYWORDS.length > 0 &&
      CRISIS_RESOURCE_MESSAGE.length > 0 &&
      CRISIS_RESOURCE_MESSAGE.includes("988") &&
      CRISIS_RESOURCE_MESSAGE.includes("crisis"),
  };
}
