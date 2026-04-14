# Higher Self — Project TODO

## Database & Backend
- [x] Design and migrate full database schema (users, profiles, check-ins, journal entries, domains, habits, insights, chat messages)
- [x] tRPC router: onboarding / user profile
- [x] tRPC router: daily check-ins
- [x] tRPC router: AI mirror chat with streaming
- [x] tRPC router: reflection journal
- [x] tRPC router: life domains & habits tracking
- [x] tRPC router: growth dashboard & analytics
- [x] tRPC router: insights engine
- [x] tRPC router: progress timeline

## Onboarding Flow
- [x] Welcome / splash screen
- [x] Core values selection (multi-select from curated list)
- [x] Life areas self-assessment (slider-based baseline scoring)
- [x] Goals setup (short-term + long-term)
- [x] Personality & beliefs questionnaire
- [x] Onboarding completion & profile creation

## Daily Check-In
- [x] Mood tracker (visual emoji/scale selector)
- [x] Energy level slider
- [x] Habit logging (checkboxes for tracked habits)
- [x] Daily reflection prompt with text input
- [x] AI response to daily check-in

## AI Mirror Chat
- [x] Full chat interface using AIChatBox component
- [x] System prompt engineering for Higher Self persona
- [x] Context injection from user profile + recent check-ins
- [x] Streaming AI responses
- [x] Chat history persistence

## Reflection Journal
- [x] Journal entry creation with rich text
- [x] AI Higher Self perspective on each entry
- [x] Journal history list view
- [x] Entry detail view with AI insights

## Life Domains Tracker
- [x] Domain cards: Mindset, Relationships, Work, Health, Spirituality, Finances
- [x] Habit tracking per domain
- [x] Domain score over time
- [x] Add/edit custom habits per domain

## Growth Dashboard
- [x] Overall growth score / wellness ring
- [x] Radar chart across life domains
- [x] Mood trend line chart (7/30 day)
- [x] Habit streak tracking
- [x] Weekly summary card

## Insights Engine
- [x] Pattern analysis from check-ins
- [x] AI-generated weekly insights
- [x] Actionable step suggestions
- [x] Belief & value alignment score

## Progress Timeline
- [x] Chronological milestone view
- [x] Emotional maturity evolution chart
- [x] Key growth moments highlighted

## UI/UX & Design
- [x] Elegant dark-mode design system (deep navy, warm gold, soft whites)
- [x] Mobile-first responsive layout
- [x] Bottom navigation bar for mobile
- [x] Smooth page transitions with framer-motion
- [x] Custom fonts (Cormorant Garamond + Inter)
- [x] Glassmorphism card components
- [x] Loading skeletons and empty states

## Auth & Navigation
- [x] Protected routes for all main app pages
- [x] Landing page for unauthenticated users
- [x] Redirect to onboarding if profile incomplete
- [x] App shell with bottom nav

## Testing
- [x] Vitest: onboarding router
- [x] Vitest: check-in router
- [x] Vitest: journal router
- [x] Vitest: habits router
- [x] Vitest: chat router
- [x] Vitest: domains router
- [x] Vitest: insights router
- [x] Vitest: timeline router

## Database Schema Fixes
- [x] Fixed missing onboardingCompleted column in users table
- [x] Created all 9 missing tables
- [x] Fixed user_profiles table schema with all required columns
- [x] Fixed all other table schemas to match Drizzle definitions

## Demo Mode (Temporary)
- [ ] Create demo mode to bypass OAuth login
- [ ] Add demo user with sample data
- [ ] Update routing to support demo mode
- [ ] Test all 11 pages in demo mode

## Emotional Mastery 7-Day Program
- [ ] Create database tables: growth_programs, program_lessons, user_program_enrollments, user_lesson_responses
- [ ] Create database migrations for program tables
- [ ] Build tRPC procedures: programs.list, programs.getById, programs.enroll, programs.getCurrentLesson, programs.submitLessonResponse, programs.getProgress
- [ ] Create Programs discovery page (/programs)
- [ ] Create Program details page (/programs/[programId])
- [ ] Create Daily lesson interface (/programs/[programId]/lesson)
- [ ] Create Program progress dashboard (/programs/[programId]/progress)
- [ ] Implement AI-powered lesson feedback using LLM
- [ ] Add completion badges and progress celebrations
- [ ] Write vitest tests for program procedures
- [ ] Test end-to-end program enrollment and lesson completion

