# MIRRORED Build 4 — Original-to-iOS Parity Matrix

Status: **FROZEN_SWEEP / BUILD_4_HOLD**

Canonical product: `jonchadbourne21-rgb/higher-self`

Canonical commit: `0c67fac5cfd4d0bc419f79595944a49f6ba45b91`

Current reduced Expo reference: `jonchadbourne21-rgb/mirrored-ios@9bec1e11929be9613d2bcfad40255d9b51b4f9d4`

Current migrated backend reference: `jonchadbourne21-rgb/mirrored-backend@808d43bdc6a7a6acb2a50d1b72a98e72306282c7`

Existing TestFlight disposition: **Build 3 = AUTH/INFRA PASS — PRODUCT PARITY FAIL**.

No Build 4, public App Review submission, destructive data restore, or parity claim is authorized until this matrix closes.

## Status vocabulary

- `MATCH` — behavior and contract are materially preserved; still needs execution proof where noted.
- `PARTIAL` — counterpart exists, but meaningful canonical behavior is absent.
- `MISSING` — no corresponding native product surface.
- `STALE_NATIVE_DRIFT` — native implementation reflects an older/contradicted product state.
- `PLATFORM_EQUIVALENT_REQUIRED` — web behavior must become an iOS-native equivalent, not be copied literally.
- `SOURCE_LEDGER_CONFLICT` — pinned code, tests, history, and completion ledger disagree; resolve from evidence before porting.
- `DIFF_REVIEW_REQUIRED` — same subsystem exists but migrated implementation differs materially from canonical.
- `INFRA_MIGRATION_REQUIRED` — code exists but old hosting/scheduler/provider assumptions remain.
- `NEEDS_EXECUTION_PROOF` — implementation exists but the real workflow has not been demonstrated in the target environment.
- `DECISION_REQUIRED` — product/platform choice must be explicit.

## Implementation-basis result from the sweep

The canonical repository is already a prepared **Capacitor iOS/Android app**, not merely a web reference. It contains `ios/`, `android/`, `capacitor.config.ts`, native storage, native API-base resolution, native auth plumbing, Capacitor push integration, RevenueCat Capacitor plumbing, a privacy manifest, app assets, and `STORE_SUBMISSION.md`.

Therefore the default Build 4 strategy is:

**CANONICAL-FIRST CAPACITOR — PREFERRED**, subject to successful macOS/Xcode build qualification.

Reason: preserve the actual 29-route product and its mature shared UI/logic instead of manually recreating it screen-by-screen in the reduced Expo shell.

Expo remains a fallback implementation basis only if a concrete Capacitor build/signing blocker survives qualification.

This is not permission to restore old Manus runtime dependencies. The canonical product must retain its product behavior while migrating auth, API, payments, push, scheduling, voice, and infrastructure to current supported equivalents.

---

# Product parity matrix

## 1. App shell / navigation / landing

| Behavior | Canonical | Current Expo | Status | Build 4 requirement |
|---|---|---|---|---|
| Branded landing | Full landing, emblem, CTA, existing-user sign-in, FAQ/demo links | Login state embedded in Home | `PARTIAL` | Preserve full product landing or native-equivalent onboarding entry |
| Authenticated route gating | Redirects incomplete users to onboarding | Does not consistently enforce `onboardingCompleted` | `PARTIAL` | Fresh Apple user must be routed to onboarding before product surfaces |
| Main tab product model | Home / Domains / Mirror / Journal / Programs / Dashboard ordering semantics | Home / Habits / Mirror / Journal / Programs | `STALE_NATIVE_DRIFT` | Preserve canonical navigation semantics; do not substitute Domains with simplified Habits |
| Directional transitions / swipe navigation | Implemented | Not parity-verified | `PARTIAL` | Native-equivalent transitions/gestures where they remain product behavior |
| Trial banner | AppShell-wide | Missing | `MISSING` | Show correct server-authoritative trial state across app |
| Echo reveal overlay | AppShell-level | Missing | `MISSING` | Restore cinematic Echo reveal workflow |
| Error boundary | Canonical component | No equivalent parity proof | `PARTIAL` | App-level recoverable error surface |
| Demo mode | Exists as reviewer/demo fixtures | Not ported | `DECISION_REQUIRED` | Keep only if needed for review/testing; never substitute for production auth/data proof |

