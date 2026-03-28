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

## Journal Title Suggestion
- [x] Add tRPC procedure: journal.suggestTitle — calls LLM with entry content, returns a short evocative title
- [x] Update Journal page: debounced trigger after user types 60+ chars, show suggested title chip below title field
- [x] Accept/dismiss/edit flow: clicking chip fills the title input; user can still type manually
- [x] Write vitest test for journal.suggestTitle procedure

## Bugs
- [ ] Fix OAuth login failure on published domain (persistent issue)
- [x] Fix duplicate sql import in db.ts
- [x] Fix getDb() to use mysql2/promise connection pool instead of passing DATABASE_URL directly to drizzle
- [x] Fix onboarding INSERT failures (schema-database mismatch resolved)
- [x] Fix onboarding redirect after completion (invalidate auth.me cache)
