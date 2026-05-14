import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  getTotalRewardPoints,
  getRewardPointsHistory,
  spinWheel,
  recordWheelSpin,
  getWheelSpinHistory,
  getLastWheelSpin,
  hasUsedWelcomeSpin,
  markWelcomeSpinUsed,
  addRewardPoints,
  redeemPoints,
  getStreakRewards,
} from "../db/rewards";

// Redemption tiers
const REDEMPTION_TIERS = [
  { id: "week_pro", name: "1 Week Pro Access", points: 50, description: "Unlock Pro features for 7 days" },
  { id: "month_pro", name: "1 Month Pro Access", points: 150, description: "Unlock Pro features for 30 days" },
  { id: "three_month_pro", name: "3 Months Pro Access", points: 400, description: "Unlock Pro features for 90 days" },
  { id: "year_pro", name: "1 Year Pro Access", points: 1200, description: "Unlock Pro features for a full year" },
];

// Wheel prize display names
const PRIZE_LABELS: Record<string, string> = {
  month_pro: "1 Month Free Pro!",
  five_percent_off: "5% Off Annual Plan",
  try_again: "Try Again",
  week_trial: "1 Week Free Trial",
  reward_points: "+5 Reward Points",
};

export const rewardsRouter = router({
  // Get full rewards dashboard data
  dashboard: protectedProcedure.query(async ({ ctx }) => {
    const [totalPoints, history, spinHistory, lastSpin, welcomeSpinUsed, streakRewardsList] = await Promise.all([
      getTotalRewardPoints(ctx.user.id),
      getRewardPointsHistory(ctx.user.id),
      getWheelSpinHistory(ctx.user.id),
      getLastWheelSpin(ctx.user.id),
      hasUsedWelcomeSpin(ctx.user.id),
      getStreakRewards(ctx.user.id),
    ]);

    return {
      totalPoints,
      history: history.slice(0, 50), // Last 50 entries
      spinHistory: spinHistory.slice(0, 20),
      lastSpin,
      welcomeSpinUsed,
      redemptionTiers: REDEMPTION_TIERS,
      streakRewards: streakRewardsList,
    };
  }),

  // Get just the points balance (lightweight)
  points: protectedProcedure.query(async ({ ctx }) => {
    const total = await getTotalRewardPoints(ctx.user.id);
    return { total };
  }),

  // Check if welcome spin is available
  welcomeSpinAvailable: protectedProcedure.query(async ({ ctx }) => {
    const used = await hasUsedWelcomeSpin(ctx.user.id);
    return { available: !used };
  }),

  // Spin the wheel (welcome spin or streak spin)
  spin: protectedProcedure
    .input(z.object({ type: z.enum(["welcome", "streak"]) }))
    .mutation(async ({ ctx, input }) => {
      if (input.type === "welcome") {
        const used = await hasUsedWelcomeSpin(ctx.user.id);
        if (used) {
          return { success: false, error: "Welcome spin already used", result: null, prizeLabel: null };
        }
      }

      const result = spinWheel();
      const prizeLabel = PRIZE_LABELS[result] || result;

      await recordWheelSpin(ctx.user.id, result, prizeLabel);

      if (input.type === "welcome") {
        await markWelcomeSpinUsed(ctx.user.id);
      }

      return { success: true, result, prizeLabel, error: null };
    }),

  // Redeem points for a reward
  redeem: protectedProcedure
    .input(z.object({ tierId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const tier = REDEMPTION_TIERS.find((t) => t.id === input.tierId);
      if (!tier) {
        return { success: false, error: "Invalid tier" };
      }

      try {
        const result = await redeemPoints(ctx.user.id, tier.points, `Redeemed: ${tier.name}`);
        return { success: true, remainingPoints: result.remainingPoints, error: null };
      } catch (e: any) {
        return { success: false, error: e.message || "Redemption failed" };
      }
    }),

  // Get redemption tiers
  tiers: protectedProcedure.query(() => {
    return REDEMPTION_TIERS;
  }),
});
