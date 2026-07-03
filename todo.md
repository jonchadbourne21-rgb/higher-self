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
- [x] Create CrisisDisclaimerFooter component with Mentrove info and emergency contacts
- [x] Integrate disclaimer footer into AppShell layout (displays on all pages)
- [x] Styled with clean, organized layout (3 sections: What Mentrove Is, What It's NOT, Crisis Help)
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

## Weekly Reflection Digest (Apr 14) - COMPLETE
- [x] Add weekly_reflections table to schema (userId, weekStart, summary, sessionCount, createdAt) — migration applied
- [x] Add getWeekSessionsForDigest, saveWeeklyReflection, getLatestWeeklyReflection, getAllUsers helpers in db.ts
- [x] Add buildWeeklyDigest logic: fetch week's sessions, build transcript, summarize with LLM, save to DB
- [x] Add scheduled job (weeklyDigestScheduler.ts) to run every Sunday at 8 AM UTC
- [x] Add home.getLatestDigest tRPC procedure to fetch latest digest for current user
- [x] Add "✦ Your week in reflection" card to Home.tsx with session count and digest summary
- [x] Write 18 vitest tests for digest generation, week start calculation, transcript building, edge cases

## Navigation Restructure (Apr 17) - COMPLETE
- [x] Update AppShell: replaced Insights tab with Journal tab in bottom nav (BookOpen icon)
- [x] Add Insights tab to Chat.tsx (Mirror page) as third tab alongside Chat and History
- [x] Update App.tsx routing: removed standalone /saved-insights route
- [x] Verify all internal links work: Home card, Chat reactions, tab navigation

## History Tab Search (Apr 18) - COMPLETE
- [x] Add historySearchQuery state to Chat.tsx
- [x] Add filtering logic: match session title or message count against search query (useMemo)
- [x] Add search bar UI with clear button (X icon) in History tab
- [x] Write 14 vitest tests for search filtering logic (title match, message count, edge cases)

## Resume/New Chat Prompt (Apr 21)
- [ ] Add lastSessionId column to users table
- [ ] Add chat.getLastSession tRPC procedure
- [ ] Add resume/new chat modal to Chat.tsx (shows on first load)
- [ ] Auto-load last session and scroll to bottom if user chooses resume
- [ ] Write vitest tests for resume logic


## Resume/New Chat Prompt (Apr 21) - COMPLETE
- [x] Add lastSessionId column to users table (migration applied)
- [x] Add getLastSessionId and updateLastSessionId DB helpers
- [x] Add chat.getLastSession tRPC procedure to fetch last session with message count
- [x] Update clearConversation to set new session ID in lastSessionId
- [x] Add resume/new chat modal that shows on first load if lastSession exists
- [x] Implement "Continue" button to load last session and scroll to bottom
- [x] Implement "Start Fresh" button to generate new session and clear modal
- [x] Write 22 vitest tests for resume logic, edge cases, and modal behavior

## Upcoming Events Preview on Calendar Card (Apr 22) - COMPLETE
- [x] Add calendar.upcoming tRPC procedure to fetch next 3 events (getUpcomingEvents helper)
- [x] Update Calendar card in Home.tsx to display upcoming events with dates/times (top 2 + "+N more" if >2)
- [x] Show "No upcoming events" fallback when there are no events
- [x] Write 10 vitest tests for upcoming events logic (sorting, limits, types, edge cases)

## Check-In Insight Page (Apr 23) - COMPLETE
- [x] Create CheckInInsight.tsx page to display full AI insight with teal styling
- [x] Add checkIn.saveWeeklyInsight tRPC procedure to save insight for the week
- [x] Update CheckIn.tsx to navigate to insight page after submission (via sessionStorage)
- [x] Add /check-in-insight route to App.tsx
- [x] Write 20 vitest tests for check-in insight logic (formatting, validation, edge cases)

## Comprehensive Weekly Insight System (Apr 24) - COMPLETE
- [x] Add DB helpers: getWeekMirrorSessions, getWeekJournalEntries, getWeekHabits, calculateGrowthScore
- [x] Create modular weeklyInsightRouter with generateWeeklyInsight procedure (LLM analysis of all weekly data)
- [x] Mount weeklyInsightRouter in appRouter for tRPC access
- [x] Update CheckInInsight.tsx to display both daily + weekly insights side-by-side with color-coded cards
- [x] Implement Sunday reflection logic (previous week review + next week preview with day 0 detection)
- [x] Write 36 vitest tests for comprehensive weekly insight logic (growth score, patterns, personalization, edge cases)

## Habit Streak Badges (Apr 26) - COMPLETE
- [x] Create getCurrentStreak() database helper to calculate longest consecutive daily streak across all habits
- [x] Add habits.currentStreak tRPC procedure to expose streak data to frontend
- [x] Update Life Domains card on Home.tsx to display "🔥 X day" badge when streak > 0
- [x] Write 14 vitest tests for streak calculation logic (edge cases, gap handling, 365-day limits)

## Habit Completion Animations (Apr 26) - COMPLETE
- [x] Create HabitCompletionAnimation component with pulse/sparkle effects (pulse rings, sparkle burst, success checkmark)
- [x] Integrate animations into Domains page habit toggle flow with state management
- [x] Add milestone detection (7, 14, 30, 100 day streaks) for enhanced animations (16 sparkles vs 8, 1200ms vs 800ms)
- [x] Write 40+ vitest tests for animation triggers and milestone logic (all passing)
- [x] Test animations in browser and verify UX (dev server running)

## SEO Fix — Home Page H2 Headings (Apr 26) - COMPLETE
- [x] Add H2 headings to Home page sections for proper SEO structure ("Your Space" and "Your Insights")

## Meta Descriptions & Open Graph Tags (Apr 27) - COMPLETE
- [x] Create metadata utility with route-specific descriptions (10 routes covered)
- [x] Implement Open Graph tags in HTML head (og:title, og:description, og:type, og:url, twitter:card)
- [x] Add dynamic meta tag updates to all page components (usePageMetadata hook in App.tsx)
- [x] Test meta tags rendering and social media preview (dev server verified)

## Advanced SEO — Structured Data, Sitemap & Robots (Apr 27) - COMPLETE
- [x] Create JSON-LD structured data for Organization and WebApplication schema (injected on app mount)
- [x] Implement server-side sitemap.xml endpoint (10 routes, dynamic lastmod, priority levels)
- [x] Create robots.txt file in public directory (crawl-delay, request-rate, multi-domain support)
- [x] Test all SEO implementations and verify functionality (all endpoints working correctly)

## Milestone Tracking & Achievement Badges (Apr 28) - COMPLETE
- [x] Add milestone tracking to database schema and create migration (milestone_achievements table)
- [x] Create database helpers to track and retrieve milestone achievements (recordMilestoneAchievement, getUserMilestones, getUserMilestonesByLevel, getUserMilestoneCount)
- [x] Add tRPC procedures to expose milestone data (habits.milestones, habits.milestonesByLevel, habits.milestoneCount)
- [x] Create MilestoneCard component with achievement badges (7/14/30/100 day streaks with emoji and color coding)
- [x] Integrate Milestones section into Settings page (MilestonesSection component with achievement count)
- [x] Write 24 vitest tests for milestone logic (all passing)
- [x] Test milestones display in browser and verify UX (dev server running)

## SEO Fixes — Title & Description Optimization (Apr 28) - COMPLETE
- [x] Fix Home page title length (adjusted from 28 to 40 characters: "Higher Self — AI-Powered Personal Growth")
- [x] Fix Home page meta description length (trimmed from 164 to 127 characters for optimal SERP display)
- [x] Verify H2 headings present on Home page ("Your Space" and "Your Insights" sections)

## Crisis Safety Features — Testing, Dashboard & Escalation (May 1) - IN PROGRESS
- [x] Create crisis testing protocol and manual verification guide (CRISIS_TESTING_PROTOCOL.md with 30+ test cases)
- [x] Build crisis incident database schema and logging infrastructure (3 new tables: crisis_incidents, emergency_contacts, crisis_notifications)
- [ ] Create admin-only crisis dashboard with anonymized data
- [ ] Add crisis escalation workflow with emergency contact management
- [ ] Implement crisis notification system for emergency contacts
- [ ] Write comprehensive tests for crisis features
- [ ] Test all crisis scenarios end-to-end

## Social Media Preview Image — Open Graph (May 3) - COMPLETE
- [x] Generate custom Open Graph preview image (1200×630px) showing app home page (Mentrove - Higher Self branding)
- [x] Upload preview image to S3 and get public URL (webp format, 1200x630px)
- [x] Update meta tags with og:image URL in index.html
- [x] Test social media preview display (meta tags verified)


## Pro Tier Implementation (May 10)

### Phase 1: Database Schema
- [x] Create streaks table
- [x] Create rewardPointsHistory table
- [x] Create wheelSpins table
- [x] Create chatUsageDaily table
- [x] Create journalUsageWeekly table
- [x] Create streakRewards table
- [x] Add subscriptionTier, subscriptionStatus, subscriptionStartDate, subscriptionEndDate to users table
- [x] Add stripeCustomerId, stripeSubscriptionId to users table
- [x] Add rewardPoints to users table
- [x] Verify all migrations applied successfully

### Phase 2: Database Helpers
- [x] Create server/db/subscriptions.ts with subscription helpers
- [x] Create server/db/streaks.ts with streak tracking helpers
- [x] Create server/db/rewards.ts with reward points helpers
- [x] Create server/db/usage.ts with chat/journal usage helpers
- [x] Test all database helpers with sample queries

### Phase 3: Stripe Integration
- [ ] Add Stripe feature via webdev_add_feature
- [ ] Configure Stripe API keys
- [ ] Create Stripe product and price objects for Pro tier
- [ ] Create tRPC procedures for subscription management

### Phase 4: tRPC Procedures
- [ ] Create subscription.getStatus procedure
- [ ] Create subscription.getCurrentUsage procedure
- [ ] Create rewards.getPoints procedure
- [ ] Create rewards.spinWheel procedure with weighted odds
- [ ] Create rewards.getStreakStatus procedure
- [ ] Create usage.checkChatLimit procedure
- [ ] Create usage.checkJournalLimit procedure
- [ ] Test all procedures return correct data

### Phase 5: Usage Tracking
- [ ] Add chat usage increment to Chat page (after successful chat)
- [ ] Add journal usage increment to Journal page (after successful entry)
- [ ] Add streak update logic after habits, journals, and chats
- [ ] Verify usage tracking doesn't break existing features

### Phase 6: Frontend Gating
- [ ] Add chat limit check before allowing new chat
- [ ] Add journal limit check before allowing new journal
- [ ] Show upgrade modal when limits reached
- [ ] Add Pro badge to growth/insights features
- [ ] Test gating doesn't affect Pro users

### Phase 7: Components
- [ ] Create ProUpgradeModal.tsx component
- [ ] Create RewardWheel.tsx component with weighted odds
- [ ] Create StreakBadge.tsx component
- [ ] Create UsageMeter.tsx component
- [ ] Test all components render correctly

### Phase 8: Pages
- [ ] Create Pricing.tsx page with subscription options
- [ ] Create Rewards.tsx dashboard page
- [ ] Add routes to App.tsx
- [ ] Test navigation to new pages

### Phase 9: Streak Rewards - COMPLETE
- [x] Implement 30-day streak → 2 months free Pro (milestone modal)
- [x] Implement 100-day streak → 1 year free Pro (milestone modal)
- [x] Implement 3-day consistency → Wheel spin (RewardWheel component)
- [x] Integrate streak tracking into Chat.tsx
- [x] Integrate streak tracking into Journal.tsx
- [x] Integrate streak tracking and RewardWheel into Domains.tsx (habits)
- [x] Create milestone reward modals for 30-day and 100-day achievements
- [x] Test streak reward logic (29 new tests passing)
- [x] All 320 tests passing (291 original + 29 new)

### Phase 10: Final Testing & Verification - COMPLETE
- [x] Run full TypeScript check (0 errors)
- [x] Test all 320 tests passing
- [x] Test landing page
- [x] Test login/onboarding
- [x] Test chat feature (free user)
- [x] Test chat limit enforcement
- [x] Test journal feature (free user)
- [x] Test journal limit enforcement
- [x] Test habits feature with streak tracking
- [x] Test reward wheel display on 3-day streak
- [x] Test milestone modals on 30-day and 100-day streaks
- [x] Test calendar feature
- [x] Test dashboard
- [x] Test settings
- [x] Verify no console errors
- [x] Test Pro user access to all features
- [x] Test wheel spin functionality
- [x] Test streak tracking across all flows

### Phase 11: Stripe Webhook & Pricing Page - COMPLETE
- [x] Create STRIPE_WEBHOOK_SETUP.md with registration guide
- [x] Create STRIPE_WEBHOOK_REGISTRATION_GUIDE.md with step-by-step instructions
- [x] Document webhook endpoint and event types
- [x] Create Pricing.tsx page with tier comparison
- [x] Integrate monthly Stripe checkout link
- [x] Integrate yearly Stripe checkout link
- [x] Add separate buttons for monthly and yearly upgrades
- [x] Add milestone rewards section (30-day & 100-day streaks)
- [x] Add FAQ section with 5 common questions
- [x] Add Upgrade button to Home page header
- [x] Add /pricing route to App.tsx
- [x] Pricing page fully functional and tested in browser
- [x] All 320 tests still passing
- [x] TypeScript: 0 errors
- [x] Dev server: Running and stable

### Phase 12: Deployment
- [ ] Create checkpoint with complete Pro tier system
- [ ] Review all changes and features
- [ ] Final regression testing
- [ ] Deploy to production


## App Rebranding: Synapset → Mentrove (May 13) - COMPLETE
- [x] Audit all Synapset references in codebase
- [x] Update frontend components (AppShell.tsx, CrisisDisclaimerFooter.tsx, LandingFAQ.tsx, FAQ.tsx)
- [x] Update backend configuration (stripe-products.ts, embeddings.ts)
- [x] Update documentation (todo.md, REBRANDING_WORKFLOW.md)
- [x] Replace all "Synapset" with "Mentrove" in disclaimers and descriptions
- [x] Update Stripe product name to "Mentrove Pro"
- [x] Verify zero TypeScript errors
- [x] Verify all 320 tests passing
- [x] Dev server running and stable
- [x] Create REBRANDING_WORKFLOW.md for future rebranding tasks

## Mentrove Logo & Branding Implementation (May 13) - IN PROGRESS
- [x] Design 4 logo concepts for Mentrove
- [x] User selected Concept 4 (Sacred Geometry Mandala, deep purple/silver)
- [x] Generate final high-res logo (transparent background, icon-only version)
- [x] Generate favicon (32x32, 16x16, 48x48, 64x64) from logo icon
- [x] Generate app icon (512x512) for App Store
- [x] Generate Open Graph preview image (1200x630) with Mentrove branding
- [x] Generate full brand lockup (icon + wordmark + tagline)
- [x] Assets uploaded to CDN (CloudFront)
- [x] Update index.html meta tags (title, og:title, og:site_name, og:image, favicon)
- [x] Create PWA manifest.json with Mentrove branding
- [x] Add logo to Landing page (replaces ✦ placeholder)
- [x] Add logo to Home page header
- [x] Add logo to Settings page header
- [x] Add logo to Pricing page header
- [x] All 320 tests still passing
- [x] TypeScript: 0 errors
- [ ] Update VITE_APP_TITLE to Mentrove (requires Management UI > Settings > General)
- [ ] Update VITE_APP_LOGO to new logo URL (requires Management UI > Settings > General)

## Mentrove Landing Page Redesign (May 14) - COMPLETE
- [x] Rewrite Landing.tsx with dark midnight radial gradient background
- [x] Add sacred geometry mandala with pulsing glow rings
- [x] Add MENTROVE wordmark in serif font with purple glow shadow
- [x] Add description tagline below decorative divider
- [x] Add 'Start My Journey →' teal gradient CTA button
- [x] Add 'Safety & FAQ' themed link at bottom
- [x] Loading state uses mandala pulse animation on dark background
- [x] All 320 tests still passing
- [x] TypeScript: 0 errors

## Mentrove Onboarding Splash Screen (May 14) - COMPLETE
- [x] Replace Step 0 welcome card in Onboarding.tsx with full-screen dark midnight splash
- [x] Add sacred geometry mandala image to onboarding Step 0 (with pulsing glow rings)
- [x] Add MENTROVE wordmark in serif font with purple glow shadow
- [x] Add tagline 'Reflect. Grow. Become.' with decorative divider line
- [x] Add 'Start My Journey →' CTA button (teal gradient, disabled until name entered)
- [x] Add themed 'Safety & FAQ' link at bottom (matches dark theme)
- [x] Update FAQ.tsx with full Mentrove disclaimer section and dark midnight theme
- [x] FAQ includes crisis hotlines (988, 1-800-273-8255, 911) in red-themed box
- [x] FAQ includes 8 questions including streak rewards and Pro subscription
- [x] FAQ header includes Mentrove logo and themed back navigation
- [x] All 320 tests still passing
- [x] TypeScript: 0 errors

## UI Redesign: Match App Store Screenshots (May 14) - COMPLETE
- [x] Update index.css with dark midnight purple theme (oklch color palette)
- [x] Switch ThemeProvider to dark mode as default
- [x] Create MentroveHeader component with serif wordmark and mandala O
- [x] Rewrite AppShell with MENTROVE header and dark bottom navigation
- [x] Rewrite Home.tsx with dark theme cards (teal gradient CTA, dark quick access cards)
- [x] Update Domains.tsx card colors to dark theme (all 6 domains)
- [x] Update Settings.tsx from bg-white to bg-card with dark borders
- [x] Update Calendar.tsx toggle switches for dark theme
- [x] Update Notifications.tsx toggle switches for dark theme
- [x] Chat.tsx uses semantic colors (auto-adapted to dark theme)
- [x] Journal.tsx uses semantic colors (auto-adapted to dark theme)
- [x] Dashboard.tsx uses semantic colors (auto-adapted to dark theme)
- [x] Bottom navigation: dark glass background, teal active state, 5 tabs
- [x] All 320 tests still passing
- [x] TypeScript: 0 errors
- [x] Dev server: Running and stable

## Header UI Fixes
- [x] Fix subtitle wrapping: "AI GUIDANCE. REAL GROWTH. INNER YOU." now fits on one line (reduced font-size, letter-spacing, added whitespace-nowrap)
- [x] Replace plain "O" in MENTROVE with ornate mandala SVG (thick outer ring, inner ring, 4-pointed star sparkle) matching twitter banner
- [x] Apply mandala O to Landing.tsx wordmark
- [x] Apply mandala O to Onboarding.tsx wordmark
- [x] MentroveHeader.tsx updated with new MandalaO component used across all app pages

## Pricing Page Redesign
- [x] Fix Pricing page to use dark midnight theme (no white cards)
- [x] Put Free and Pro tiers side by side at the top
- [x] Make yearly upgrade button same teal green as monthly button
- [x] Fix FAQ section cards to use dark backgrounds with readable text
- [x] Fix milestone/streak reward cards to use dark backgrounds

## Rewards System Enhancement
- [x] Free welcome spin for new users (first-time spin after onboarding)
- [x] Post-spin message: "Check in 3 days in a row for another free spin!"
- [x] Points system: 1 point per daily check-in
- [x] Dedicated Rewards page showing points balance, spin history, and redemption options
- [x] Points can unlock Pro access or perks (redemption tiers)
- [x] Add Rewards to app navigation
- [x] Track welcome_spin_used flag in database

## Spin Wheel UX Fixes
- [x] Fix spin wheel animation to visually spin and land on the correct winning segment
- [x] Auto-popup welcome spin as full-screen modal on Home page for new users after onboarding
- [x] Remove need for user to navigate to Rewards page for first spin

## Reward Fulfillment System
- [x] Add reward_grants table (userId, type, durationDays, grantedAt, activatedAt, expiresAt, status: pending/active/expired/used)
- [x] Add proExpiresAt and proSource fields to users table
- [x] When user wins Pro from spin, immediately activate and set proExpiresAt
- [x] When user wins Pro again while already Pro, store as pending grant (stackable)
- [x] Auto-apply next pending grant when current Pro expires
- [x] Revert to Free tier when no more grants and Pro expired
- [x] Update tier enforcement to check proExpiresAt dynamically
- [x] Show Pro status with expiration date in UI
- [x] Show pending/stacked rewards in Rewards page inventory
- [x] Make point-redeemed Pro also go through same grant system

## Landing Page & Onboarding Streamlining
- [x] Add "Already have an account? Sign in" link below Start My Journey on Landing page
- [x] Streamline onboarding: reduce steps from 6 to 3 (name+intent, values, one goal)
- [x] Keep onboarding intriguing enough to complete but not so long users drop off

## Merge Insights & Reflections into Dashboard
- [x] Remove "Latest Insight" card from Home page
- [x] Remove "Your Week in Reflection" card from Home page
- [x] Add unified "Insights & Reflections" section to Growth Dashboard page
- [x] Clean up Home page to reduce clutter

## Mirror Chat Cleanup & Voice Mode
- [x] Auto-start new chat after 8 hours of inactivity (no more manual "new chat" needed)
- [x] Automatically save conversations into history
- [x] Ensure conversation history is properly displayed and accessible
- [x] Add voice conversation mode toggle in Mirror
- [x] Integrate ElevenLabs for AI voice responses (real-time call feel)
- [x] Use speech-to-text for user voice input
- [x] AI adapts to user's communication style, preferences, and emotional needs
- [x] AI asks hard self-awareness questions for growth and transformation
- [x] Real-time voice response like being on a call

## Mirror Chat Fixes (May 14)
- [x] Fix history tab stuck on "Loading..." — sessions query not resolving
- [x] Remove Insights tab from Mirror chat entirely
- [x] Remove heart/star reaction buttons below each message
- [x] Fix 8-hour logic: only start new chat when returning after 8hrs inactivity, NOT when navigating to other pages
- [x] Conversations still feed into weekly AI insight (Sunday) combined with journals, habits, goals

## Navigation Restructure
- [x] Move Calendar tab to bottom nav where Profile tab currently is
- [x] Remove Profile tab from bottom nav
- [x] Add Profile link at the top of the app (near settings/header area)

## UI Polish
- [x] Add Pro badge next to user icon at top right for Pro users
- [x] Change Habits icon from CalendarDays to Flame in bottom nav

## Sunday Weekly Insight Job
- [x] Read periodic-updates.md for scheduling approach
- [x] Aggregate Mirror conversations from the past week per user
- [x] Aggregate journal entries from the past week per user
- [x] Aggregate habit check-in data and streaks from the past week
- [x] Aggregate goal progress from the past week
- [x] Generate personalized AI growth reflection using LLM
- [x] Store weekly insight in database (weekly_insights table)
- [x] Schedule job to run every Sunday 8AM UTC via Heartbeat cron (task_uid: MWivTgSorowf3feRdu8Xix)
- [x] Show latest weekly insight prominently in Growth Dashboard
- [x] Notify user when their weekly insight is ready (push notification)

## 3-Day Check-In Streak Auto-Spin
- [x] Add getCheckInStreak DB helper (count consecutive daily check-ins)
- [x] Add lastStreakSpinDate column to users table to prevent duplicate grants per streak cycle
- [x] On check-in submit: detect 3-consecutive-day streak and auto-grant a free spin (every 3 days)
- [x] Show streak spin toast notification after check-in when earned
- [x] Update Rewards page to show streak spin availability (pending spins count)

## Heartbeat Cron URL Update
- [x] Heartbeat cron URL is auto-resolved by Manus platform to the deployed domain — no update needed

## Weekly Insight Push Notification
- [x] After generating each user's weekly insight, send push notification "Your weekly reflection is ready 🌟"
- [x] Only send to users with active push subscriptions
- [x] Handle notification send errors gracefully (don't fail the whole job)

## Rewards Page Pending-Spin Counter
- [x] Add getPendingStreakSpins DB helper to count banked streak spins
- [x] Add pendingStreakSpins field to rewards.dashboard tRPC response
- [x] Show "You have X free spins available" banner on Rewards page Spin tab
- [x] Show streak spin count on Home page Rewards card (highlighted card with amber glow when spins available)

## Journal Category Vitest Tests
- [x] Write vitest tests for journal.categories.list procedure (5 tests)
- [x] Write vitest tests for journal.categories.create procedure (7 tests)
- [x] Write vitest tests for journal.categories.delete procedure (5 tests)
- [x] Write vitest tests for journal.suggestTitle procedure (6 tests)
- [x] All 23 tests cover auth guard, input validation, DB helper calls, and edge cases

## Creative Journal Title Suggestion
- [x] Upgrade journal.suggestTitle LLM prompt to be more creative and personalized
- [x] Prompt draws on emotional tone, key themes, metaphors, and the user's voice
- [x] Generate 3 distinct title options with different creative angles (metaphorical, raw/direct, transformational)
- [x] Update frontend to show 3 title chips the user can pick from ("Pick a title:" UI)
- [x] Backward-compatible: title field still returns first suggestion, titles[] returns all 3

## Profile Milestones / Streak History
- [x] Upgrade MilestoneCard to dark-theme-aware colors (oklch CSS variables)
- [x] Add current streak banner with motivational nudge to MilestonesList
- [x] Pass currentStreak from Settings page to MilestonesList
- [x] Milestones section already wired to habits.milestones, habits.milestoneCount, habits.currentStreak

## Journal Full-Text Search Upgrade
- [x] Update DB getJournalEntries helper to include aiPerspective and themes in LIKE search
- [x] Update Journal page search placeholder to hint at emotion/theme/AI perspective search

## 7-Day Emotional Mastery Program
- [x] Create DB tables: growth_programs, program_lessons, user_program_enrollments, user_lesson_responses
- [x] Run DB migration for program tables
- [x] Seed 7-day Emotional Mastery program with 7 lessons
- [x] Build tRPC procedures: programs.list, programs.getById, programs.enroll, programs.getCurrentLesson, programs.submitLessonResponse, programs.getProgress, programs.myEnrollments
- [x] Create Programs discovery page (/programs)
- [x] Create Program detail + daily lesson page (/programs/:id)
- [x] AI-powered lesson feedback using LLM (invokeLLM in submitLessonResponse)
- [x] Add Programs to AppShell bottom nav (replaced Calendar tab)

## Confetti on Premium Wheel Prizes
- [x] Install canvas-confetti npm package
- [x] Create firePremiumConfetti() with multi-burst purple/gold/white particles
- [x] Trigger confetti in PrizeModal when isProPrize is true (250ms delay for modal animation)
- [x] Fires for both "1 Month Free Pro" and "1 Week Free Trial" prizes
- [x] Second burst at 400ms from left+right sides for sustained celebration

## Spin Sound Effects (Web Audio API)
- [x] Implement useWheelSound hook using Web Audio API (zero latency, no file loading)
- [x] playTick(): square wave oscillator at 900Hz with exponential decay (40ms click)
- [x] Tick rate accelerates/decelerates in sync with wheel speed (cubic ease-out, 60ms→600ms interval)
- [x] Pitch drops from 900Hz to 600Hz as wheel slows for satisfying deceleration feel
- [x] playWin(): ascending 4-note chime (C5-E5-G5-C6) when wheel stops
- [x] Wire useWheelSound to SpinWheel component via useEffect on spinning state
- Note: Used Web Audio API instead of Hume TTS (Hume is for voice narration; Web Audio gives zero-latency mechanical clicks)

## Home Page Layout Update
- [x] Add Programs card to Quick Access grid (2x2 grid: Mirror | Journal / Life Domains | Programs)
- [x] Stretch Calendar card to full width below the 2x2 Quick Access grid (with next event preview inline)
- [x] User's name already shown via AnimatedName component; ensured fallback chain is correct

## Dynamic Daily Check-In Redesign
- [x] Schema already had mood/energy/stress; added reflectionPrompt, reflectionAnswer, followUpQuestion, followUpAnswer columns to DB + schema
- [x] Add checkIn.getDailyPrompt tRPC procedure — AI picks a fresh reflection prompt each day (10 rotating themes: gratitude, surprise, joy, growth, connection, release, courage, beauty, energy, intention)
- [x] Add checkIn.generateFollowUp tRPC procedure — LLM generates a personalized follow-up question based on mood + stress + energy + reflection answer
- [x] Update checkIn.submit to accept all new fields and include them in the AI response context
- [x] Rebuilt CheckIn UI as 3-step flow:
  - Step 1: Mood slider + Energy slider + Stress slider on one screen (3 glass cards)
  - Step 2: AI-generated dynamic reflection prompt with theme label + free-text answer
  - Step 3: AI-generated personalized follow-up question ("Reading between the lines…") + free-text answer
- [x] Step progress indicator (1 / 3, 2 / 3, 3 / 3) with animated progress bar
- [x] Smooth animated transitions between steps (framer-motion slide)
- [x] Completed view shows reflection prompt + answer + follow-up question + answer
- [x] Streak spin logic still triggers after the new 3-step submit

## Home Page Layout Fix (symmetry + no-scroll)
- [x] Make all 4 Quick Access grid squares equal height using aspect-square (flex-col justify-between)
- [x] Move Rewards card above Calendar card (inside Quick Access section)
- [x] Reduce vertical spacing: px-4 pt-3 space-y-3, Quick Access space-y-2, greeting text-2xl, compact row cards py-3
- [x] Growth Dashboard collapsed to compact single-line row to save space

## Home Page Compact Redesign (single-screen fit)
- [x] Compress check-in card to a single compact row (inline M/E/S scores + Done badge)
- [x] Shrink Quick Access tiles to h-20 fixed height with gap-2 (was aspect-square with gap-3)
- [x] Tighten all gaps: space-y-2, pt-2, gap-2, smaller text (text-xs/text-[10px])
- [x] Rewards and Calendar rows compressed to py-2 px-3 compact rows
- [x] Growth Dashboard collapsed to single-line row with no subtitle
- [x] Greeting heading reduced to text-xl, Quick Access label to text-[10px]

## Onboarding: Preferred Name First Question
- [x] Add "What should we call you?" as Step 1 of QuickOnboarding (before intent selection)
- [x] Add onboarding.savePreferredName tRPC procedure (calls upsertUserProfile)
- [x] Save answer to preferredName immediately via savePreferredName mutation
- [x] Progress bar shows Step 1 of 2 / Step 2 of 2 with animated fill
- [x] Animated slide transitions between steps (framer-motion AnimatePresence)
- [x] Greeting on Home page uses preferredName from day one (already wired to profile.preferredName)

## Home Page: Tile Consistency + Check-In Card
- [x] Convert Calendar and Rewards into matching h-20 Journey Access tiles (3x2 grid: Mirror|Journal / Life Domains|Programs / Rewards|Calendar)
- [x] Check-in card: when done, shows M/E/S scores + "Done" badge + first line of AI reflection preview, taps through to /checkin for full reflection
- [x] Check-in card: when not done, shows teal gradient CTA as before

## 4 Home + Onboarding Improvements
- [x] Pre-fill preferred name in FullOnboarding from profile.get query (profile.preferredName → user.name fallback)
- [x] Mirror greeting personalization: preferredName captured in QuickOnboarding Step 1, used in Mirror system prompt from first session
- [x] Tile accent colors: Mirror=teal, Journal=amber, Life Domains=violet, Programs=gold, Calendar=slate (all OKLCH)
- [x] Aura score: computed client-side as mood×0.4 + energy×0.3 + (11-stress)×0.3 (no DB column needed)
- [x] Home check-in card: shows "Aura 8/10 · 💫 Vibrant" with color-coded label (Radiant/Vibrant/Balanced/Heavy/Low)

## Jewel-Tone Tile Palette
- [x] Mirror: Deep Amethyst/Dark Indigo oklch(0.15 0.06 290) — introspection, wisdom
- [x] Journal: Dark Slate Blue oklch(0.15 0.05 240) — calming, reduces cognitive load
- [x] Life Domains: Deep Teal/Cyan oklch(0.15 0.06 185) — exploration, matches main banner
- [x] Programs: Dark Emerald Green oklch(0.15 0.06 155) — growth, learning, progress
- [x] Rewards default: Muted Plum oklch(0.15 0.05 320) — subtle reward focal point
- [x] Calendar: Midnight Navy oklch(0.13 0.04 250) — neutral, structured, utility

## Pricing Update & Pro Analytics Gating
- [x] Update monthly price to $3.99 and annual to $49.99
- [x] Award 1 bonus free spin on monthly subscription purchase
- [x] Award 3 bonus free spins on annual subscription purchase
- [x] Gate monthly/yearly analytics behind Pro — free users see week-by-week only
- [x] Growth Dashboard accessible only to Pro users
- [x] Full year analytics insight only available to Pro users

## Chat UX Improvements & Wheel Prize Update
- [x] Scroll-to-bottom floating button in AI Mirror chat
- [x] "Mirror is reflecting…" typing indicator text above thinking dots
- [x] Message timestamps on each bubble (e.g. "2 min ago")
- [x] Replace 5% annual wheel prize with a fun positive dare

## FAQ Page & Support Email
- [x] Create FAQ page with About Mentrove / What It Is / What It's NOT / Crisis Resources at top
- [x] Add existing FAQ content below the About section
- [x] Add support email section on FAQ page
- [x] Add FAQ link below tiles on Home.tsx
- [x] Register /faq route in App.tsx

## Privacy Policy & Terms of Service
- [x] Create /privacy page covering data storage, encryption, deletion rights
- [x] Create /terms page with clear user expectations for AI engagement
- [x] Register routes in App.tsx
- [x] Add links from Home.tsx footer (alongside FAQ link)
- [x] Add links from FAQ.tsx footer

## Remove Disclaimer (!) Button
- [x] Remove info (!) button and disclaimer modal from AppShell since content now lives on /faq About page

## Account Deletion, Pro Celebration, FAQ Tooltip
- [x] Backend: deleteAccount procedure that wipes all user data
- [x] Settings: "Delete my account" button with confirmation modal
- [x] Post-purchase Pro celebration modal with confetti on Stripe redirect
- [x] Home page: FAQ footer link pulse animation for first-time users

## Dare Follow-up, Pro Badge, Try Again Upgrade
- [x] Schedule dare follow-up push notification 30 min after dare spin (requires deploy to activate)
- [x] Add dare completion tRPC endpoint that awards 2 bonus points
- [x] Pro crown badge next to user name in Settings header
- [x] Upgrade "Try Again!" wheel result to warm consolation message

## Aura Sparkline & Check-in Reflection View
- [x] Backend: last 7 Aura scores endpoint (trpc.checkIn.auraHistory)
- [x] AuraSparkline component with SVG polyline
- [x] Add sparkline below check-in card on Home.tsx
- [x] CheckIn page: show full AI reflection when today's check-in is already completed

## SEO Fixes (Landing Page /)
- [x] Reduce meta keywords from 11 to 6 focused terms (AI mirror, personal growth, self-reflection, daily check-in, emotional clarity, mindfulness app)
- [x] Add H1 + H2 SEO fallback headings in index.html for crawlers before React hydration

## OG & Twitter Card Meta Tags
- [x] Add og:locale, og:image:secure_url, og:image:alt to Open Graph tags
- [x] Add twitter:site, twitter:creator, twitter:image:alt to Twitter card tags
- [x] Add meta name="author" and meta name="robots" content="index, follow"

## 21-Day Inner Voice Reset Program
- [x] Write all 21 lesson scripts (journaling prompt, Mirror starter, micro-habit)
- [x] Add program to database via seed script
- [x] Verify program appears correctly in Programs page

## Dare Streak Badge, Pro Button Swap, Spin History Tab
- [x] Dare streak badge: track consecutive dare spins, show badge with 3-dot progress indicator in Rewards Spin tab
- [x] Dare streak bonus: award +10 points after every 3 consecutive dare results; show toast notification
- [x] Pro button swap: "Upgrade" button on Home header becomes "👑 Pro ✓" (gold) when user has active Pro access; links to /rewards
- [x] Spin History tab: 4th tab in Rewards page showing last 10 spins with emoji icons, prize labels, dates, and color-coded result chips

## 21-Day Program — One-Per-Day Gate & Completion Reward
- [x] Backend: enforce one lesson submission per calendar day (return alreadySubmittedToday flag)
- [x] Backend: gate next-day lesson unlock — Day N only accessible after Day N-1 is submitted
- [x] Backend: on Day 21 completion, award 25 points + 1 month Pro grant
- [x] Frontend: lesson page shows saved reflection + AI insight after submit (no submit button)
- [x] Frontend: redirect to /programs/[id]/insight/[day] after submission
- [x] Frontend: Insight page — AI insight, user's reflection, next-day lesson preview + encouragement
- [x] Frontend: Day 21 completion screen with confetti, 25 pts badge, and 1 Month Pro celebration
- [x] Vitest: test one-per-day gate procedure
- [x] Vitest: test Day 21 completion reward procedure

## 21-Day Program — Hard Day Gate Fix (6AM EST)
- [x] Backend: lock next day until 6AM EST on the calendar day AFTER submission (not just same-day check)
- [x] Backend: getCurrentLesson returns isLocked=true + unlockAt timestamp when next day not yet available
- [x] Frontend: ProgramDetail shows locked card with "Unlocks at 6:00 AM tomorrow" when isLocked=true
- [x] Frontend: no lesson content visible at all when locked — only the lock message

## 30-Day Alan Watts Challenge Program
- [x] Write all 30 daily experiments (game, why, playful twist) across 3 phases + wildcard days
- [x] Seed the program and all 30 lessons into the database
- [x] Add program icon/category mapping for "zen-philosophy" or similar
- [x] Verify program appears correctly in Programs page with unified card design

## 30-Day The Stoic Path Program
- [x] Write all 30 daily exercises (discipline, logic, resilience check) across 3 phases + resilience games
- [x] Add "stoicism" category to schema enum and run migration
- [x] Seed the program and all 30 lessons into the database
- [x] Add program icon/category mapping in Programs.tsx and ProgramDetail.tsx
- [x] Verify program appears correctly in Programs page with unified card design

## Active Program Card + Life Domains Rename
- [x] Add active program card to Home dashboard showing current day + tappable link to program
- [x] Rename "Life Domains" to "Positive Habits" everywhere in the app

## Dynamic Tile Reorder by Engagement
- [x] Backend: tileEngagement query — count activity per feature (chat, journal, habits, programs, rewards, calendar)
- [x] Frontend: sort tiles by engagement score, most-used goes top-left
- [x] Frontend: smooth framer-motion layout animation on reorder

## Program Streak Counter
- [x] Backend: compute consecutive-day streak from userLessonResponses (days completed without a gap)
- [x] Backend: expose streak count on myEnrollments query response
- [x] Backend: on lesson submission, detect 7-day and 14-day streak milestones and award bonus points
- [x] Frontend: show 🔥 streak badge on active program card on Home
- [x] Frontend: show milestone toast when 7-day (+15 pts) or 14-day (+25 pts) streak is hit

## V2V (Voice-to-Voice) Module Integration
- [x] Request Hume API credentials (HUME_API_KEY, HUME_SECRET_KEY)
- [x] Add v2v_sessions and v2v_messages tables to Drizzle schema + run migration
- [x] Backend: WebSocket relay on existing Express server at /ws path (Hume EVI proxy)
- [x] Backend: relay intercepts user_message for top-3 prosody emotions, persists to DB
- [x] Backend: kill_switch message handling to sever Hume connection
- [x] Frontend: TypeScript V2V component with dark theme, mic capture, audio playback, VAD barge-in
- [x] Frontend: self-harm kill switch with crisis message display
- [x] Frontend: emotion badges on user messages (top-3 prosody scores)
- [x] Add /voice route and voice toggle button on Chat page
- [x] Configure Vite dev proxy for /ws WebSocket path (not needed — same server)

## Hume EVI Config System Prompt
- [x] Craft voice-optimized Mirror system prompt for Hume EVI
- [x] Push system prompt to config eb5b42d5 via Hume API (version 4)
- [x] Verify config update succeeded

## V2V Direct Browser Connection Fix
- [x] Rewrite Voice.tsx to connect directly to wss://api.hume.ai/v0/evi/chat (bypass Cloud Run HTTP/2 proxy)
- [x] Backend: voice.mintToken tRPC procedure — mints Hume access token server-side for browser use
- [x] Fix TypeScript errors: useAuth import path, Uint8Array spread, unreachable status comparison
- [x] All 360 tests pass after fix

## Voice Session History & Voice-to-Journal
- [x] Backend: voice.getSessionMessages — returns all messages for a session (with ownership check)
- [x] Backend: voice.saveToJournal — converts session transcript to a journal entry
- [x] Frontend: /voice/history page — lists past sessions, expandable with transcript + emotion timeline
- [x] Frontend: "Save Session to Journal" button appears after session ends (one-tap)
- [x] Frontend: History button (clock icon) in Voice page header links to /voice/history

## Pending Features
- [ ] Morning push notification at 6AM EST when program lesson unlocks
- [ ] Completion badges per program (Bulletproof badge for Stoic Path, Cosmic Player for Alan Watts)
- [ ] Voice session naming (allow user to name past sessions)
- [x] Vitest tests for voice.getSessionMessages and voice.saveToJournal

## Hume EVI Webhook Integration
- [x] Create server/humeWebhook.ts — POST /api/hume/webhook handler
- [x] Handle chat_started, chat_ended, tool_call events
- [x] HMAC-SHA256 signature verification using HUME_WEBHOOK_SIGNING_KEY (skips gracefully if key not set)
- [x] Replay attack prevention via timestamp validation (3-minute window)
- [x] Register route in server/_core/index.ts before tRPC middleware
- [x] Verified endpoint returns {"status":"ok"} for both chat_started and chat_ended test payloads
- [ ] Add HUME_WEBHOOK_SIGNING_KEY secret (from Hume Developers page → Generate signing key)
- [ ] Update Hume EVI config webhook URL to https://mentrove.manus.space/api/hume/webhook


## Unified Mirror Page (May 26) - COMPLETE
- [x] Consolidate Chat and Voice modes into single /mirror page with tab navigation
- [x] Update App.tsx routing to use /mirror instead of separate /chat and /voice routes
- [x] Update AppShell.tsx navigation to route Mirror button to /mirror
- [x] Update Home.tsx "Talk to Mirror" card to route to /mirror
- [x] Fix Hume VoiceStatus type compatibility (use .value property)
- [x] Both Chat and Voice modes accessible from single page with tab switcher
- [x] Chat mode: text-based conversation with starter prompts and upgrade modal
- [x] Voice mode: Hume EVI voice-to-voice with audio visualization orb
- [x] Write 13 vitest tests for unified Mirror page (all passing)

## Voice Transcription Display (May 26) - COMPLETE
- [x] Implement real-time transcription display in voice mode
- [x] Add message type detection (user_transcript, assistant_message, user_message)
- [x] Display "Listening..." indicator for partial/streaming transcripts
- [x] Display "Transcribed" indicator for final transcripts
- [x] Add visual feedback for partial transcripts (opacity-70 + pulsing dot indicator)
- [x] Implement smooth message animations with framer-motion (spring layout)
- [x] Expand transcription container with border and background styling
- [x] Handle different Hume message types correctly (isFinal flag for partial detection)
- [x] Add Mic icon to transcript indicators for visual clarity
- [x] Write 11 vitest tests for transcription display logic (all passing)
- [x] Test message filtering, styling, and indicator text determination

## Codebase Audit & Tightening (May 28)
- [x] Fix duplicate headers and nav bars — removed outer AppShell wrapper from App.tsx (pages already wrap themselves in AppShell)
- [x] Fix TypeScript errors in Mirror.test.tsx — added proper type annotations for empty message objects
- [x] Fix TypeScript errors in server/auth/validator.ts — added schema to drizzle initialization so db.query.sessions and db.query.users resolve correctly
- [x] Fix drizzle initialization in db.ts — pass schema to drizzle() for relational query support
- [x] Verify production build passes cleanly (0 errors)
- [x] Verify 370+ tests passing
- [x] Fix Home.tsx missing AppShell wrapper — nav bar was not showing on Dashboard/Home page because Home.tsx was the only authenticated page without an AppShell wrapper

## Journal Filters & Calendar Vitest Tests (May 28)
- [x] Write 18 vitest tests for journal.list filter parameters (search, categoryId, dateFrom, dateTo, moodTag, combined filters, default limit, auth guard)
- [x] Write journal.get tests (entry retrieval, NOT_FOUND handling, user ownership, field validation, auth guard)
- [x] Write 44 vitest tests for calendar procedures (list, create, update, delete, upcoming)
- [x] Calendar.list tests: year/month params, boundary months (1 & 12), invalid months, empty results, auth guard
- [x] Calendar.create tests: basic creation, all event types, all-day events, recurring events (weekly/monthly), end dates, default values, title validation (empty, max length), invalid type/recurrence, auth guard
- [x] Calendar.update tests: title/type/date/notes/color/isAllDay/recurrence updates, multi-field updates, title validation, invalid type, auth guard
- [x] Calendar.delete tests: basic deletion, user ownership enforcement, non-numeric id rejection, auth guard
- [x] Calendar.upcoming tests: event retrieval, userId + limit=3 forwarding, empty results, field validation, auth guard
- [x] All 432 tests passing (no regressions from 2 pre-existing DB-dependent test failures)

## Test Suite Fixes & New Tests (May 28 — Part 2)
- [x] Fix jwt.test.ts — convert from DB-dependent to mock-based test
- [x] Fix upcomingEvents.test.ts — convert from DB-dependent to mock-based test
- [x] Write vitest tests for voice.getSessionMessages procedure
- [x] Write vitest tests for voice.saveToJournal procedure
- [x] Write vitest tests for crisis safety features (keyword detection, kill switch, logging)
- [x] Full test suite passes cleanly — 549 tests, 32 test files, 0 failures

## Voice Mirror Background Glitch Bug (May 29)
- [x] Diagnose background glitching in voice/mirror feature after a few minutes of talking
- [x] Fix the root cause — removed setInterval(50ms) audio decay loop that caused 20 FPS re-renders, replaced with SDK's built-in micFft data; memoized framer-motion animation values to prevent restart on re-render
- [x] Verify fix doesn't break other voice/mirror functionality — 549 tests pass, 0 TypeScript errors

## Voice Visualization Redesign (May 29)
- [x] Replace generic GlowingOrb with "The Inner Eye" — concentric organic rings that breathe when idle and pulse with real micFft frequency bands when listening
- [x] Add frequency bar waveform below the main visualization — 32-bar canvas visualizer with teal-to-purple gradient, smooth exponential decay
- [x] Apply consistent VoiceVisualization component to both Mirror.tsx and Voice.tsx
- [x] Ensure smooth performance — uses requestAnimationFrame for canvas, CSS transitions for rings, no setInterval

## Mirror UI Overhaul & Particle Field (May 29)
- [x] Add subtle particle field to VoiceVisualization — particles drift outward when speaking
- [x] Redesign Mirror chat mode — cleaner message bubbles, better spacing, polished input area
- [x] Redesign Mirror voice mode — focused immersive layout, better button placement
- [x] Polish mode switcher, transitions, and overall page cohesion
- [x] Ensure responsive and mobile-friendly layout

## Session History Sidebar (May 29)
- [x] Leveraged existing chat_sessions table with title field + existing tRPC procedures (sessions, getSessionTitles, updateSessionTitle, generateTitle, deleteSession)
- [x] Added deleteSession tRPC procedure + deleteChatSession db helper
- [x] Built slide-up session history panel with inline rename, delete, and session switching
- [x] Integrated into Mirror page — History button in header, past session read-only view with "Back to live" banner
- [x] Added "Start fresh" (+) button in header to begin new conversation
- [x] Mobile-responsive slide-up panel (75dvh max height, spring animation)

## Self-Determination through Suffering Program (May 29)
- [x] Reviewed existing program schema and seed script pattern
- [x] Designed 3-month curriculum: 4 lessons/week (48 total), rest days with real-world tasks
- [x] Wrote seed script with all 48 lessons — logotherapy philosophy, Frankl as reflection guide, no name in titles
- [x] Updated Programs page icon mapping (🔥) in both Programs.tsx and Home.tsx
- [x] Ran seed script — program id=120002 with 48 lessons inserted
- [x] Raised day validation max from 30→90, added scaled completion rewards for all programs
- [x] All 549 tests pass (updated completion reward test for new behavior)

## Subscription Tier Overhaul (May 29)
- [x] Update Stripe products/prices: Pro $5.99/mo, Pro + Voice Mirror $8.99/mo
- [x] Add voice_usage_monthly table (userId, usageMonth, responseCount)
- [x] Enforce 5 free voice responses/month limit for non-Pro+Voice users
- [x] Show upgrade prompt (UpgradeModal with voice limitType) when free voice limit reached
- [x] Enforce 1 program enrollment limit for free users
- [x] Show upgrade prompt (UpgradeModal with program limitType) when free user tries to enroll in 2nd program
- [x] Update Pricing page with 3 tiers (Free/Pro/Pro+Voice) and UpgradeModal with tier-specific upsells
- [x] All 549 tests pass (updated voice.test.ts mock for isProVoiceUser)

## RAG/Vector Pipeline Rebuild (May 29) — MySQL-based, no Pinecone
- [x] Create `memory_embeddings` table in schema (id, userId, sourceType, sourceId, content, embedding JSON, createdAt)
- [x] Create `user_personality_profiles` table (userId, traits JSON, communicationStyle, emotionalPatterns, updatedAt)
- [x] Write new RAG module `server/rag/memory.ts` using Gemini embeddings (no Pinecone)
- [x] Implement cosine similarity search in-app for retrieval
- [x] Wire journal.create → embed journal entry content after creation
- [x] Wire chat.send → embed user messages (every 5th message triggers personality update)
- [x] Wire voice.saveMessage → embed user voice transcripts
- [x] Wire voice.saveToJournal → embed the full transcript
- [x] Build personality profile accumulator (extract traits, style, patterns from interactions via LLM)
- [x] Update chat.send to retrieve relevant memories + personality profile before LLM call
- [x] Update voice mirror (v2vRelay) to include personality context + recent memories
- [ ] Remove old Pinecone dependency and `server/rag/embeddings.ts` (kept for backward compat)
- [x] Write vitest tests for new RAG module (25 tests — embedding, storage, retrieval, personality)
- [x] Verify all 574 existing tests still pass

## Bug Fixes (May 29)
- [x] Fix dashboard cards/rectangles jumping around on page load (layout shift issue)
- [x] Rename all "Mentrove" references to "Mirrored" across the entire codebase (including website title/link)

## Self-Actualization Program (May 29)
- [x] Add "Self-Actualization Guide to Full Potential" program (Carl Rogers philosophy) to programs section
- [x] Add dedicated reflection journal section within Self-Actualization program (save/review daily insights per lesson)

## Psychological Time Capsule — "A Letter From Your Past Self"
- [x] Create `psychological_fingerprints` table (userId, sessionType, sessionId, emotionalTone, coreBelief, unresolvedTension, rawExcerpts JSON, extractedAt)
- [x] Create `time_capsule_settings` table (userId, cadenceDays, isEnabled, nextDeliveryAt, scheduleCronTaskUid)
- [x] Create `time_capsule_letters` table (userId, generatedAt, deliveredAt, letterContent, periodStart, periodEnd, readAt)
- [x] Build silent fingerprint extraction module (LLM post-session analysis)
- [x] Wire fingerprint extraction into chat.send (every 5th message)
- [x] Wire fingerprint extraction into voice sessions (on session end)
- [x] Wire fingerprint extraction into check-in submissions
- [x] Build letter generation engine (first-person, user's linguistic style, ends with "Did you become them?")
- [x] Create time capsule settings UI (cadence picker: 30/90/365 days, enable/disable)
- [x] Create letter viewing page (sealed envelope metaphor, mark as read)
- [x] Implement periodic delivery via heartbeat scheduling (daily 09:00 UTC check)
- [x] Write vitest tests for fingerprint extraction and letter generation (16 tests passing)
- [x] Push notification on letter delivery
- [x] Time Capsule entry point on Home page (hourglass icon in header)

## Bug Fixes (May 30)
- [x] Fix "Patterns Detected" and "Next Steps for Growth" showing empty in check-in results page
- [x] Fix program enrollment showing generic error instead of Pro upgrade prompt for free users

## Bug Fixes — Reward Wheel (May 30)
- [x] Fix reward wheel not spinning — restore actual spin animation before revealing result
- [x] Implement 7-day Pro trial grant when user wins "1 Week Free Pro" on the wheel (starts at top of hour, ends exactly 7 days later)
- [x] Update OG/social share preview image from old Mentrove branding to new MIRRORED image

## Session Fingerprint Extractor (First-Strike Roadmap — PoC)
- [x] Add session_fingerprints table (emotional_valence, self_belief, unresolved_tension, timestamped)
- [x] Build Gemini 2.5 Flash extraction function with structured prompt
- [x] Create db helper for storing/retrieving fingerprints
- [x] Wire background extraction trigger after chat/check-in sessions end
- [x] Write vitest tests for fingerprint extraction logic

## Linguistic Drift Tracker (First-Strike Roadmap — Step 2)
- [x] Add linguistic_drift table (drift_score, retired_words, new_words, goal_alignment, week_start)
- [x] Build vocabulary extraction and comparison engine (NLP on session transcripts)
- [x] Compute drift_score — directional metric toward/away from stated goals
- [x] Create /api/scheduled/linguisticDrift handler for weekly heartbeat
- [x] Register heartbeat cron job via manus-heartbeat CLI (ready to deploy — will register after publish)
- [x] Write vitest tests for drift analysis logic

## 30-Day Letter (First-Strike Roadmap — Step 3)
- [x] Add time_capsule_letters table (letter_text, delivery_status, engagement metrics, user voice data)
- [x] Build letter generation engine (LLM prompt ingesting fingerprints + drift + intention)
- [x] Create daily scheduled job to check for 30-day eligible users
- [x] Deliver via in-app notification and push notification
- [x] Track engagement: open_rate, re-engagement within 48h, session-start rate
- [x] Write vitest tests for letter generation and eligibility logic

## Dashboard Quote Feature
- [x] Replace "Good morning" greeting with a profound/inspirational quote the user said 1-7 days ago
- [x] Show the date/day the quote was said underneath it
- [x] Create backend procedure to fetch recent user quotes from fingerprints/chat messages

## Female Voice Mirror Option
- [x] Add female voice Hume config (b5b9a42c-ef7e-42c6-bd7d-7495a10da489) as secondary voice option
- [x] Update mintToken procedure to accept voice gender input and return correct config ID
- [x] Wire Mirror.tsx voice gender toggle to pass selection to backend
- [x] Same AI personality/prompt for both voices — only the voice itself differs

## Bug Fix — Check-in Slider Navigation
- [x] Fix: Changing Mood or Energy slider on check-in page navigates back to home without saving (Stress slider works fine)
- [x] Remove swipe-between-tabs gesture entirely — it conflicts with sliders and horizontal interactions

## Entropy Detection Engine (First-Strike PoC Step 1)
- [x] Add entropy_scores table (user_id, score, days_since_checkin, journal_trend, habit_rate, prosody_energy, triggered, created_at)
- [x] Build entropy calculation engine with weighted scoring (check-in 30%, journal 20%, habits 30%, prosody 20%)
- [x] Create daily scheduled job handler at /api/scheduled/entropyDetection
- [x] Implement 2-consecutive-day trigger logic (score > 65 for 2 days)
- [x] Write vitest tests for entropy scoring logic

## Outbound Call V2V Trigger (First-Strike PoC Step 2)
- [x] Add higher_self_voicemails table (userId, transcript, audioUrl, entropyScore, listenedAt, createdAt)
- [x] Update entropy trigger to send push notification styled as incoming call
- [x] Build full-screen "Your Higher Self is calling..." incoming call UI component
- [x] Build entropy-aware V2V session with specialized system prompt (accept path)
- [x] Build voicemail generation via TTS on decline (30-60 sec audio message)
- [x] Integrate voicemails into Time Capsule archive (letters + voicemails in one place)
- [x] Write vitest tests for outbound call trigger and voicemail generation

## 10-Day Free Trial & New Pricing Tiers (Jun 2026)
- [x] Add trialStartDate column to subscriptions table in drizzle/schema.ts
- [x] Run DB migration: ALTER TABLE subscriptions ADD trialStartDate timestamp
- [x] Update stripe-products.ts: new prices ($9.99/mo, $104.99/yr for Pro; $13.99/mo, $149.99/yr for Premium Pro)
- [x] Update subscriptions DB helpers: isOnTrial(), isTrialExpired(), getTrialDaysRemaining()
- [x] Update isProUser() and isProVoiceUser() to treat active trial as full Pro/Pro+Voice access
- [x] Update getOrCreateSubscription() to set trialStartDate on first creation
- [x] Update subscription router: getStatus to return trial info (isOnTrial, trialDaysRemaining)
- [x] Update UpgradeModal: new prices, "10-day free trial" messaging, trial badge
- [x] Update Pricing.tsx: new prices, trial hero section, updated FAQ
- [x] Add TrialBanner component: shows days remaining during trial, upgrade CTA
- [x] Wire TrialBanner into AppShell so it appears on all app pages
- [x] Write vitest tests for trial logic (isOnTrial, isTrialExpired, getTrialDaysRemaining)


## VOW Language Integration (Learning Reflection Loop)
- [ ] Add user_scars table to drizzle schema (userId, scarText, category, vectorEmbedding, confidence, createdAt)
- [ ] Run DB migration for user_scars table
- [ ] Create scar recording helpers in server/db/scars.ts (recordScar, getScarsByUser, searchScarsByEmbedding)
- [ ] Build scar extraction logic: analyze journal entries, voice transcripts, check-ins for patterns
- [ ] Create weekly digest quest in VOW with tournament strategies (empathetic, analytical, action-focused)
- [ ] Implement scar recall: query vector memory before digest generation
- [ ] Build LLM context injection: pass relevant scars to digest generation prompt
- [ ] Add proof gates: digest must address top issues and avoid repeating past patterns
- [ ] Wire VOW quest into weekly scheduler (runs Sundays 6am)
- [ ] Write vitest tests for scar recording and digest generation
- [ ] Test end-to-end: journal entry → scar recorded → digest uses scar in context
