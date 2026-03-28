# Emotional Mastery 7-Day Program Design

## Overview
A guided growth program that walks users through 7 daily lessons on emotional mastery, each with:
- A core teaching/concept
- A guided reflection exercise
- AI-powered feedback and insights
- Progress tracking and completion badges

## Program Structure

### Program Level
- **Name**: "Emotional Mastery"
- **Description**: "Master your emotions and cultivate inner peace through 7 transformative days of guided reflection and practice"
- **Duration**: 7 days
- **Status**: active | completed | paused
- **Enrollment**: Users can enroll once, track progress across days

### Daily Lessons (7 Days)

| Day | Title | Core Concept | Exercise Type | AI Guidance |
|-----|-------|--------------|---------------|-------------|
| 1 | Recognizing Your Emotions | Emotional awareness and naming | Emotion inventory | Identify patterns in emotional triggers |
| 2 | The Root of Reactions | Understanding triggers and origins | Root cause analysis | Trace emotions to core beliefs |
| 3 | Emotional Regulation | Managing intense emotions | Breathing & grounding technique | Suggest personalized coping strategies |
| 4 | Perspective Shift | Reframing situations | Cognitive reframing exercise | Challenge limiting beliefs |
| 5 | Emotional Resilience | Building strength through adversity | Resilience reflection | Connect to past victories |
| 6 | Compassion & Acceptance | Self-compassion practices | Self-compassion meditation | Reinforce self-worth |
| 7 | Integration & Mastery | Bringing it all together | Weekly synthesis reflection | Celebrate growth, set next steps |

## Database Schema

### New Tables

#### `growth_programs`
- `id` (int, PK)
- `name` (string) - "Emotional Mastery"
- `slug` (string) - "emotional-mastery"
- `description` (text)
- `duration_days` (int) - 7
- `category` (enum) - "emotional-mastery" | "building-presence" | etc
- `status` (enum) - "active" | "archived"
- `created_at` (timestamp)

#### `program_lessons`
- `id` (int, PK)
- `program_id` (int, FK → growth_programs)
- `day` (int) - 1-7
- `title` (string)
- `concept` (text) - Core teaching
- `exercise_prompt` (text) - The reflection exercise
- `guidance_template` (text) - AI prompt template for feedback
- `order` (int)
- `created_at` (timestamp)

#### `user_program_enrollments`
- `id` (int, PK)
- `user_id` (int, FK → users)
- `program_id` (int, FK → growth_programs)
- `enrolled_at` (timestamp)
- `started_at` (timestamp, nullable)
- `completed_at` (timestamp, nullable)
- `status` (enum) - "enrolled" | "in_progress" | "completed" | "paused"
- `current_day` (int) - 1-7, tracks which day user is on
- `created_at` (timestamp)

#### `user_lesson_responses`
- `id` (int, PK)
- `user_id` (int, FK → users)
- `program_id` (int, FK → growth_programs)
- `lesson_id` (int, FK → program_lessons)
- `day` (int) - 1-7
- `user_reflection` (text) - User's response to exercise
- `ai_feedback` (text) - AI-generated insights
- `completed_at` (timestamp)
- `created_at` (timestamp)

## User Flows

### 1. Program Discovery
- User navigates to "Programs" page
- Sees "Emotional Mastery" card with description, duration, and CTA
- Clicks "Start Program" → enrolls in program

### 2. Daily Lesson Flow
- User opens app → sees "Continue Emotional Mastery (Day X/7)" prompt
- Clicks to enter lesson
- Reads day's concept and exercise prompt
- Writes reflection response
- Submits → AI analyzes and provides personalized feedback
- Sees "Day X Complete" badge
- Can proceed to next day (or continue anytime)

### 3. Progress Tracking
- Dashboard shows "Emotional Mastery: Day 3/7" progress bar
- Timeline view shows completed days with badges
- Can view all past responses and AI feedback
- Completion badge awarded on Day 7

## API Endpoints (tRPC Procedures)

### Public
- `programs.list()` - Get all available programs
- `programs.getById(programId)` - Get program details with all lessons

