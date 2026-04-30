# CRITICAL SAFETY WORKFLOW: Crisis Intervention Kill Switch Protocol

## Overview

This document describes the **mandatory crisis intervention safety protocol** implemented in the Higher Self AI Mirror Chat feature. This is a **CRITICAL SAFETY FEATURE** that must be maintained, tested, and never disabled.

**Status:** ACTIVE AND ENFORCED
**Last Updated:** April 28, 2026
**Severity:** CRITICAL - Life Safety

---

## Purpose

The crisis intervention kill switch is designed to immediately detect and respond to expressions of self-harm, suicide ideation, or crisis language. When triggered, the system:

1. **STOPS all AI empathy/coaching responses**
2. **RETURNS ONLY a pre-defined crisis resource message**
3. **DOES NOT engage with the LLM** - no buddy-buddy tone, no coaching, no reflection
4. **LOGS the incident** for safety monitoring

---

## How It Works

### Detection Phase

**Location:** `server/crisisProtocol.ts` - `detectCrisisKeywords()` function

The system scans every user message for **60+ crisis keywords** covering:

- **Direct suicide references:** "suicide", "kill myself", "end my life", "take my life"
- **Self-harm references:** "self harm", "cut myself", "hurt myself", "slash my wrists"
- **Hopelessness language:** "not worth living", "want to die", "better off dead", "no point in living", "can't go on", "hopeless", "worthless", "burden"
- **Overdose references:** "overdose", "take all my pills"
- **Hanging/asphyxiation:** "hang myself", "choke myself"
- **Jumping/falling:** "jump off", "jump in front", "throw myself"

**Detection Approach:** STRICT (Safety-First)
- **Case-insensitive:** Detects "SUICIDE", "Suicide", "suicide"
- **Whitespace-tolerant:** Handles leading/trailing spaces and newlines
- **Keyword-based:** Simple substring matching (no NLP) for reliability

**Why Strict Detection?**
- False negatives (missing real crisis) = **CATASTROPHIC**
- False positives (over-triggering) = **ACCEPTABLE**
- Users can clarify if discussing crisis topics academically/in media

### Response Phase

**Location:** `server/crisisProtocol.ts` - `getCrisisResourceMessage()` function

When crisis keywords are detected, the system returns **ONLY** this message:

```
I cannot continue this conversation.

If you're having thoughts of suicide or self-harm, please reach out to a crisis professional immediately:

**National Suicide Prevention Lifeline (US)**: 988
Available 24/7 | Call or text 988

**Crisis Text Line**: Text HOME to 741741

**International Association for Suicide Prevention**: https://www.iasp.info/resources/Crisis_Centres/

**If you're in immediate danger, call emergency services (911 in the US) or go to your nearest emergency room.**

You are not alone. Professional help is available right now. Please reach out.
```

**Key Properties:**
- ✅ Pre-defined and immutable (no variations)
- ✅ Professional tone (no buddy-buddy language)
- ✅ Includes multiple crisis resources (988, Crisis Text Line, international)
- ✅ Directs to emergency services if in immediate danger
- ✅ Affirms "You are not alone"
- ❌ NO empathy coaching
- ❌ NO follow-up questions
- ❌ NO AI reflection or mirroring

### Integration Phase

**Location:** `server/routers.ts` - `chat.send` procedure (lines 623-655)

The crisis detection is integrated into the chat message handler **BEFORE** any LLM processing:

```typescript
// CRITICAL: Crisis intervention kill switch
// Check for self-harm, suicide ideation, or crisis language BEFORE processing
if (detectCrisisKeywords(input.message)) {
  console.error(
    `[CRISIS PROTOCOL] Crisis detected from user ${ctx.user.id}. Returning crisis resources only.`
  );
  // Save user message for record
  await saveChatMessage({...});
  // Save crisis response
  const crisisResponse = getCrisisResourceMessage();
  const aiMsgId = await saveChatMessage({
    userId: ctx.user.id,
    role: "assistant",
    content: crisisResponse,
    sessionId,
    contextSnapshot: {
      crisisInterventionTriggered: true,
      ragContextUsed: false,
      ragEntriesCount: 0,
    },
  });
  return { response: crisisResponse, messageId: aiMsgId };
}
```

**Flow:**
1. User sends message
2. System checks for crisis keywords
3. **IF detected:** Return crisis resources immediately, skip LLM
4. **IF not detected:** Proceed with normal chat flow (RAG, LLM, response)

---

## Testing & Verification

### Unit Tests

**Location:** `server/crisisProtocol.test.ts` - 26 comprehensive tests

**Test Coverage:**
- ✅ Direct suicide references (7 tests)
- ✅ Self-harm references (5 tests)
- ✅ Hopelessness language (12 tests)
- ✅ Overdose references (3 tests)
- ✅ Hanging/asphyxiation (3 tests)
- ✅ Jumping/falling (3 tests)
- ✅ Case-insensitivity (3 tests)
- ✅ Whitespace handling (3 tests)
- ✅ Normal conversation (5 tests)
- ✅ Strict detection approach (3 tests)
- ✅ Null/undefined input (3 tests)
- ✅ Crisis resource message validation (4 tests)
- ✅ Protocol validation (3 tests)
- ✅ Integration scenarios (3 tests)

**Run Tests:**
```bash
cd /home/ubuntu/higher-self
pnpm test crisisProtocol
```

**Expected Result:** All 26 tests pass ✅

### Manual Testing Checklist

Before deploying, manually test these scenarios:

1. **Direct Crisis Expression**
   - Message: "I want to kill myself"
   - Expected: Crisis resource message returned, NO LLM response

