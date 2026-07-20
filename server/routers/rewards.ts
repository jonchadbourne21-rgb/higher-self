import { protectedProcedure, router } from "../_core/trpc";
import {
  checkAndProcessExpiredGrants,
  getPendingGrantCount,
} from "../db/rewardGrants";

import * as demo from "../demoInterceptor";

export const rewardsRouter = router({
  // Get Pro status from reward grants (checks expiration, auto-activates next)
  proStatus: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.isDemo) return demo.getDemoProStatus();
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
});