## 2. Onboarding

Canonical behavior:
- preferred name
- seed-intent selection
- select 3–5 core values
- short-term goal
- baseline 0–10 scores across six life domains
- full profile completion
- optional calendar milestone flow
- QuickOnboarding and FullOnboarding variants

Current Expo only captures preferred name + freeform intent.

Status: **`PARTIAL` + `MISSING`**

Acceptance:
- new account cannot enter full app before canonical onboarding completion state is established;
- stored fields match canonical server contract;
- seed intent affects later prompts;
- domain baselines and goal persist;
- no invented migration of former Manus account history.

## 3. Home

Canonical Home includes:
- profile / greeting
- daily quote
- daily check-in state
- upcoming calendar events
- Aura history + seven-day sparkline
- habit streak
- active program cards
- dynamic tile engagement/order
- Echo tile
- trial/upgrade state
- Time Capsule / notifications / settings entry points
- FAQ pulse state

Current Expo Home is a reduced static quick-access screen.

Status: **`PARTIAL`**

Acceptance: each canonical data-backed card/entry point either works natively or is explicitly retired by product decision. Empty data and request failure must not be conflated.

## 4. Check-In + Check-In Insight

Canonical:
- mood / energy / stress
- AI-generated daily reflection prompt
- personalized AI follow-up
- stored answers
- existing-today guard
- AI response
- completed-state presentation
- dedicated Check-In Insight page
- patterns / next growth steps
- loading/reveal states
- notification opt-in after check-in
- streak/reward feedback

Current Expo: basic check-in flow; no dedicated insight page.

Status: **`PARTIAL` + `MISSING`**

Acceptance: full input → AI prompt → follow-up → persistence → insight → patterns/actions workflow executes with current backend and correct account isolation.

## 5. Mirror text chat

Canonical behavior includes:
- persistent history
- session grouping
- new/clear conversation preserving old sessions
- past conversations viewer
- history search
- resume prior session
- current intention context
- timestamps
- generated session titles
- manual rename
- starter prompts
- rich thinking/reveal states
- saved-insight reactions
- RAG personalization
- crisis fixed-response boundary
- session fingerprints

Current Expo:
- local in-memory messages
- `chat.send`
- starter prompts
- `+` new-chat button is effectively no-op
- prior failures were swallowed

Status: **`PARTIAL`**

Critical open item: live text-chat failure root cause is **not yet identified**. Do not infer OpenAI/database cause from symptoms alone.

Acceptance:
- visible safe errors;
- no automatic duplicate mutation retry;
- persistent session/history behavior;
- clear/resume/title/search workflows;
- saved insights/reactions;
- RAG context;
- crisis tests and device execution.

## 6. Saved Insights

Canonical source contains Saved Insights behavior and tests, including reaction toggle and All / Emotional / Actionable filters. It is not a simple current literal route in `App.tsx`, so routing/integration must be reconciled from canonical UI/history rather than assumed.

Current Expo: absent.

Status: **`MISSING` / `SOURCE_LEDGER_RECONCILIATION_REQUIRED`**

## 7. Journal

Canonical:
- create/save
- AI Higher Self perspective
- title suggestion after sufficient content
- three creative title options
- re-suggest control
- custom categories CRUD
- category colors
- keyword/date/category/mood combined filters
- related past-entry RAG suggestions
- entry themes
- richer pending-AI states
- usage limits

Current Expo:
- basic list
- keyword search
- optional title/content compose
- basic detail
- basic AI perspective display

Status: **`PARTIAL`**

Acceptance: restore canonical filters, category management, AI-title behavior, related-memory suggestions, themes, usage gates, and executed journal-to-Echo/RAG downstream effects.

## 8. Domains / Habits

