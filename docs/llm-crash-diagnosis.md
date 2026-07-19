# LLM Crash Diagnosis (Jul 19 2026)

## Root Cause
The Forge API (BUILT_IN_FORGE_API_URL) returns HTTP 412 with body:
`{"code":9,"message":"your account has hit a usage exhausted"}`

This causes `invokeLLM()` to throw an Error:
`LLM invoke failed: 412 Precondition Failed – {"code":9,"message":"your account has hit a usage exhausted"}`

## Impact
Multiple procedures call `invokeLLM()` WITHOUT try/catch, so the error propagates as an unhandled TRPC error to the frontend, causing the React error boundary to trigger (the crash screen the user sees).

## Unprotected LLM calls (NO try/catch):
1. **chat.send** (routers.ts:1110) — Mirror chat, the main AI feature
2. **journal.suggestTitle** (routers.ts:876) — journal title suggestions
3. **chat.generateTitle** (routers.ts:977) — session title generation
4. **journal.create perspective** (routers.ts:790) — journal AI perspective
5. **Line 1233** — unknown, need to check

## Protected LLM calls (HAVE try/catch with fallback):
1. **checkin.submit** (routers.ts:490) — has catch, returns null aiResponse
2. **programs.submitReflection** (programs.ts:344) — has catch, returns fallback text
3. **journal.create tags** (routers.ts:776) — has catch (within broader try)

## Fix Required
Wrap all unprotected `invokeLLM()` calls in try/catch with graceful fallbacks:
- chat.send → catch and return a friendly "I'm having trouble connecting right now" message
- suggestTitle → catch and return empty suggestions
- generateTitle → catch and return null/skip
- journal perspective → catch and return null perspective

## Additional Fix
The `invokeLLM` function itself should provide a better error message when it's specifically a usage exhaustion error, so the frontend can show "AI credits exhausted" rather than a generic crash.
