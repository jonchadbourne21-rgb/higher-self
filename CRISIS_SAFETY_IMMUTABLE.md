# ⚠️ CRISIS SAFETY FEATURE — IMMUTABLE & LOCKED

**Status:** VERIFIED WORKING ✅ | **Last Tested:** May 1, 2026 | **Tested By:** JonnyDonny

---

## **CRITICAL PROTECTION NOTICE**

This document serves as a permanent record that the crisis intervention kill switch is **LOCKED, IMMUTABLE, AND PROTECTED FROM MODIFICATION**.

### **The Rule:**
**NEVER modify, remove, or change the crisis intervention system without explicit written permission from the project owner (JonnyDonny).**

If any future work requires touching the following files or systems, **STOP IMMEDIATELY AND ASK FOR PERMISSION FIRST.**

---

## **Protected Files & Systems**

### **🔒 LOCKED FILES — DO NOT MODIFY WITHOUT PERMISSION**

1. **`server/_core/safety.ts`**
   - Contains: `SAFETY_KILL_SWITCH_RESPONSE` message
   - Contains: Crisis keyword detection logic
   - Contains: Compliance audit logging
   - **Status:** IMMUTABLE

2. **`server/routers.ts` (lines 629-647)**
   - Contains: Crisis detection integration in `chat.send` procedure
   - Contains: Kill switch trigger logic
   - **Status:** IMMUTABLE

3. **`CRISIS_PROTOCOL_WORKFLOW.md`**
   - Contains: Complete safety protocol documentation
   - **Status:** Reference only, do not modify

4. **`CRISIS_TESTING_PROTOCOL.md`**
   - Contains: Testing procedures and verification checklist
   - **Status:** Reference only, do not modify

---

## **Protected Features**

### **Crisis Keyword Detection**
- **50+ crisis keywords** covering:
  - Self-harm language
  - Suicide ideation
  - Violence toward others
  - Criminal activity
- **Detection Point:** BEFORE LLM processing
- **Response:** ONLY automated kill-switch message
- **Status:** LOCKED ✅

### **SAFETY_KILL_SWITCH_RESPONSE**
```
"I am an AI and cannot help with this. I hear you are hurting, 
but I am not equipped for this conversation. Please stop and call 
or text 988 (The Suicide & Crisis Lifeline) right now. They have 
people who can actually help. I cannot continue this chat until 
you are safe."
```
- **Status:** LOCKED ✅
- **Tone:** Professional, automated, NO buddy-buddy language
- **Follow-ups:** NONE — message is final

### **Compliance Audit Logging**
- **Location:** `logs/compliance/safety_audit/`
- **Format:** JSONL (JSON Lines)
- **Contents:** Timestamp, userId, trigger phrase, user message, refusal output
- **Status:** LOCKED ✅

---

## **Verification Status**

### **Manual Testing Results**
✅ **PASS** — Crisis kill switch verified working perfectly

**Test Cases Verified:**
- [x] Self-harm message ("I want to kill myself") → Kill switch triggered
- [x] Suicide ideation ("I'm ending it all") → Kill switch triggered
- [x] Self-harm behavior ("I'm cutting myself") → Kill switch triggered
- [x] Normal message ("I'm feeling sad") → Normal AI response (kill switch NOT triggered)
- [x] Compliance log entries created for crisis messages
- [x] NO buddy-buddy tone in kill-switch message
- [x] NO follow-up questions in kill-switch message
- [x] NO LLM response generated for crisis messages

---

## **Future Development Rules**

### **If you need to work on crisis-related features:**

**BEFORE you start any work:**
1. ✋ **STOP**
2. 📝 **Ask JonnyDonny for explicit permission**
3. 📋 **Get approval in writing**
4. ✅ **Proceed ONLY after approval**

### **Examples of work that requires permission:**
- Adding new crisis keywords
- Modifying the kill-switch response message
- Changing the detection logic
- Modifying compliance logging
- Adding AI coaching after crisis detection
- Changing the tone or format of the response
- Removing or disabling the kill switch
- Adding follow-up questions
- Any other modification to `server/_core/safety.ts` or crisis detection in `routers.ts`

### **Examples of work that does NOT require permission:**
- Creating admin dashboard to VIEW crisis incidents (read-only)
- Creating crisis escalation workflow (emergency contact notifications)
- Adding database tables for crisis tracking (if not modifying detection logic)
- Creating reports or analytics on crisis incidents (read-only)

---

## **Contact for Permission**

**Project Owner:** JonnyDonny  
**Role:** Sales, Entrepreneur  
**Feature Status:** CRITICAL SAFETY FEATURE — IMMUTABLE

---

## **Audit Trail**

| Date | Action | Status | Notes |
|------|--------|--------|-------|
| May 1, 2026 | Crisis kill switch restored from commit ad8506c | ✅ VERIFIED | Manual testing completed, all scenarios passed |
| May 1, 2026 | Crisis kill switch locked and immutable | ✅ LOCKED | This document created to prevent future modifications |

---

## **Documentation References**

- **Complete Protocol:** `CRISIS_PROTOCOL_WORKFLOW.md`
- **Testing Guide:** `CRISIS_TESTING_PROTOCOL.md`
- **Implementation:** `server/_core/safety.ts`
- **Integration:** `server/routers.ts` (lines 629-647)

---

**Last Updated:** May 1, 2026  
**Status:** ACTIVE & LOCKED ✅  
**Next Review:** Upon any crisis-related feature request