Canonical Domains:
- six life-domain scores
- score update
- create/delete/toggle habits
- habit streaks
- per-domain habit progress
- habit completion animation
- 7/14/30/100-day milestone behavior
- 30/100 reward/grant feedback
- habit → Calendar integration with recurrence

Current Expo Habits:
- six groups
- toggle existing habits
- simple progress count

Status: **`PARTIAL`**

Acceptance: restore Domains as a first-class surface, not merely a renamed habit list.

## 9. Rewards / Echo product evolution

Canonical product history explicitly removed the RewardWheel/WelcomeSpin UI and `/rewards` route, replacing the Home rewards tile with Echo. Some underlying milestone/grant semantics remain elsewhere.

Current Expo still has `/rewards` / Milestones surface.

Status: **`STALE_NATIVE_DRIFT`**

Acceptance:
- do not resurrect deleted wheel UI;
- preserve still-valid streak/grant semantics where canonical current code uses them;
- restore Echo as the current product surface.

## 10. Echo

Canonical:
- journal tagging: primary emotion, themes, tension, resolution, intensity
- memory embedding / similarity search
- Echo queue
- pending reveal
- cinematic EchoReveal
- history + stats
- compound patterns
- contextual micro-challenges
- accept / complete / skip challenge
- journal write → Echo candidate pipeline

Current Expo: none.

Backend Echo core exists and is largely retained, but workflow execution is not proven on Railway.

Status: **`MISSING` + `NEEDS_EXECUTION_PROOF`**

## 11. Insights / Dashboard / Timeline

Canonical:
- weekly insight
- growth score
- patterns
- actionable steps
- mood trend
- recurring-theme/RAG clustering
- richer analytics/dashboard
- timeline history

Current Expo: no equivalent screens.

Status: **`MISSING`**

Backend weekly insight/digest implementations have confirmed drift and must be reconciled before client parity.

## 12. Programs — catalog and discovery

Canonical authored content recovered from pinned source:
- 7-Day Emotional Mastery — 7 days
- 21-Day Inner Voice Reset — 21 days
- The Present Moment Challenge — 30 days
- The Stoic Path — 30 days
- 21-Day Parts Work — 21 days
- Self-Actualization Guide to Full Potential — 21 days
- Self-Determination through Suffering — 48 days

Total: **7 programs / 178 authored lessons**.

Current Railway catalog state has not yet been safely restored.

Current Expo Programs previously rendered request failure and true empty catalog identically.

Status: **`DATA_RESTORE_HOLD` + `PARTIAL`**

Important metadata gap: canonical `program_lessons.isVoiceDay` is behaviorally significant. Canonical commit history explicitly establishes IFS days **3, 12, 21** as voice days. Current draft restore catalog does not yet preserve this flag.

Acceptance before any production restore:
- source-pinned catalog includes all behaviorally meaningful metadata, including `isVoiceDay`;
- disposable MySQL restore test;
- read-only Railway plan;
- conflict review;
- insert-only apply with verified backup and post-write reconciliation;
- no destructive archived seed execution.

## 13. Programs — daily lesson workflow

Canonical Program Detail includes:
- enrollment / paywall handling
- current lesson
- progress percentage
- completed days
- lesson concept
- exercise
- daily reflection
- RAG-informed AI feedback
- one-lesson-per-day gate
- 6:00 AM Eastern unlock
- countdown
- locked/completed states
- Program Insight route
- reflection journal
- streak/completion rewards
- completion titles/badges
- voice-day path and completion

Current Expo Program Detail is only overview + lesson list + Start Program.

Status: **`PARTIAL`**

## 14. Calendar

Canonical:
- month list
- create/update/delete
- event types
- all-day events
- weekly/monthly recurrence
- recurrence end
- instance expansion
- recurrence badge
- upcoming events
- habit and onboarding goal integration

Current Expo: month grid/read-only event presentation.

Status: **`PARTIAL`**

## 15. Notifications / push

Canonical web behavior:
- push subscriptions
- notification preferences
- per-user timezone reminder schedule
- goal-based copy
- time picker 5 AM–12 PM
- test push
- weekly insight / program unlock / Time Capsule / entropy-trigger notifications