### Protected
- `programs.enroll(programId)` - Enroll user in program
- `programs.getUserEnrollment(programId)` - Get user's enrollment status
- `programs.getCurrentLesson(programId)` - Get today's lesson
- `programs.submitLessonResponse(programId, lessonId, reflection)` - Submit reflection + get AI feedback
- `programs.getProgress(programId)` - Get user's progress (days completed, etc)
- `programs.getResponses(programId)` - Get all user's responses for a program
- `programs.completeProgram(programId)` - Mark program as completed

## Frontend Pages

### 1. `/programs` - Program Discovery
- List all available programs
- Show "Emotional Mastery" with description, duration, testimonial
- "Start Program" CTA

### 2. `/programs/[programId]` - Program Details
- Full program description
- 7-day lesson overview (expandable)
- Enrollment status
- If enrolled: show progress bar and "Continue" button

### 3. `/programs/[programId]/lesson` - Daily Lesson Interface
- Day X/7 header
- Concept explanation
- Exercise prompt
- Text area for reflection
- AI feedback display (after submission)
- Navigation: Previous/Next day buttons

### 4. `/programs/[programId]/progress` - Program Progress Dashboard
- Progress bar (Day X/7)
- Timeline of completed days with badges
- List of all responses with AI feedback
- Completion badge (if finished)

## Content Strategy

### Day 1: Recognizing Your Emotions
**Concept**: "Emotions are data. They tell us what matters to us and what needs attention."
**Exercise**: "List 5 emotions you've felt this week. For each, write: (1) What triggered it? (2) Where did you feel it in your body? (3) What was it trying to tell you?"
**AI Guidance**: Analyzes patterns in triggers, suggests common themes, validates emotional experience

### Day 2: The Root of Reactions
**Concept**: "Most reactions are rooted in past experiences and core beliefs."
**Exercise**: "Pick one strong emotion from yesterday. Trace it back: What belief about yourself or the world is underneath this reaction?"
**AI Guidance**: Helps identify limiting beliefs, suggests reframing

### Day 3: Emotional Regulation
**Concept**: "We can't control emotions, but we can regulate our nervous system."
**Exercise**: "Practice a 5-minute grounding technique. Describe what you noticed in your body and mind."
**AI Guidance**: Validates the practice, suggests personalized techniques based on user's style

### Day 4: Perspective Shift
**Concept**: "The story we tell about an event shapes how we feel."
**Exercise**: "Reframe a recent challenge: What's another way to look at this situation? What could be the hidden gift?"
**AI Guidance**: Reinforces reframing, connects to user's values

### Day 5: Emotional Resilience
**Concept**: "Resilience is built through navigating challenges with awareness."
**Exercise**: "Recall a time you overcame adversity. What strengths did you discover in yourself?"
**AI Guidance**: Highlights resilience patterns, connects to current challenges

### Day 6: Compassion & Acceptance
**Concept**: "Self-compassion is the foundation of emotional mastery."
**Exercise**: "Write a compassionate letter to yourself about a recent struggle."
**AI Guidance**: Reinforces self-worth, suggests daily self-compassion practices

### Day 7: Integration & Mastery
**Concept**: "Mastery is the integration of all these practices into daily life."
**Exercise**: "Reflect on your week: What shifted? What will you carry forward? What's your next growth edge?"
**AI Guidance**: Celebrates progress, suggests next programs or practices

## Implementation Phases

1. **Database**: Create 4 new tables with migrations
2. **Backend**: Build tRPC procedures for enrollment, lesson tracking, AI feedback
3. **Frontend**: Build program discovery, lesson interface, progress dashboard
4. **AI Integration**: Use LLM to generate personalized feedback based on user responses
5. **Testing**: Unit tests for all procedures, integration tests for full flow
6. **Polish**: Add animations, badges, progress celebrations

## Success Metrics

- Users can enroll in the program
- Users complete daily lessons
- AI feedback is personalized and helpful
- Users see progress and feel motivated to continue
- Program completion rate > 70%