## Visual Redesign — Bright Warm Theme
- [x] Update index.css: warm cream background, violet+amber primary palette, light mode
- [x] Update App.tsx ThemeProvider to light mode
- [x] Update Home.tsx, AppShell/nav bar, card styles for new palette
- [x] Update Onboarding.tsx for new palette
- [x] Update global glass/card utility classes
- [x] Update Landing.tsx for new palette
- [x] Verify text contrast and readability across all pages (Home, Chat, Journal, Domains)

## Journal Title Suggestion
- [x] Add tRPC procedure: journal.suggestTitle — calls LLM with entry content, returns a short evocative title
- [x] Update Journal page: debounced trigger after user types 60+ chars, show suggested title chip below title field
- [x] Accept/dismiss/edit flow: clicking chip fills the title input; user can still type manually
- [x] Write vitest test for journal.suggestTitle procedure

## UI Improvements (Mar 28)
- [x] Color-coded life domain cards — each domain has its own accent color for card bg, border, progress bar, score text, and habit checkboxes
- [x] Re-suggest title wand button in Journal — visible once content is 60+ chars, lets user manually re-trigger AI title suggestion
- [x] Home greeting animation — staggered word-by-word blur+slide reveal for the user's name

## Bugs
- [x] Fix OAuth login failure on published domain — restored sameSite=none+secure=true cookie setting that iOS Safari requires for cross-site OAuth redirect chains
- [x] Fix OAuth callback 404 on published domain — NotFound now smart-redirects authenticated users to /home or /onboarding
- [x] Fix duplicate sql import in db.ts
- [x] Fix getDb() to use mysql2/promise connection pool instead of passing DATABASE_URL directly to drizzle
- [x] Fix onboarding INSERT failures (schema-database mismatch resolved)
- [x] Fix onboarding redirect after completion (invalidate auth.me cache)

## AI Mirror Voice Overhaul (Mar 28)
- [x] Rewrite AI Mirror system prompt — drop 'my dear/dearest', mirror user's own voice, feel like a best friend / higher-EQ version of themselves
- [x] Update check-in AI response prompt with same voice guidelines
- [x] Update weekly insight prompt with same voice guidelines
- [x] Update journal AI perspective prompt with same voice guidelines

## Journal Overhaul (Mar 28)
- [x] Add journal_categories table to DB schema (id, userId, name, color, createdAt)
- [x] Add categoryId column to journal_entries table
- [x] Run DB migration for new tables/columns
- [x] Add tRPC procedures: journal.categories.list, journal.categories.create, journal.categories.delete
- [x] Add categoryId support to journal.create and journal.list procedures
- [x] Add search/filter support to journal.list (by keyword, date range, category, mood)
- [x] Rebuild Journal page: working Save button, date-organized entry list, search bar, category/mood filter panel
- [x] Add category management UI (create/delete custom categories with 10-color picker)
- [ ] Write vitest tests for new journal category procedures

## Journal Save Button Fix (Mar 28)
- [x] Fix Save Entry button hidden behind bottom nav bar — moved modal outside AppShell so it renders as true full-screen overlay above the nav

## Bottom Nav Cleanup (Mar 28)
- [x] Make bottom nav slimmer — floating pill design, icons only (active item shows label), reduced height by ~40%
- [x] Ensure all modals render above the nav bar — Domains, Journal, Timeline modals all moved outside AppShell with z-[100]

## Auto-hide Nav on Scroll (Mar 28)
- [x] Hide nav bar when scrolling down, show it again when scrolling up — spring animation, 4px threshold to prevent jitter, tapping a tab always restores nav

