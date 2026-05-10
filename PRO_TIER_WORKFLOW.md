# Pro Tier Implementation Workflow

## Core Principle
**PRESERVE ALL EXISTING FUNCTIONALITY** - Only ADD new code. Do not modify existing working features unless absolutely necessary to support new functionality.

## Verification Protocol
Before each phase:
1. Run `pnpm tsc --noEmit` to check for TypeScript errors
2. Run `webdev_check_status` to verify dev server health
3. Visually test existing features in browser

After each phase:
1. Run `pnpm tsc --noEmit` again
2. Verify no new errors introduced
3. Test the specific feature added
4. Test 2-3 existing features to ensure no regression
5. Document any issues found

## Phase 1: Database Schema Updates

### New Tables/Columns Required

#### 1. User Subscriptions
```sql
ALTER TABLE users ADD COLUMN (
  subscriptionTier ENUM('free', 'pro') DEFAULT 'free',
  subscriptionStatus ENUM('active', 'canceled', 'expired') DEFAULT 'active',
  subscriptionStartDate TIMESTAMP,
  subscriptionEndDate TIMESTAMP,
  stripeCustomerId VARCHAR(255),
  stripeSubscriptionId VARCHAR(255)
);
```

#### 2. Streak Tracking
```sql
CREATE TABLE streaks (
  id INT PRIMARY KEY AUTO_INCREMENT,
  userId INT NOT NULL,
  streakType ENUM('habit', 'journal', 'chat') NOT NULL,
  currentStreak INT DEFAULT 0,
  longestStreak INT DEFAULT 0,
  lastActivityDate DATE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id)
);
```

#### 3. Reward Points
```sql
ALTER TABLE users ADD COLUMN (
  rewardPoints INT DEFAULT 0
);

CREATE TABLE rewardPointsHistory (
  id INT PRIMARY KEY AUTO_INCREMENT,
  userId INT NOT NULL,
  points INT NOT NULL,
  source ENUM('habit', 'journal', 'chat', 'checkin') NOT NULL,
  sourceId VARCHAR(255),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id)
);
```

#### 4. Wheel Spins
```sql
CREATE TABLE wheelSpins (
  id INT PRIMARY KEY AUTO_INCREMENT,
  userId INT NOT NULL,
  result ENUM('month_pro', 'five_percent_off', 'try_again', 'week_trial', 'reward_points') NOT NULL,
  prizeValue VARCHAR(255),
  spinnedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id)
);
```

#### 5. Chat Usage Tracking
```sql
CREATE TABLE chatUsageDaily (
  id INT PRIMARY KEY AUTO_INCREMENT,
  userId INT NOT NULL,
  usageDate DATE,
  chatCount INT DEFAULT 0,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_date (userId, usageDate),
  FOREIGN KEY (userId) REFERENCES users(id)
);
```

#### 6. Journal Usage Tracking
```sql
CREATE TABLE journalUsageWeekly (
  id INT PRIMARY KEY AUTO_INCREMENT,
  userId INT NOT NULL,
  weekStartDate DATE,
  journalCount INT DEFAULT 0,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_week (userId, weekStartDate),
  FOREIGN KEY (userId) REFERENCES users(id)
);
```

#### 7. Streak Rewards
```sql
CREATE TABLE streakRewards (
  id INT PRIMARY KEY AUTO_INCREMENT,
  userId INT NOT NULL,
  streakDays INT NOT NULL,
  rewardType ENUM('two_months_pro', 'one_year_pro') NOT NULL,
  rewardAppliedAt TIMESTAMP,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id)
);
```

## Phase 2: Server-Side Helpers

### New Files to Create

#### `server/db/subscriptions.ts`
- `getUserSubscription(userId)` - Get current subscription status
- `isProUser(userId)` - Check if user has active Pro subscription
- `updateSubscriptionTier(userId, tier, endDate)` - Update subscription

#### `server/db/streaks.ts`
- `getOrCreateStreak(userId, streakType)` - Get/create streak record
- `updateStreak(userId, streakType)` - Increment streak
- `resetStreak(userId, streakType)` - Reset streak if broken
- `checkStreakMilestone(userId, streakType)` - Check for 30/100 day rewards