Canonical Capacitor already has a native APNs/FCM registration hook, but its own source notes that server-side device-token storage is still TODO.

Current Expo notifications use a local scheduled 9 AM notification and do not recreate canonical remote push semantics.

Status: **`PLATFORM_EQUIVALENT_REQUIRED` + `PARTIAL`**

Acceptance: APNs/native push token → server ownership-bound storage → canonical scheduling/event triggers → device receipt, with local-only reminders used only where intentionally equivalent.

## 16. Settings

Canonical pinned Settings includes:
- change intention
- subscription/upgrade status
- milestones / streak context
- notification / privacy / terms / FAQ entry points
- stronger account-delete confirmation
- logout confirmation

Current Expo is reduced.

The completion ledger additionally claims therapist contact editing / quick dial / email, but pinned `Settings.tsx` does not expose those fields.

Status: **`PARTIAL` + `SOURCE_LEDGER_CONFLICT`**

Acceptance: resolve therapist-contact claim from git history/API before porting; preserve only evidenced current behavior.

## 17. Time Capsule

Canonical:
- letters archive
- letter detail + read state
- fingerprint count / unlock state
- unread count
- cadence 30/90/365
- enable/disable
- manual generation gate
- scheduled generation/delivery
- voicemails tab
- voicemail audio / listened state
- inbound archive from Higher Self call flow

Current Expo:
- simple letters list
- manual Generate

Status: **`PARTIAL`**

## 18. Voice History

Canonical:
- session list
- expandable transcript
- emotion summary/timeline
- duration
- rename
- save session to Journal
- start-session CTA

Current Expo: list/title/date/duration only.

Status: **`PARTIAL`**

## 19. Voice Mirror / Hume

Canonical product includes:
- Hume EVI
- token minting
- direct websocket
- multiple voice configs
- session/message/emotion persistence
- transcript
- usage/entitlement gates
- voice history

Current Expo implements a meaningful subset, but Build 3 fails because Hume config is not present on Railway.

Status: **`CONFIG_ONLY` + `PARTIAL` + `NEEDS_EXECUTION_PROOF`**

Acceptance: config presence is not enough; real device must complete bidirectional audio, transcript, emotion persistence, session close, entitlement gates, and history.

## 20. Higher Self outbound call / entropy / voicemail

Canonical:
- entropy detection
- “Your Higher Self is calling” notification/UI
- accept → specialized V2V session
- decline → generated voicemail
- Time Capsule voicemail archive
- tests

Current Expo: absent.

Migrated `v2vRelay.ts` differs from canonical.

Status: **`MISSING` + `DIFF_REVIEW_REQUIRED`**

## 21. Subscription / trial / IAP

Canonical server truth:
- 10-day full trial
- Pro: $9.99/mo / $104.99/yr
- Premium Pro: $13.99/mo / $149.99/yr
- active trial counts as Pro + Voice
- free after trial: 3 chats/day, 2 journals/week, zero program enrollments, no free voice

Current Expo has internal contradictions:
- Paywall says 7-day trial
- hardcodes $79.99 Pro annual and $19.99 voice monthly in places
- FAQ says one free active program
- local RevenueCat gating does not inherently honor server-side 10-day trial

Status: **`STALE_NATIVE_DRIFT` / `PLATFORM_EQUIVALENT_REQUIRED`**

Canonical Capacitor already includes RevenueCat plumbing. iOS must use App Store IAP/RevenueCat; Stripe remains web-only.

Acceptance: App Store products, RevenueCat offering, webhook, server subscription state, trial, restore, upgrade/downgrade/expiration all agree end-to-end.

## 22. Safety / crisis / wellness positioning

Canonical:
- backend crisis detector / fixed kill-switch response
- tests
- prominent FAQ disclaimer
- 988 / emergency resources
- CrisisDisclaimerFooter

Current Expo:
- local voice keyword alert
- reduced FAQ
- missing prominent disclaimer/crisis box

Status: **`PARTIAL`**