## Haptic + Swipe Navigation (Mar 28)
- [x] Haptic feedback on nav taps using Web Vibration API (Android) — 8ms pulse on tap, 6ms on swipe
- [x] Horizontal swipe gesture to navigate between tabs — 50px threshold, horizontal-dominant check prevents scroll conflicts

## Page Transition Animation (Mar 28)
- [x] Directional slide transitions between tabs — slides left when going forward in tab order, right when going back, fade-only for non-tab navigation (e.g. journal entry detail)

## Push Notifications & Daily Reminders (Mar 28)
- [x] Add push_subscriptions table (userId, endpoint, keys, timezone, enabled)
- [x] Add notification_preferences table (userId, reminderTime, timezone, enabled)
- [x] Install web-push and generate VAPID keys
- [x] Server: tRPC procedures for subscribe/unsubscribe/status/updatePrefs/sendTest
- [x] Server: daily scheduler that fires at 6am per user timezone with goal-based message
- [x] Frontend: service worker (sw.js) for push notification display and click handling
- [x] Frontend: useNotifications hook for subscription lifecycle
- [x] Frontend: /notifications settings page with opt-in UI, time picker (5am–12pm), test button
- [x] Frontend: Bell icon on Home header linking to notifications page

## Notification Opt-in After Check-in (Mar 28)
- [x] Show "Want a daily reminder?" card at bottom of check-in completion screen when user hasn't subscribed yet — animated violet card with enable button and dismiss (BellOff) option

## higherself.cloud OAuth Fix (Mar 28)
- [ ] Fix OAuth login on higherself.cloud — route through registered manus.space redirect URI, return to custom domain after login

## Account Settings & Calendar (Mar 28)
- [x] Add phone, email, therapistName, therapistPhone, therapistEmail columns to user_profiles table
- [x] Run DB migration for new profile columns
- [x] Add tRPC procedures: profile.getSettings, profile.updateSettings
- [x] Build /settings Account Settings page (phone, email, therapist name + contact info, notification prefs)
- [x] Add calendar_events table (userId, title, type, date, time, notes, color)
- [x] Run DB migration for calendar_events
- [x] Add tRPC procedures: calendar.list, calendar.create, calendar.update, calendar.delete
- [x] Build /calendar Calendar page with monthly view, event creation modal, event list
- [x] Add Settings and Calendar to nav (profile icon → settings, calendar icon in nav or home)
- [ ] Write vitest tests for new procedures

## Feature Sprint — Recurring Events, Quick-Dial, Goals Integration (Mar 28)
- [x] Add recurrence columns to calendar_events table (recurrence: none/weekly/monthly, recurrenceEnd: date)
- [x] Run DB migration for recurrence columns
- [x] Update tRPC calendar.create to accept recurrence + recurrenceEnd
- [x] Update tRPC calendar.list to expand recurring events into instances for the queried month
- [x] Add Repeat option (None / Weekly / Monthly) to Calendar creation modal
- [x] Add optional "Repeat until" date picker when repeat is weekly/monthly
- [x] Show recurrence badge on event cards (e.g. "Weekly")
- [x] Therapist quick-dial: make therapist phone a tel: link with phone icon button in Settings
- [x] Therapist quick-email: make therapist email a mailto: link with email icon button in Settings
- [x] Calendar+Goals integration: after saving a habit in Domains page, show "Add to Calendar?" prompt
- [ ] Calendar+Goals integration: after onboarding goal setup, offer to schedule a milestone event
- [x] Write vitest tests for updated calendar procedures (21 tests passing)

## OAuth Redirect URI Fix (Mar 28)
- [ ] Investigate how redirect URI is constructed in OAuth flow (client const.ts + server oauth.ts)
- [ ] Fix redirect URI logic so higherself.cloud works the same as higherself.manus.space
- [ ] Test both domains work for login

## URGENT — Make higherself.cloud the Primary OAuth Domain
- [x] Update const.ts: use higherself.cloud as the canonical OAuth redirect URI
- [x] Update oauth.ts: handle higherself.cloud as the primary callback domain
- [x] Test, checkpoint, publish, verify login works on higherself.cloud


