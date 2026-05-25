import { z } from 'zod'
import { protectedProcedure, publicProcedure, router } from '../_core/trpc'
import { revokeSession } from '../auth/jwt'
import { parse as parseCookieHeader } from 'cookie'
import { COOKIE_NAME } from '@shared/const'

/**
 * Auth router — handles authentication operations
 *
 * Procedures:
 * - me: Returns current authenticated user
 * - logout: Revokes session and clears cookies
 */
export const authRouter = router({
  /**
   * Get current authenticated user
   * Returns null if not authenticated
   */
  me: publicProcedure.query(async ({ ctx }) => {
    return ctx.user ?? null
  }),

  /**
   * Logout — revokes the session and clears cookies
   *
   * Flow:
   * 1. Extract session ID from JWT token
   * 2. Set revoked_at = NOW() in database
   * 3. Clear session cookies
   * 4. Return success
   */
  logout: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      // Extract session ID from the session_token cookie
      const cookies = parseCookieHeader(ctx.req.headers.cookie || '')
      const sessionToken = cookies.session_token

      if (sessionToken) {
        // Decode JWT to get session ID
        // Note: We don't verify the signature here since we're just extracting the payload
        // The session ID is in the 'sid' claim
        const parts = sessionToken.split('.')
        if (parts.length === 3) {
          try {
            const payload = JSON.parse(
              Buffer.from(parts[1], 'base64').toString('utf-8')
            )
            const sessionId = payload.sid

            // Revoke the session in database
            if (sessionId) {
              await revokeSession(sessionId)
            }
          } catch (e) {
            // If JWT parsing fails, continue with cookie clearing
            console.warn('[Auth] Failed to parse JWT for logout:', e)
          }
        }
      }

      // Clear session cookies
      ctx.res.clearCookie('session_token', { path: '/' })
      ctx.res.clearCookie(COOKIE_NAME, { path: '/' })

      return { success: true }
    } catch (error) {
      console.error('[Auth] Logout failed:', error)
      return { success: false }
    }
  }),
})
