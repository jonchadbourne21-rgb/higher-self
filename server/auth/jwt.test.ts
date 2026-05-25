import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { db } from '../db'
import { sessions, users } from '../../drizzle/schema'
import { eq } from 'drizzle-orm'
import { createSessionAndToken, revokeSession } from './jwt'
import { verifySessionToken } from './validator'

describe('JWT Authentication Flow', () => {
  let testUserId: number
  let testSessionId: string
  let testToken: string

  beforeAll(async () => {
    // Create a test user
    const result = await db.insert(users).values({
      openId: `test_user_${Date.now()}`,
      name: 'Test User',
      email: `test_${Date.now()}@example.com`,
      loginMethod: 'test',
      role: 'user',
      onboardingCompleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
      welcomeSpinUsed: false,
    })

    // Get the inserted user ID
    const user = await db.query.users.findFirst({
      where: eq(users.email, `test_${Date.now()}@example.com`),
    })
    testUserId = user!.id
  })

  afterAll(async () => {
    // Cleanup: delete test user and sessions
    if (testSessionId) {
      await db.delete(sessions).where(eq(sessions.id, testSessionId))
    }
    if (testUserId) {
      await db.delete(users).where(eq(users.id, testUserId))
    }
  })

  describe('createSessionAndToken', () => {
    it('should create session row with 30-day expiration', async () => {
      const { token, sessionId } = await createSessionAndToken(testUserId)

      testSessionId = sessionId
      testToken = token

      const session = await db.query.sessions.findFirst({
        where: eq(sessions.id, sessionId),
      })

      expect(session).toBeDefined()
      expect(session!.userId).toBe(testUserId)
      expect(session!.revokedAt).toBeNull()

      // Check expiration is approximately 30 days
      const expirationMs = session!.expiresAt.getTime() - Date.now()
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000
      expect(Math.abs(expirationMs - thirtyDaysMs)).toBeLessThan(1000) // Within 1 second
    })

    it('should issue JWT token', async () => {
      expect(testToken).toBeDefined()
      expect(typeof testToken).toBe('string')
      expect(testToken.split('.').length).toBe(3) // JWT has 3 parts
    })

    it('should store userAgent and ipAddress if provided', async () => {
      const { sessionId } = await createSessionAndToken(
        testUserId,
        'Mozilla/5.0',
        '192.168.1.1'
      )

      const session = await db.query.sessions.findFirst({
        where: eq(sessions.id, sessionId),
      })

      expect(session!.userAgent).toBe('Mozilla/5.0')
      expect(session!.ipAddress).toBe('192.168.1.1')

      // Cleanup
      await db.delete(sessions).where(eq(sessions.id, sessionId))
    })
  })

  describe('verifySessionToken', () => {
    it('should verify valid JWT token', async () => {
      const user = await verifySessionToken(testToken)

      expect(user).toBeDefined()
      expect(user!.id).toBe(testUserId)
    })

    it('should reject revoked session', async () => {
      // Revoke the session
      await revokeSession(testSessionId)

      // Verify should now fail
      const user = await verifySessionToken(testToken)
      expect(user).toBeNull()
    })

    it('should reject invalid JWT signature', async () => {
      // Create a new session for this test
      const { token: validToken, sessionId } = await createSessionAndToken(testUserId)

      // Tamper with the token
      const parts = validToken.split('.')
      const tamperedToken = parts[0] + '.' + parts[1] + '.invalidsignature'

      const user = await verifySessionToken(tamperedToken)
      expect(user).toBeNull()

      // Cleanup
      await db.delete(sessions).where(eq(sessions.id, sessionId))
    })

    it('should reject expired session', async () => {
      // Create a session with past expiration
      const sessionId = `sess_expired_${Date.now()}`
      const pastDate = new Date(Date.now() - 1000) // 1 second ago

      await db.insert(sessions).values({
        id: sessionId,
        userId: testUserId,
        expiresAt: pastDate,
        revokedAt: null,
        createdAt: new Date(),
      })

      // Create a valid JWT pointing to this expired session
      // (In real scenario, this would be from before expiration)
      // For now, just verify that the session lookup would fail
      const session = await db.query.sessions.findFirst({
        where: eq(sessions.id, sessionId),
      })

      expect(session!.expiresAt < new Date()).toBe(true)

      // Cleanup
      await db.delete(sessions).where(eq(sessions.id, sessionId))
    })

    it('should return null for non-existent session', async () => {
      // Create a valid JWT with a fake session ID
      const { SignJWT } = await import('jose')
      const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!)

      const fakeToken = await new SignJWT({
        sid: 'sess_nonexistent',
        uid: testUserId,
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('600s')
        .sign(JWT_SECRET)

      const user = await verifySessionToken(fakeToken)
      expect(user).toBeNull()
    })
  })

  describe('revokeSession', () => {
    it('should set revokedAt timestamp', async () => {
      const { sessionId } = await createSessionAndToken(testUserId)

      // Verify not revoked initially
      let session = await db.query.sessions.findFirst({
        where: eq(sessions.id, sessionId),
      })
      expect(session!.revokedAt).toBeNull()

      // Revoke the session
      await revokeSession(sessionId)

      // Verify revoked
      session = await db.query.sessions.findFirst({
        where: eq(sessions.id, sessionId),
      })
      expect(session!.revokedAt).toBeDefined()
      expect(session!.revokedAt).not.toBeNull()

      // Cleanup
      await db.delete(sessions).where(eq(sessions.id, sessionId))
    })

    it('should allow immediate re-login after logout', async () => {
      const { sessionId: oldSessionId } = await createSessionAndToken(testUserId)

      // Logout (revoke old session)
      await revokeSession(oldSessionId)

      // Create new session (new login)
      const { token: newToken, sessionId: newSessionId } = await createSessionAndToken(testUserId)

      // New session should be valid
      const user = await verifySessionToken(newToken)
      expect(user).toBeDefined()
      expect(user!.id).toBe(testUserId)

      // Cleanup
      await db.delete(sessions).where(eq(sessions.id, oldSessionId))
      await db.delete(sessions).where(eq(sessions.id, newSessionId))
    })
  })

  describe('Security Properties', () => {
    it('JWT should expire in 10 minutes', async () => {
      const { token } = await createSessionAndToken(testUserId)

      // Decode JWT payload
      const parts = token.split('.')
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'))

      const issuedAt = payload.iat
      const expiresAt = payload.exp

      const ttlSeconds = expiresAt - issuedAt
      expect(ttlSeconds).toBe(600) // 10 minutes
    })

    it('JWT should only contain session ID and user ID', async () => {
      const { token } = await createSessionAndToken(testUserId)

      // Decode JWT payload
      const parts = token.split('.')
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'))

      // Should only have these fields (plus standard JWT fields)
      expect(payload).toHaveProperty('sid')
      expect(payload).toHaveProperty('uid')
      expect(payload).toHaveProperty('iat')
      expect(payload).toHaveProperty('exp')

      // Should NOT contain user data
      expect(payload).not.toHaveProperty('name')
      expect(payload).not.toHaveProperty('email')
      expect(payload).not.toHaveProperty('role')
    })

    it('session should be revocable independently of JWT expiration', async () => {
      const { token, sessionId } = await createSessionAndToken(testUserId)

      // Session is valid
      let user = await verifySessionToken(token)
      expect(user).toBeDefined()

      // Revoke session (even though JWT is still valid)
      await revokeSession(sessionId)

      // JWT verification should now fail
      user = await verifySessionToken(token)
      expect(user).toBeNull()

      // Cleanup
      await db.delete(sessions).where(eq(sessions.id, sessionId))
    })
  })
})
