# Demo Mode Implementation Notes

## Architecture Decision
The demo mode needs to:
1. Bypass OAuth login — allow unauthenticated users to explore the app
2. Provide a fake "demo user" context so tRPC protected procedures work
3. Show sample data (check-ins, journal entries, chat history)
4. Be accessible via /demo route

## Key Files to Modify
- `server/_core/context.ts` — Add demo user detection (e.g., via `x-demo-mode` header or `?demo=true` query param)
- `client/src/App.tsx` — Add /demo route that sets demo mode flag
- `client/src/lib/trpc.ts` — Add demo header to tRPC client when in demo mode
- `client/src/_core/hooks/useAuth.ts` — Return demo user when in demo mode

## User Schema Shape (for demo user)
```ts
{
  id: 999999,
  openId: "demo-user",
  name: "Demo User",
  email: "demo@mirrored.app",
  role: "user",
  onboardingCompleted: true,
  seedIntent: "Inner Peace",
  lastSessionId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
  welcomeSpinUsed: true,
  lastStreakSpinDate: null,
}
```

## Auth Flow
- Home.tsx line 130: `if (!loading && !isAuthenticated) navigate("/")`
- Each page uses `useAuth()` which calls `trpc.auth.me.useQuery()`
- `auth.me` returns `ctx.user` from context.ts
- context.ts extracts user from session cookie or SDK

## Approach
Best approach: Create a client-side demo context that overrides useAuth and provides mock data.
This avoids touching the server at all. The demo mode would:
1. Store `demo=true` in localStorage when user visits /demo
2. useAuth hook checks localStorage and returns a fake user
3. tRPC queries are disabled in demo mode, replaced with static mock data
4. A DemoProvider wraps the app and provides mock data via React context

Alternative (simpler): Server-side demo user
- Add a special demo token/header that context.ts recognizes
- Return a hardcoded demo user from auth.me when demo header is present
- Seed demo data in the database for user id 999999
- This approach is simpler but requires DB seeding
