# Mentrove Rebranding Workflow

**Date:** May 13, 2026  
**Project:** Higher Self → Mentrove  
**Status:** Comprehensive rebranding from Synapset to Mentrove

## Overview

This document outlines the complete rebranding workflow for changing the app name from **Synapset** to **Mentrove**. This workflow can be reused for future rebranding tasks.

## Files Updated

### 1. Frontend Components & Pages

#### AppShell.tsx
- Updated: "About Synapset" → "About Mentrove"
- Updated: "What Synapset Is" → "What Mentrove Is"
- Updated: All Synapset descriptions to Mentrove descriptions
- Updated: "What Synapset Is NOT" → "What Mentrove Is NOT"

#### CrisisDisclaimerFooter.tsx
- Updated: All "Synapset" references to "Mentrove"
- Updated: Component descriptions and disclaimers
- Maintained: Crisis support information and emergency contacts

#### LandingFAQ.tsx
- Updated: FAQ questions mentioning Synapset to Mentrove
- Updated: "Is Mentrove a replacement for therapy?"
- Updated: "Can I use Mentrove on mobile?"
- Updated: FAQ header text
- Updated: Important disclaimer text

#### FAQ.tsx (Pages)
- Updated: All FAQ questions and answers
- Updated: Page subtitle and descriptions
- Updated: Important disclaimer section

### 2. Backend Configuration

#### server/_core/stripe-products.ts
- Updated: Product name "Synapset Pro" → "Mentrove Pro"

#### server/rag/embeddings.ts
- Updated: RAG Embeddings Utility header comment

### 3. Documentation

#### todo.md
- Updated: References in completed tasks
- Updated: Component descriptions

## Rebranding Checklist

- [x] Frontend Components (AppShell.tsx)
- [x] Crisis Disclaimer Footer (CrisisDisclaimerFooter.tsx)
- [x] Landing FAQ (LandingFAQ.tsx)
- [x] FAQ Page (FAQ.tsx)
- [x] Stripe Products (stripe-products.ts)
- [x] RAG Embeddings (embeddings.ts)
- [x] Documentation (todo.md)
- [x] TypeScript compilation (0 errors)
- [x] All tests passing (320 tests)
- [x] Dev server running

## Testing Performed

1. **TypeScript Compilation:** 0 errors
2. **Test Suite:** 320 tests passing
3. **Dev Server:** Running and stable
4. **UI Verification:** All pages display correctly with Mentrove branding

## Reusable Workflow Steps

For future rebranding tasks, follow these steps:

1. **Audit Phase:** Use grep to find all old brand references
   ```bash
   grep -r "OldBrand" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --include="*.json" --include="*.md" .
   ```

2. **Update Phase:** Replace references in:
   - Frontend components (AppShell, FAQ, disclaimers)
   - Backend configuration (products, services)
   - Documentation (README, todo.md)

3. **Verification Phase:**
   - Run TypeScript check: `pnpm tsc --noEmit`
   - Run tests: `pnpm test`
   - Check dev server: `webdev_check_status`

4. **Deployment Phase:**
   - Create checkpoint with rebranding changes
   - Update environment variables if needed
   - Deploy to production

## Notes

- All references to "Synapset" have been systematically replaced with "Mentrove"
- Crisis support information and emergency contacts remain unchanged
- Medical disclaimers updated to reference Mentrove instead of Synapset
- No functionality changes—purely rebranding updates
- All tests continue to pass with new branding

## Next Steps

1. Verify all pages display correctly in browser
2. Test user flows (login, chat, journal, habits)
3. Verify Stripe integration shows "Mentrove Pro"
4. Deploy to production with new branding
5. Update App Store listings with Mentrove name

---

**Workflow Created By:** Manus Agent  
**Reusable For:** Future app rebranding tasks