## One-Click Onboarding (Apr 9)
- [x] Add seedIntent field to users table
- [x] Create QuickOnboarding.tsx component with 5 visual intent tiles (Inner Peace, Clarity, Confidence, Healing, Focus)
- [x] Add tRPC procedure: onboarding.saveSeedIntent
- [x] Route /quick-onboarding wired into App.tsx
- [x] Write vitest tests for onboarding router
- [ ] Integrate QuickOnboarding into post-signup flow (route new users here before full questionnaire)
- [ ] Use seedIntent in AI Mirror system prompt for personalization

## RAG with Pinecone Integration (Apr 9)
- [x] Install @pinecone-database/pinecone and openai packages
- [x] Create server/rag/embeddings.ts utility with:
  - [x] embedText() — generates OpenAI text-embedding-3-small vectors
  - [x] upsertJournalEmbedding() — stores vector + metadata in Pinecone
  - [x] searchSimilarEntries() — semantic search with user filter
  - [x] fetchJournalEntriesFromIds() — retrieves full text from MySQL
  - [x] retrieveContextForChat() — complete RAG pipeline
  - [x] deleteEmbedding() — cleanup when entries deleted
- [x] Add RAG context injection to chat.send procedure:
  - [x] Retrieve top-3 similar journal entries before LLM invocation
  - [x] Inject entries into system prompt with similarity scores
  - [x] Log RAG context usage for debugging
  - [x] Save context snapshot with chat messages
- [x] Add environment variables: PINECONE_API_KEY, PINECONE_INDEX_NAME, OPENAI_API_KEY
- [x] Create server/rag.test.ts with embedding validation tests
- [ ] Add OpenAI credits to account (tests currently fail due to insufficient credits)
- [ ] Test end-to-end RAG: create journal entries → chat → verify context injection
- [ ] Create Pinecone skill documentation for future reference

## Future RAG Enhancements
- [ ] Add hard filters to RAG search (by life domain, date range)
- [ ] Implement RAG for journal entry suggestions (suggest related past entries)
- [ ] Add RAG to weekly insights (pull relevant patterns from vector search)
- [ ] Implement semantic similarity clustering for pattern detection
- [ ] Add RAG analytics dashboard (most-retrieved entries, context usage patterns)


## QuickOnboarding Integration (Apr 10)
- [x] Add seedIntent field to users table schema
- [x] Create saveSeedIntent function in db.ts
- [x] Add onboarding.saveSeedIntent tRPC procedure
- [x] Create QuickOnboarding.tsx component with 5 visual intent tiles
- [x] Route Home.tsx to redirect to /quick-onboarding if seedIntent not set
- [x] Integrate seedIntent into buildHigherSelfSystemPrompt() for personalized AI responses
- [x] Add /quick-onboarding route to App.tsx
- [ ] Execute database migration: ALTER TABLE users ADD seedIntent varchar(100)
- [ ] Test onboarding flow: signup → QuickOnboarding → Chat with personalized responses
- [ ] Add vitest tests for seedIntent personalization in system prompt


## Settings Enhancements (Apr 10)
- [x] Add "Change your intention" modal to Settings page
- [x] Add sign-out button to Settings page
- [x] Add logout confirmation dialog
- [ ] Test Settings features with both buttons functional


## SeedIntent Integration (Apr 11)
- [x] Re-enable seedIntent in drizzle/schema.ts
- [ ] Generate and execute database migration for seedIntent column (user action required)
- [x] Create onboarding.saveSeedIntent tRPC procedure
- [x] Update QuickOnboarding component to call saveSeedIntent on tile click
- [x] Integrate seedIntent into buildHigherSelfSystemPrompt() for personalized AI responses
- [ ] Test end-to-end: select intent → save to DB → AI responds with personalization (after migration)
- [ ] Write vitest tests for seedIntent personalization (after migration)


## Progress Indicator for QuickOnboarding (Apr 11)
- [x] Add progress bar component showing "Step 1 of 2: Choose your intention"
- [x] Style progress indicator with visual bar (50% filled)
- [x] Test progress indicator displays correctly on QuickOnboarding page


