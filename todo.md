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