#### `server/db/rewards.ts`
- `addRewardPoints(userId, points, source, sourceId)` - Add points
- `getRewardPoints(userId)` - Get total points
- `recordWheelSpin(userId, result, prizeValue)` - Record wheel spin

#### `server/db/usage.ts`
- `getTodaysChatCount(userId)` - Get today's chat usage
- `getWeeksChatCount(userId)` - Get this week's chat usage
- `incrementChatUsage(userId)` - Increment chat count
- `getWeeksJournalCount(userId)` - Get this week's journal usage
- `incrementJournalUsage(userId)` - Increment journal count

## Phase 3: tRPC Procedures

### New Procedures to Add (in `server/routers.ts`)

```typescript
// Subscription procedures
subscription: {
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    // Return user's subscription status
  }),
  
  getCurrentUsage: protectedProcedure.query(async ({ ctx }) => {
    // Return chat/journal usage for today/this week
  })
}

// Rewards procedures
rewards: {
  getPoints: protectedProcedure.query(async ({ ctx }) => {
    // Return user's reward points
  }),
  
  spinWheel: protectedProcedure.mutation(async ({ ctx }) => {
    // Handle wheel spin with weighted odds
  }),
  
  getStreakStatus: protectedProcedure.query(async ({ ctx }) => {
    // Return all streaks and milestones
  })
}

// Usage procedures
usage: {
  checkChatLimit: protectedProcedure.query(async ({ ctx }) => {
    // Check if user can chat today
  }),
  
  checkJournalLimit: protectedProcedure.query(async ({ ctx }) => {
    // Check if user can journal this week
  })
}
```

## Phase 4: Frontend Integration Points

### Existing Features to Gate (NO MODIFICATIONS, only add checks)

#### Chat Page
- Before allowing new chat: Call `usage.checkChatLimit`
- If limit reached and not Pro: Show upgrade modal
- Track usage after successful chat

#### Journal Page
- Before allowing new journal: Call `usage.checkJournalLimit`
- If limit reached and not Pro: Show upgrade modal
- Track usage after successful journal

#### Insights/Growth Section
- Check if Pro: `subscription.getStatus`
- If not Pro: Show "Pro feature" badge with upgrade CTA

## Phase 5: New Components to Create

### Components (in `client/src/components/`)

1. `ProUpgradeModal.tsx` - Modal for upgrading to Pro
2. `RewardWheel.tsx` - Interactive wheel component
3. `StreakBadge.tsx` - Display streak progress
4. `UsageMeter.tsx` - Show usage limits (e.g., "3/5 chats used today")

### Pages (in `client/src/pages/`)

1. `Pricing.tsx` - Pricing page with subscription options
2. `Rewards.tsx` - Rewards dashboard showing points and streaks

## Implementation Order

1. **Database Schema** - Create all new tables
2. **DB Helpers** - Create query functions
3. **tRPC Procedures** - Create API endpoints
4. **Usage Tracking** - Add logging to existing features
5. **Frontend Gating** - Add checks before features
6. **Wheel Component** - Build reward wheel
7. **Pricing Page** - Create subscription UI
8. **Testing** - Verify all features work

## Regression Testing Checklist

After each phase, test:
- [ ] Landing page loads
- [ ] Login/onboarding works
- [ ] Chat feature works (existing)
- [ ] Journal feature works (existing)
- [ ] Habits feature works (existing)
- [ ] Calendar feature works (existing)
- [ ] Dashboard loads (existing)
- [ ] Settings page loads (existing)
- [ ] No console errors

## Rollback Strategy

If any phase breaks existing functionality:
1. Immediately identify the breaking change
2. Revert the specific file/change
3. Document what went wrong
4. Find alternative approach
5. Test again before proceeding

## Success Criteria

✅ Pro tier system fully functional
✅ All existing features work without modification
✅ No console errors or TypeScript errors
✅ Chat/journal limits enforced correctly
✅ Streak tracking working
✅ Reward wheel functional
✅ No visual changes to existing UI