## Step 2 Onboarding Questionnaire (Apr 11)
- [x] Review user_profiles schema to understand available fields
- [x] Create FullOnboarding.tsx component with multi-section form
- [x] Add life domains selection (Mindset, Relationships, Work, Health, Finance, Creativity, Spirituality, Personal Growth)
- [x] Add goals capture field (text input or predefined options)
- [x] Add current challenges capture field (multi-select or text)
- [x] Create tRPC procedure to save onboarding responses to user_profiles
- [x] Integrate Step 2 routing: after Step 1 completion → Step 2 questionnaire → mark onboardingCompleted = true
- [ ] Test end-to-end onboarding flow: Step 1 → Step 2 → Chat with personalized responses
- [x] Write vitest tests for Step 2 form submission and data persistence (8 tests passing)


## Intent-Specific System Prompts (Apr 11) - COMPLETE
- [x] Design intent-specific system prompt templates for each of the 5 intentions
- [x] Implement intent-specific prompts in chat router
- [x] Write vitest tests for intent-specific prompts (12 tests passing)
- [x] Test end-to-end: AI Mirror chat working with intent-specific prompts
- [x] CRITICAL FIX: Fixed OAuth login failure by temporarily disabling seedIntent field (database migration pending)
- [x] Verified AI Mirror tone adaptation in chat interface (direct, honest, empowering style)

## Database Migration - seedIntent Column (COMPLETE)
- [x] Execute migration: ALTER TABLE `users` ADD COLUMN `seedIntent` varchar(100);
- [x] Re-enable saveSeedIntent function in server/db.ts
- [x] Re-enable saveSeedIntent procedure in server/routers.ts
- [x] Re-enable saveSeedIntentMutation in client/src/pages/QuickOnboarding.tsx
- [x] Re-enable seedIntent field in drizzle/schema.ts
- [x] Restart dev server and verify login works


## Blank Page After Login - FIXED (Apr 13)
- [x] Diagnosed: Existing users redirected to QuickOnboarding because seedIntent was undefined
- [x] Fixed: Removed seedIntent routing logic from Home.tsx useEffect
- [x] Result: Existing users now see full home dashboard instead of blank page
- [x] Note: QuickOnboarding is only shown to new users during initial onboarding