Acceptance: no safety weakening. Text and voice paths must preserve server-authoritative crisis behavior, with correct client resources and no misleading “therapy” claims.

## 23. FAQ / Privacy / Terms

FAQ native copy is materially stale relative to current trial/limits and omits canonical crisis presentation.

Privacy/Terms are platform-adapted and should **not** be copied byte-for-byte from old web text because infrastructure/billing changed.

Status:
- FAQ: `STALE_NATIVE_DRIFT`
- Privacy/Terms: `PLATFORM_EQUIVALENT_REQUIRED`

Acceptance: content reflects actual Apple/RevenueCat/Railway/OpenAI/Hume behavior, deletion/retention, wellness scope, support contact, and current pricing/limits. Legal/product-owner review remains required.

---

# Backend / learning / infrastructure parity

## 24. Core router / database / schema drift

The migrated backend is not a byte-for-byte canonical transplant.

Known `DIFF_REVIEW_REQUIRED` files include:
- `server/routers.ts`
- `server/db.ts`
- `drizzle/schema.ts`
- `server/intentPrompts.ts`
- `server/_core/index.ts`
- `server/_core/env.ts`
- `server/_core/llm.ts`
- `server/rag/memory.ts`
- `server/routers/programs.ts`
- `server/routers/weeklyInsight.ts`
- `server/v2vRelay.ts`
- Time Capsule generators

Do not call a workflow MATCH because the filename exists.

## 25. RAG / learning layer

Canonical includes:
- expanded `memory.ts`
- hard filters by date/domain
- journal-related memory suggestions
- weekly-insight RAG context
- semantic clustering / pattern detection
- personality updates
- cost tests
- RAG eval dataset/build/judge/metrics/schedule
- tracing

Migrated backend omits or drifts from part of this layer.

Status: **`DIFF_REVIEW_REQUIRED`**

This may directly contribute to weaker Mirror/Insights behavior.

## 26. Weekly Insight / Digest drift

Canonical current versions use the shared long-form prompt / learning context and RAG context. Migrated versions are older/different.

Status: **`DIFF_REVIEW_REQUIRED`**

Acceptance: canonical prompt semantics + current OpenAI implementation + account isolation + scheduled generation + push + client render.

## 27. Scheduled jobs

Canonical jobs include:
- entropy detection
- linguistic drift
- program lesson unlock
- 30-day letter
- Time Capsule
- weekly digest
- weekly insight
- related scheduler logic
- RAG eval scheduling

Files existing on Railway do not prove invocation. Some old endpoints assume Manus heartbeat/cron semantics.

Status: **`INFRA_MIGRATION_REQUIRED` + `NEEDS_EXECUTION_PROOF`**

Acceptance: each consequential job has an explicit Railway/independent scheduler, secret/auth boundary, deterministic target scope, run receipt, and idempotency/duplicate protection where appropriate.

## 28. Health/readiness

The migrated health check previously treated old Manus OAuth environment variables as OAuth readiness. Apple auth replaced that path.

Status: **`STALE_BACKEND_DRIFT`**

Acceptance: health endpoint reports current dependencies only and distinguishes presence from executed provider validity.

## 29. CORS / native API

Canonical Capacitor has native CORS specifically for `capacitor://localhost` / `http://localhost`. Migrated backend dropped that middleware during Railway recovery.

Status: **`INFRA_MIGRATION_REQUIRED`** if Capacitor is Build 4 basis.

Acceptance: narrow native-origin CORS with Bearer auth and tests; no wildcard credential exposure.

---

# Data / provenance / migration limits

## 30. Authored product content vs personal data

Recovered program scripts/query records prove authored catalog content, not a former production DB export.

Authorized restoration scope may include verified authored program/lesson content after review.

Not authorized without separate evidence:
- fabricated former user histories
- account linking by matching email alone
- invented old journal/chat/check-in records
- overwriting current Railway user data to resemble Manus state

## 31. Program voice metadata

`isVoiceDay` is a required behavior field. Canonical evidence establishes IFS days 3, 12, 21 as voice days. Restore tooling must include and verify this before production use.

