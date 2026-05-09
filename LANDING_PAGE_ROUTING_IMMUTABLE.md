# LANDING PAGE ROUTING — IMMUTABLE WEBHOOK

**Status:** 🔒 LOCKED — DO NOT MODIFY WITHOUT EXPLICIT USER PERMISSION

**Created:** May 4, 2026  
**Last Verified:** May 4, 2026

---

## CRITICAL REQUIREMENT

All main URLs and subdomains MUST display the public landing page ("Begin Your Journey") BEFORE any login page.

### URLs Affected (ALL MUST SHOW LANDING PAGE)
- `https://higherself.cloud`
- `https://www.higherself.cloud`
- `https://synapset.manus.space`
- `https://higherself-lqwmd5t8.manus.space`
- All other configured domains

### Current Implementation

**File:** `client/src/App.tsx` (Line 89)
```tsx
<Route path="/" component={LandingPage} />
```

**Landing Page Component:** `client/src/pages/LandingPage.tsx`
- Features: Hero section, features overview, how it works, CTA buttons
- CTA Buttons: All link to `getLoginUrl()` which redirects to login/signup
- Styling: Emerald/teal gradient, professional design
- Mobile: Fully responsive

---

## ROUTING FLOW

```
User visits any domain
        ↓
Landing Page displays (/route)
        ↓
User clicks "Begin Your Journey" or "Sign In"
        ↓
Redirects to login/signup (via getLoginUrl())
        ↓
User authenticates
        ↓
Redirects to /home (authenticated app)
```

---

## LOCKED FILES (DO NOT MODIFY)

1. **`client/src/App.tsx`** — Route definition at line 89
   - LOCKED: `<Route path="/" component={LandingPage} />`
   - NEVER change to `<Route path="/" component={Landing} />`
   - NEVER redirect "/" to login

2. **`client/src/pages/LandingPage.tsx`** — Landing page component
   - LOCKED: All CTA buttons must link to `getLoginUrl()`
   - LOCKED: Must display BEFORE any authentication check
   - LOCKED: Must be publicly accessible (no auth required)

3. **`client/src/const.ts`** — getLoginUrl function
   - LOCKED: Must return login portal URL
   - LOCKED: Must NOT redirect to "/home" or authenticated routes

---

## PERMISSION REQUIRED

**To modify this routing:**
1. User must explicitly request the change
2. User must confirm understanding of the impact
3. Change must be documented with date and reason
4. This file must be updated with new status

---

## AUDIT TRAIL

| Date | Action | User | Status |
|------|--------|------|--------|
| 2026-05-04 | Landing page routing implemented | Manus Agent | ✅ LOCKED |
| | | | |

---

## TESTING CHECKLIST

- [ ] Visit `https://higherself.cloud` → See landing page (NOT login)
- [ ] Visit `https://synapset.manus.space` → See landing page (NOT login)
- [ ] Click "Begin Your Journey" → Redirects to login
- [ ] Click "Sign In" → Redirects to login
- [ ] After login → Redirects to /home (authenticated app)
- [ ] Landing page is mobile responsive
- [ ] All CTAs work correctly
- [ ] No authentication required to view landing page

---

## VIOLATION PROTOCOL

If this routing is changed without permission:
1. **STOP immediately**
2. **Revert the change**
3. **Ask user for permission first**
4. **Document the violation**

---

**This webhook is CRITICAL to the user experience and must never be modified without explicit permission.**
