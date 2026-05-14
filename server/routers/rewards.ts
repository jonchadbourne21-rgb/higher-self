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
  getPendingStreakSpins,
} from "../db/rewards";
import {
  createRewardGrant,
  checkAndProcessExpiredGrants,
  getAllGrants,
  getPendingGrantCount,
} from "../db/rewardGrants";

// Redemption tiers — these also create grants
const REDEMPTION_TIERS = [
  { id: "week_pro", grantType: "week_pro", name: "1 Week Pro Access", points: 50, description: "Unlock Pro features for 7 days" },
  { id: "month_pro_redeem", grantType: "month_pro_redeem", name: "1 Month Pro Access", points: 150, description: "Unlock Pro features for 30 days" },
  { id: "three_month_pro", grantType: "three_month_pro", name: "3 Months Pro Access", points: 400, description: "Unlock Pro features for 90 days" },
  { id: "year_pro", grantType: "year_pro", name: "1 Year Pro Access", points: 1200, description: "Unlock Pro features for a full year" },
];

// Wheel prize display names
const PRIZE_LABELS: Record<string, string> = {
  month_pro: "1 Month Free Pro!",
  five_percent_off: "5% Off Annual Plan",
  try_again: "Try Again",
  week_trial: "1 Week Free Trial",
  reward_points: "+5 Reward Points",
};

// Map spin results to grant types (only the ones that give Pro access)
const SPIN_GRANT_MAP: Record<string, string> = {
  month_pro: "month_pro",
  week_trial: "week_trial",
};

export const rewardsRouter = router({
  // Get full rewards dashboard data
  dashboard: protectedProcedure.query(async ({ ctx }) => {
    const [totalPoints, history, spinHistory, lastSpin, welcomeSpinUsed, streakRewardsList, grantStatus, allGrants, pendingStreakSpins] =
      await Promise.all([
        getTotalRewardPoints(ctx.user.id),
        getRewardPointsHistory(ctx.user.id),
        getWheelSpinHistory(ctx.user.id),
        getLastWheelSpin(ctx.user.id),
        hasUsedWelcomeSpin(ctx.user.id),
        getStreakRewards(ctx.user.id),
        checkAndProcessExpiredGrants(ctx.user.id),
        getAllGrants(ctx.user.id),
        getPendingStreakSpins(ctx.user.id),
      ]);

    return {
      totalPoints,
      history: history.slice(0, 50),
      spinHistory: spinHistory.slice(0, 20),
      lastSpin,
      welcomeSpinUsed,
      redemptionTiers: REDEMPTION_TIERS,
      streakRewards: streakRewardsList,
      // Grant/Pro status
      isPro: grantStatus.isPro,
      activeGrant: grantStatus.activeGrant,
      pendingGrants: grantStatus.pendingGrants,
      proExpiresAt: grantStatus.expiresAt,
      allGrants: allGrants.slice(0, 50),
      // Streak spins
      pendingStreakSpins,
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

  // Get Pro status from reward grants (checks expiration, auto-activates next)
  proStatus: protectedProcedure.query(async ({ ctx }) => {
    const status = await checkAndProcessExpiredGrants(ctx.user.id);
    const pendingCount = await getPendingGrantCount(ctx.user.id);
    return {
      isPro: status.isPro,
      activeGrant: status.activeGrant,
      pendingGrants: status.pendingGrants,
      pendingCount,
      expiresAt: status.expiresAt,
    };
  }),

  // Spin the wheel (welcome spin or streak spin) — now actually fulfills prizes
  spin: protectedProcedure
    .input(z.object({ type: z.enum(["welcome", "streak"]) }))
    .mutation(async ({ ctx, input }) => {
      if (input.type === "welcome") {
        const used = await hasUsedWelcomeSpin(ctx.user.id);
        if (used) {
          return { success: false, error: "Welcome spin already used", result: null, prizeLabel: null, grantActivated: false };
        }
      }

      const result = spinWheel();
      const prizeLabel = PRIZE_LABELS[result] || result;

      await recordWheelSpin(ctx.user.id, result, prizeLabel);

      if (input.type === "welcome") {
        await markWelcomeSpinUsed(ctx.user.id);
      }

      // ── Fulfill the prize ──────────────────────────────────────────
      let grantActivated = false;

      const grantType = SPIN_GRANT_MAP[result];
      if (grantType) {
        // This is a Pro access prize — create a grant
        const grantResult = await createRewardGrant(ctx.user.id, grantType, "spin");
        grantActivated = grantResult.activated;
      }
      // reward_points are already handled in recordWheelSpin
      // five_percent_off and try_again don't need grants

      return { success: true, result, prizeLabel, error: null, grantActivated };
    }),

  // Redeem points for a reward — now creates a grant
  redeem: protectedProcedure
    .input(z.object({ tierId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const tier = REDEMPTION_TIERS.find((t) => t.id === input.tierId);
      if (!tier) {
        return { success: false, error: "Invalid tier" };
      }

      try {
        // Deduct points first
        const pointsResult = await redeemPoints(ctx.user.id, tier.points, `Redeemed: ${tier.name}`);

        // Create the grant
        const grantResult = await createRewardGrant(ctx.user.id, tier.grantType, "redemption");

        return {
          success: true,
          remainingPoints: pointsResult.remainingPoints,
          grantActivated: grantResult.activated,
          expiresAt: grantResult.expiresAt,
          error: null,
        };
      } catch (e: any) {
        return { success: false, error: e.message || "Redemption failed" };
      }
    }),

  // Get all grants history
  grants: protectedProcedure.query(async ({ ctx }) => {
    const grants = await getAllGrants(ctx.user.id);
    return grants;
  }),

  // Get redemption tiers
  tiers: protectedProcedure.query(() => {
    return REDEMPTION_TIERS;
  }),
});