## 32. Former account continuity

New Apple-auth accounts currently use a new subject-derived identity. Whether any historic Manus user record should be linked requires an explicit, independently verified mapping procedure.

Status: **`DECISION_REQUIRED` / NO_AUTO_LINK**

---

# Canonical mobile-wrapper audit

## 33. Already present in canonical Capacitor source

- native iOS Xcode project
- Android project
- Capacitor config
- native app/deep-link plumbing
- native storage abstraction (`@capacitor/preferences`)
- native API-base abstraction
- RevenueCat Capacitor abstraction
- native push permission/token hook
- status bar / haptics / keyboard / splash plugins
- iOS privacy manifest
- branded assets
- iPhone-only target
- store submission guide

This materially lowers the need for a manual Expo feature rewrite.

## 34. Capacitor migration work still required

- change app identity from `cloud.higherself.app` to existing App Store ID `com.mirrored.aiself`
- change old native API fallback to Railway/current production host
- remove Manus navigation/runtime dependency
- replace native Manus OAuth flow with current Apple auth + Mirrored JWT
- reconcile server native CORS
- finish native push token → server path
- configure RevenueCat products/keys/webhook
- configure Hume
- current privacy/legal copy
- cloud macOS/Xcode signing/build pipeline
- real-device execution

Status: **`PREFERRED_BASIS / QUALIFICATION_REQUIRED`**

---

# Canonical tests as acceptance evidence

The canonical test suite contains coverage for, among other areas:
- auth logout
- AI session titles
- calendar
- chat sessions/timestamps/history search/resume/clear
- Check-In Insight
- comprehensive weekly insights
- CORS
- crisis safety
- Eastern-time lesson gates
- entropy/outbound call
- onboarding
- habit streaks
- Higher Self prompt behavior
- Hume credentials/webhook/voice sessions
- journal categories/filters
- linguistic drift
- milestones
- programs
- Saved Insights
- session fingerprints
- settings
- Time Capsule / 30-day letter
- upcoming events
- V2V relay
- weekly digest

Passing historical tests is evidence of the canonical contract; they must be rerun/adapted against the migrated Build 4 backend. It is not sufficient to report the old pass count.

---

# Build 4 hard gate

Build 4 is forbidden until all of the following are true:

1. **Implementation basis qualified** — canonical Capacitor or a documented fallback with equivalent parity risk controls.
2. **Parity matrix closed** — every row is `MATCH`, justified platform equivalent, or explicit product retirement approved by owner.
3. **Program catalog restored safely** — including behavior metadata; no destructive source scripts.
4. **Text Mirror executed** — real authenticated device request receives AI response; history/session/RAG/error/safety behavior verified.
5. **Insights executed** — weekly/check-in/program insights render real data and fail visibly/safely.
6. **Programs executed** — enrollment, daily gate, reflection, AI feedback, insight, voice day, completion and entitlement behavior.
7. **Domains/Habits/Calendar executed** — CRUD, score, streak, recurrence and integration paths.
8. **Echo executed** — journal → tagging → retrieval → reveal/challenge/history.
9. **Time Capsule executed** — fingerprint → letter/settings/read and voicemail archive where enabled.
10. **Voice executed** — Hume device audio, transcript, emotions, persistence/history; outbound call/voicemail if retained.
11. **Onboarding executed** — fresh Apple-auth user cannot bypass required setup.
12. **Subscriptions executed** — 10-day trial, App Store IAP, RevenueCat, server tier, restore/expiration, paywalls agree.
13. **Notifications executed** — native token and all retained remote push triggers work.
14. **Safety executed** — crisis path fixed response/resources on relevant modalities.
15. **Account deletion executed** — user-owned data removal and session invalidation verified.
16. **Canonical regression suite rerun** — migrated backend/native-equivalent checks pass with documented exceptions.
17. **No active Manus runtime dependency** — source search + network/device proof.
18. **Production readiness review** — privacy, permissions, legal/support URLs, App Store metadata and reviewer access.

Only after these gates pass may build number 4 be created and uploaded to TestFlight.