## Disclaimer Footer (Apr 13) - COMPLETE
- [x] Search git history for previous disclaimer content
- [x] Create CrisisDisclaimerFooter component with Synapset info and emergency contacts
- [x] Integrate disclaimer footer into AppShell layout (displays on all pages)
- [x] Styled with clean, organized layout (3 sections: What Synapset Is, What It's NOT, Crisis Help)
- [x] Emergency numbers: 988, 1-800-273-8255, 911 (clickable tel: links)


## Chat UX Improvements (Apr 13) - COMPLETE
- [x] Auto-scroll to latest message when chat page loads (instant scroll on history load)
- [x] Smooth-scroll to bottom when new messages arrive
- [x] Implement date/time stamp logic for messages 1+ hour apart
- [x] Style date/time stamps (centered pill, subtle muted color)
- [x] Format: today = time only, yesterday = 'Yesterday · time', older = 'Apr 13 · time'
- [x] 9 vitest tests passing for timestamp logic

## Message Reactions & Saved Insights (Apr 13) - COMPLETE
- [x] Add savedInsights table to drizzle/schema.ts (heart/star reactionType)
- [x] Generate and execute migration SQL (saved_insights table created)
- [x] Add saveInsight, listInsights, deleteInsight DB helpers in server/db.ts
- [x] Add savedInsights.save, savedInsights.list, savedInsights.delete tRPC procedures
- [x] Add heart/star reaction buttons to AI messages in Chat UI
- [x] Reaction toggle: same type = remove, different type = replace
- [x] Create Saved Insights journal page with All/Emotional/Actionable filter tabs
- [x] Add 'Saved' button in Chat header linking to Saved Insights page
- [x] 14 vitest tests passing for savedInsights logic

## Clear Conversation Feature (Apr 14) - COMPLETE
- [x] Add sessionId column to chat_messages table (to group messages by session)
- [x] Generate and execute migration for sessionId column
- [x] Add chat.clearConversation tRPC procedure (creates new session UUID, preserves old messages)
- [x] Update chat.history procedure to filter by sessionId
- [x] Update chat.send procedure to pass sessionId with new messages
- [x] Add "New" button in Chat header with confirmation dialog ("Start fresh ✦")
- [x] Confirmation modal: "Your previous conversation will be preserved"
- [x] 8 vitest tests passing for session isolation and UUID generation logic

## Viewport-Locked App Layout (Apr 14) - COMPLETE
- [x] Fix AppShell: set html/body/root to h-dvh overflow-hidden, main content area scrolls internally
- [x] Add noScroll prop to AppShell for pages that manage their own scroll (Chat)
- [x] Fix Chat page: h-full flex column, messages scroll internally, input pinned at bottom
- [x] Fix Calendar page: removed min-h-screen (AppShell handles height)
- [x] Fix CheckIn page: removed min-h-screen
- [x] Fix SavedInsights page: removed min-h-screen
- [x] Fix Settings page: removed min-h-screen
- [x] Fix Landing page: h-dvh instead of min-h-screen
- [x] Fix NotFound page: h-dvh instead of min-h-screen
- [x] Fix Onboarding page: h-dvh instead of min-h-screen
- [x] Fix QuickOnboarding page: h-dvh instead of min-h-screen
- [x] Fix FullOnboarding page: h-dvh instead of min-h-screen
- [x] Fix getTodayCheckIn: return null instead of undefined (fixes React Query error)
- [x] TypeScript: 0 errors after all changes

## Chat Enhancements Sprint (Apr 14) - COMPLETE
- [x] Show current intention mode in chat header (e.g., "Clarity Mode ✦") — badge reads "✦ Clarity Mode" with intent-specific color
- [x] Add Saved Insights tab to bottom navigation bar — permanent 5th tab with Bookmark icon
- [x] Build Past Conversations viewer in chat header — slide-up sheet with session list, read-only view, "Back to live" CTA
- [x] Write vitest tests for past conversations logic (13 tests passing: intent config, date formatting, session shape)

## Session Naming / Title (Apr 14) - COMPLETE
- [x] Add chat_sessions table with sessionId + title columns (migration applied)
- [x] Add getChatSessionTitles and updateSessionTitle DB helpers in server/db.ts
- [x] Add chat.getSessionTitles and chat.updateSessionTitle tRPC procedures
- [x] Update Past Conversations panel: show custom title if set, fallback to date label
- [x] Inline edit: pencil icon on hover → inline input field → save with Enter or checkmark
- [x] Write vitest tests for session title logic (18 tests passing)

## Teal Retheme (Apr 14) - COMPLETE
- [x] Update index.css CSS variables to relaxing teal palette (soft mint bg, deep teal primary)
- [x] Update hardcoded oklch colors in Chat.tsx to match teal theme
- [x] Update hardcoded oklch colors in AppShell.tsx, App.tsx, Home.tsx, Landing.tsx, Onboarding.tsx, Domains.tsx, Dashboard.tsx

## Home Screen Cleanup (Apr 14) - COMPLETE
- [x] Remove redundant Daily Check-in card from "Your Space" grid (3 cards remain: Mirror, Journal, Life Domains)
- [x] Add user's name to time-based greeting — "Good morning, JonnyDonny" with animated reveal

## AI-Suggested Session Titles (Apr 14) - COMPLETE
- [x] Add getSessionMessagesForTitle and sessionHasTitle helpers in server/db.ts
- [x] Add chat.generateTitle tRPC procedure: calls LLM with compact transcript, stores result in chat_sessions
- [x] Trigger auto-title in Chat.tsx when user taps "Start fresh" (skips if already titled, silent failure)
- [x] Title appears in history panel after invalidation (no placeholder needed — instant cache update)
- [x] Write 19 vitest tests: skip conditions, transcript building, title sanitization, real-world examples
