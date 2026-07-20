# VOW Operating Discipline for Mirrored Development

## Core VOW Principles (Internalized from OfficialVOW.zip)

### 1. Scar Memory — Failures Are Recorded, Never Hidden
- Every failure (proof failure, broken feature, regression) MUST be recorded as a **scar**
- Scars carry context: what broke, why, what strategy was used, what the inputs were
- Before attempting any fix, **recall scars** — check if this exact path has hurt before
- If a path has an exact scar match → SKIP it (don't repeat the same mistake)
- If a path has a similar scar → proceed with CAUTION (score × 0.9)

### 2. Tournament Strategy — Competing Approaches Scored by Metrics
- When multiple fix approaches exist, evaluate them as a tournament
- Score by: proof_success * weight + safety * weight + speed * weight
- Never pick the first idea — evaluate alternatives
- The winner's bindings propagate; losers are discarded

### 3. Prove Before Ship — Assertions That Gate Deployment
- Every change MUST have a `prove` equivalent (test, manual verification)
- If prove fails → record scar, do NOT ship
- Proofs are not optional — they are the gate

### 4. Constraint-Driven Execution
- Constraints limit what strategies can do (attempt budgets, risk thresholds)
- If a constraint is violated, STOP — don't push through

### 5. Dry-Run / Side-Effect Shadowing
- Before making real changes, shadow them (predict the outcome)
- Only go live when the shadow matches expectations

---

## SCARS — Mirrored Voice Feature

### SCAR 001: AnimatePresence mode="popLayout" removal broke voice (Jul 19, 2026)
- **What happened**: Removed AnimatePresence wrapper and layout prop from voice transcript
- **Result**: Voice feature completely broke — mic connects then immediately disconnects
- **Root cause hypothesis**: The removal was NOT the cause. The voice feature was ALREADY broken before the change. The CSS-only change (appending keyframes to index.css) also "broke" it — which is impossible for CSS to cause a WebSocket disconnect. The bug is pre-existing.
- **Lesson**: Do NOT assume correlation = causation. The voice disconnect is a separate bug.

### SCAR 002: CSS-only append to index.css "broke" voice (Jul 19, 2026)
- **What happened**: Appended @keyframes animation to end of index.css
- **Result**: User reported voice still broken
- **Root cause**: CSS cannot cause WebSocket disconnects. The voice bug predates both changes.
- **Lesson**: The voice disconnect bug exists independently. Rolling back cosmetic changes won't fix it.

### SCAR 003: Multiple rollbacks without diagnosing root cause (Jul 19, 2026)
- **What happened**: Rolled back 3 times without investigating the actual voice connection flow
- **Result**: Wasted user trust and time
- **Lesson**: NEVER make changes to a broken feature without first reading the connection flow end-to-end. Diagnose BEFORE touching code.

---

## Voice Architecture Investigation (Read-Only)

### Architecture Discovery:
1. **Server has TWO voice paths**:
   - `server/v2vRelay.ts` — WebSocket relay at `/ws` that proxies browser↔Hume with short-lived OAuth tokens
   - `server/routers/voice.ts` — tRPC `mintToken` procedure that returns raw API key for direct browser connection

2. **Client uses direct connection** (Mirror.tsx lines 309-322):
   ```ts
   const { apiKey, configId } = await mintTokenMut.mutateAsync({ voice: voiceGender });
   await connect({
     auth: { type: "apiKey", value: apiKey },
     hostname: "api.hume.ai",
     configId,
   });
   ```

3. **The relay (`/ws`) is also attached** to the server (confirmed in `server/_core/index.ts`)

4. **Potential disconnect causes** (to investigate WITHOUT changing code):
   - `mintToken` returns the raw HUME_API_KEY, not a short-lived access token
   - If HUME_API_KEY is invalid/expired/rate-limited, Hume will accept then immediately close
   - The `configId` for female voice is hardcoded; male uses env var — if env is wrong, Hume rejects
   - No error handling visible in the `handleStartVoice` callback beyond a toast

### Next Step:
- Check production logs for Hume connection errors
- Verify HUME_API_KEY and HUME_CONFIG_ID are valid
- Check if the issue is env-specific (works on manus.space, fails on custom domain?)
- DO NOT modify code until root cause is confirmed with user
