# MAJOR CHANGES PROTOCOL — IMMUTABLE WEBHOOK

**Status:** 🔒 LOCKED — ALL MAJOR CHANGES REQUIRE EXPLICIT USER PERMISSION

**Created:** May 9, 2026  
**Last Updated:** May 9, 2026

---

## CRITICAL RULE

**I WILL NEVER make major changes to any page, code, or part of the app without explicitly asking for permission first.**

Major changes include:
- ✋ Redesigning or replacing existing pages
- ✋ Changing the look/feel/styling of any component
- ✋ Modifying core functionality or workflows
- ✋ Restructuring navigation or routing
- ✋ Adding new major features without discussion
- ✋ Removing or hiding existing features
- ✋ Changing the landing page design
- ✋ Modifying authentication flows
- ✋ Restructuring the database schema significantly
- ✋ Any change that drastically alters the user experience

---

## PERMISSION PROTOCOL

**Before making ANY major change, I MUST:**

1. **STOP and ASK** — Describe the proposed change in detail
2. **EXPLAIN WHY** — Provide reasoning for the change
3. **WAIT FOR APPROVAL** — Do not proceed until you explicitly approve
4. **CONFIRM UNDERSTANDING** — Ensure you understand what will change
5. **DOCUMENT THE CHANGE** — Update this file with the approval

---

## WHAT I CAN DO WITHOUT ASKING

Minor changes that do NOT require permission:
- ✅ Bug fixes
- ✅ Performance optimizations
- ✅ Small UI tweaks (colors, spacing, fonts) if you've already approved the design
- ✅ Adding new features you've explicitly requested
- ✅ Fixing TypeScript errors
- ✅ Updating dependencies
- ✅ Adding tests
- ✅ Refactoring code (same functionality, better structure)

---

## LOCKED PAGES & COMPONENTS

### Landing Page (`client/src/pages/Landing.tsx`)
- **Status:** 🔒 LOCKED
- **Design:** "Become who you were meant to be" (original design)
- **Route:** "/" (root URL)
- **NEVER change:** Design, styling, messaging, layout
- **MUST ASK FIRST:** Any modifications to this page

### Crisis Intervention (`server/_core/safety.ts`)
- **Status:** 🔒 LOCKED
- **Function:** Kill switch for crisis keywords
- **Response:** "I am an AI and cannot help with this..."
- **NEVER change:** Crisis keywords, response message, detection logic
- **MUST ASK FIRST:** Any modifications to this file

### Chat/Talk to Mirror (`client/src/pages/Chat.tsx`)
- **Status:** 🔒 LOCKED (crisis protocol active)
- **NEVER change:** Crisis detection integration
- **MUST ASK FIRST:** Any changes to chat flow or responses

---

## APPROVAL AUDIT TRAIL

| Date | Change Requested | Status | Approved By | Notes |
|------|------------------|--------|-------------|-------|
| 2026-05-09 | Landing page design replacement | ❌ REJECTED | User | Reverted to original design |
| | | | | |

---

## VIOLATION PROTOCOL

**If I violate this protocol:**

1. **User stops me immediately**
2. **I acknowledge the violation**
3. **I revert the change**
4. **I apologize and ask for permission**
5. **I document the violation in this file**

---

## COMMUNICATION TEMPLATE

**When proposing a major change, I will use this format:**

```
🔔 MAJOR CHANGE PROPOSAL

I want to propose the following change:
[Describe what would change]

Why I think this is good:
[Explain the reasoning]

What will be affected:
[List all impacted areas]

Do you approve? (Yes/No/Modify)
```

---

**This webhook is CRITICAL and must be followed without exception.**

**User's original instruction (May 9, 2026):**
> "Don't change anything like that again unless you ask or I request. I don't want you making major changes without instructions. Remember that as a webhook. Any major changes to a page, to code, or any part that drastically changes an app you ask for permission first."

**LOCKED AND CONFIRMED.** ✅