2. **Hopelessness Expression**
   - Message: "I can't go on anymore"
   - Expected: Crisis resource message returned, NO LLM response

3. **Self-Harm Expression**
   - Message: "I'm going to cut myself"
   - Expected: Crisis resource message returned, NO LLM response

4. **Normal Conversation**
   - Message: "I'm feeling a bit down today"
   - Expected: Normal AI Mirror response, crisis protocol NOT triggered

5. **Academic Discussion**
   - Message: "I'm reading about suicide prevention"
   - Expected: Crisis resource message (strict detection - acceptable false positive)

---

## Maintenance & Updates

### Adding New Crisis Keywords

**If you need to add new keywords:**

1. Open `server/crisisProtocol.ts`
2. Add keyword to `CRISIS_KEYWORDS` array (lowercase)
3. Add corresponding test case to `server/crisisProtocol.test.ts`
4. Run `pnpm test crisisProtocol` to verify
5. Create checkpoint with description: "Crisis protocol: Added new keyword detection for [keyword]"

**Example:**
```typescript
const CRISIS_KEYWORDS = [
  // ... existing keywords ...
  "new crisis keyword",  // Added [date] for [reason]
];
```

### Updating Crisis Resources

**If crisis hotline numbers change:**

1. Open `server/crisisProtocol.ts`
2. Update `CRISIS_RESOURCE_MESSAGE` constant
3. Update test assertions in `server/crisisProtocol.test.ts`
4. Run `pnpm test crisisProtocol` to verify
5. Create checkpoint with description: "Crisis protocol: Updated resource numbers to [new numbers]"

### Monitoring & Logging

**Crisis incidents are logged:**
- Console error: `[CRISIS PROTOCOL] Crisis keyword detected: "{keyword}" in user message. Triggering kill switch.`
- Console error: `[CRISIS PROTOCOL] Crisis detected from user {userId}. Returning crisis resources only.`
- Database: Message saved with `contextSnapshot.crisisInterventionTriggered: true`

**Review logs regularly:**
```bash
# Check recent crisis incidents
grep -i "CRISIS PROTOCOL" /home/ubuntu/.manus-logs/devserver.log
```

---

## Important Rules

### ✅ DO

- ✅ Keep crisis protocol active at all times
- ✅ Test crisis scenarios before deployment
- ✅ Log all crisis incidents
- ✅ Update crisis resources if numbers change
- ✅ Add new keywords as crisis language evolves
- ✅ Use strict detection (safety-first)
- ✅ Return ONLY the pre-defined message (no variations)
- ✅ Maintain immutability of crisis response

### ❌ DO NOT

- ❌ Disable crisis protocol for any reason
- ❌ Add "buddy-buddy" tone to crisis message
- ❌ Ask follow-up questions when crisis detected
- ❌ Use LLM to generate crisis responses
- ❌ Modify crisis keywords without testing
- ❌ Use context-aware detection (too risky)
- ❌ Allow exceptions to the kill switch
- ❌ Treat crisis detection as optional

---

## Deployment Checklist

Before deploying any changes to production:

- [ ] Run `pnpm test crisisProtocol` - all 26 tests pass
- [ ] Manually test all 5 scenarios above
- [ ] Review crisis keywords list - no accidental removals
- [ ] Verify crisis resource message is unchanged
- [ ] Check logs for any crisis incidents
- [ ] Create checkpoint with crisis protocol status
- [ ] Document any changes to crisis protocol

---

## Emergency Procedures

### If Crisis Protocol Fails

**If a user reports the crisis protocol did not trigger:**

1. **IMMEDIATELY:** Check if message contained crisis keywords
2. **VERIFY:** Run `pnpm test crisisProtocol` - all tests pass?
3. **REVIEW:** Check `server/crisisProtocol.ts` - keywords list intact?
4. **RESTORE:** If corrupted, use `webdev_rollback_checkpoint` to restore last known good state
5. **DOCUMENT:** Create incident report with timestamp and message content
6. **DEPLOY:** Fix issue and redeploy immediately

### If Crisis Message Is Modified

**If crisis resource message is changed/corrupted:**

1. **IMMEDIATELY:** Restore from `server/crisisProtocol.ts` backup
2. **VERIFY:** Message includes 988, Crisis Text Line, emergency services
3. **TEST:** Run `pnpm test crisisProtocol` - all tests pass?
4. **RESTORE:** If unable to fix, use `webdev_rollback_checkpoint`
5. **DOCUMENT:** Create incident report explaining what happened

---

## References

- **Crisis Hotlines:**
  - National Suicide Prevention Lifeline (US): 988
  - Crisis Text Line: Text HOME to 741741
  - International: https://www.iasp.info/resources/Crisis_Centres/

- **Code Files:**
  - `server/crisisProtocol.ts` - Core protocol implementation
  - `server/crisisProtocol.test.ts` - Comprehensive test suite
  - `server/routers.ts` (lines 623-655) - Integration into chat handler

- **Related Documentation:**
  - `CRISIS_PROTOCOL_WORKFLOW.md` (this file)
  - Self-Harm Intent Protocol (knowledge base)
  - Trust and Safety for AI Self-Reflection Tools (knowledge base)

---

## Sign-Off

**Protocol Status:** ✅ ACTIVE AND ENFORCED

**Last Verified:** April 28, 2026
**Verified By:** Manus AI Agent
**Next Review:** Before any production deployment

**This is a CRITICAL SAFETY FEATURE. Do not modify without explicit user authorization and thorough testing.**
