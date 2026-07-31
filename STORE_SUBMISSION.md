# Store Submission Guide — Mirrored

Covers Apple App Store, Google Play, and Samsung Galaxy Store.

Everything in **Done in the repo** is already committed. Everything in **You must do
this** requires an account, a Mac, a paid developer membership, or a product
decision — none of which can be done from the repo.

---

## Build identity

| | Value |
|---|---|
| App name | Mirrored |
| Bundle ID / applicationId | `cloud.higherself.app` |
| Version | `1.0` (iOS `MARKETING_VERSION`, Android `versionName`) |
| Build number | `1` (iOS `CURRENT_PROJECT_VERSION`, Android `versionCode`) |
| Deep link scheme | `higherself://` |
| iOS deployment target | 15.0 |
| Android min / target SDK | 24 / 36 |

Bump the build number on **every** upload, including rejected ones. Neither store
accepts a duplicate.

---

## Done in the repo

- **Android platform added** (`android/`) with all 9 Capacitor plugins registered.
- **Android permissions** declared: `INTERNET`, `RECORD_AUDIO`,
  `MODIFY_AUDIO_SETTINGS`, `POST_NOTIFICATIONS`, `VIBRATE`. Microphone is marked
  `required="false"` so the app stays installable on mic-less devices.
- **Android deep link** intent filter for `higherself://oauth/callback`, matching
  the iOS `CFBundleURLSchemes` entry. `custom_url_scheme` corrected from the
  Capacitor default (`cloud.higherself.app`) to `higherself`.
- **App icons and splash screens** regenerated from the brand emblem for both
  platforms. The Capacitor placeholder (blue "C" on a white grid) is gone — that
  alone is an automatic App Store rejection. Regenerate any time with
  `python3 scripts/generate-app-assets.py && npx cap sync`.
- **iOS privacy manifest** (`ios/App/App/PrivacyInfo.xcprivacy`), required by
  Apple since May 2024, registered in the Xcode project's Resources build phase.
- **iOS Info.plist cleanup**: removed `NSCameraUsageDescription` (the app has no
  camera feature — declaring a permission you don't use violates Guideline 5.1.1,
  and "for future features" is the exact phrasing reviewers flag); replaced the
  legacy `armv7` device capability with `arm64`; locked iPhone orientation to
  portrait to match the app's mobile-first layout and the PWA manifest.
- **Native API base URL** (`client/src/lib/apiBase.ts`), defaulting to
  `https://themirroredapp.com`. See the blocker below.
- **iPhone-only target** (`TARGETED_DEVICE_FAMILY = "1"`), and the now-redundant
  `UISupportedInterfaceOrientations~ipad` key removed. No iPad screenshot set or
  iPad review pass needed.
- **Keystore files gitignored** so a signing key can never be committed.
- **PII removed from production logs** — the compiled prompt context (values,
  goals, vision, beliefs, mood) is now development-only.

---

## Blocking — must be resolved before any build works on device

### 1. Confirm `themirroredapp.com` is serving the API

On the web, the app and API share an origin, so `/api/trpc` works. Inside a
Capacitor WebView the bundle is served from `capacitor://localhost` (iOS) or
`http://localhost` (Android), so a relative path resolves to the packaged assets
and **every API call fails**. The app would install, launch, and then do nothing.

`client/src/lib/apiBase.ts` now defaults native builds to
`https://themirroredapp.com` and stays relative on web. Override for staging:

```bash
VITE_API_BASE_URL=https://staging.themirroredapp.com pnpm cap:build
```

The stale `higherself.cloud` references in `lib/metadata.ts`,
`lib/structuredData.ts`, and the Notifications page were repointed to
`themirroredapp.com`. Two references were deliberately left alone:

- `server/pushNotifications.ts:22` — the VAPID contact is
  `mailto:hello@higherself.cloud`. It only needs to be a reachable inbox, and
  changing it to an address that doesn't exist yet would be worse. Update it
  once `hello@themirroredapp.com` is live.
- `client/src/lib/structuredData.ts` still names the organisation "Higher Self"
  and links `twitter.com/higherself` and similar. That's rebranding, not domain
  consolidation — see `REBRANDING_WORKFLOW.md`. Worth finishing before launch so
  the store listing and schema.org data agree.

### 2. Server CORS for the native origin

Native requests arrive from `capacitor://localhost` / `http://localhost`, not
from your domain. The server must allow those origins. Auth is Bearer-token
based, so cookies aren't needed cross-origin — but the tRPC endpoint still needs
permissive CORS headers or the WebView will block every response.

### 3. Verify the native OAuth token exchange on a real device

`getLoginUrl()` builds `state` from `window.location.origin`, which on native is
`capacitor://localhost`. `startNativeLogin()` then overrides the `redirectUri`
query param to the deep link, but `state` still encodes the WebView origin. If
the OAuth SDK decodes `redirect_uri` from `state` during
`exchangeCodeForToken` — which the comment in `server/_core/oauth.ts:42` says it
does — the exchange may fail with a `redirect_uri` mismatch.

The native branch (`clientType === "native"`) looks correct, so this may already
work. I did not change it because this area was stabilised recently and I can't
test the OAuth portal from here. **Test sign-in on a physical device before
submitting** — a broken sign-in is an instant rejection on both stores.

### 4. Firebase config for Android push

FCM requires `android/app/google-services.json` from the Firebase console, plus
the Google Services Gradle plugin. Without it the app builds but push silently
never arrives — and push is load-bearing here (lesson unlocks, Echoes, the
"your Higher Self is calling" outbound call).

---

## Decisions only you can make

**iOS background modes.** `UIBackgroundModes` declares `audio` and
`remote-notification`. Guideline 2.5.4 rejects background modes the app doesn't
genuinely use.
- `audio` is defensible if voice sessions must survive a screen lock — be ready
  to explain it in review notes.
- `remote-notification` is for *silent* pushes. Nothing in
  `server/pushNotifications.ts` sends `content-available`, so this one is
  currently unused. Consider removing it.

**Subscription billing.** Both stores require their own IAP for digital content —
you cannot use Stripe inside the app. `@revenuecat/purchases-capacitor` is
installed and `VITE_REVENUECAT_IOS_KEY` / `VITE_REVENUECAT_ANDROID_KEY` are
wired, so the plumbing exists, but the products must be created in App Store
Connect and Play Console and mapped in RevenueCat. Four SKUs, per
`server/_core/stripe-products.ts`:

| Tier | Monthly | Annual |
|---|---|---|
| Pro | $9.99 | $104.99 |
| Premium Pro (adds voice) | $13.99 | $149.99 |

Also confirm the 10-day trial is modelled as a store-level introductory offer,
not just a server-side flag — the stores need to display it.

---

## Apple App Store

**Needs:** a Mac with Xcode, Apple Developer Program ($99/yr).

1. `VITE_API_BASE_URL=... pnpm cap:build && npx cap open ios`
2. Signing & Capabilities → select your team; enable Push Notifications and
   In-App Purchase.
3. Product → Archive → Distribute App → App Store Connect.
4. On the archive, run **Generate Privacy Report** and confirm no dependency
   pulls in a required-reason API beyond the `UserDefaults` entry already
   declared in `PrivacyInfo.xcprivacy`.

**App Privacy questionnaire** — must match `PrivacyInfo.xcprivacy` exactly.
Declared there: email, name, user ID, purchase history, health (mood + domain
scores), audio data (voice), sensitive info (beliefs/reflections), other user
content (journal + chat). All linked to identity, none used for tracking.

**Screenshots:** 6.9" and 6.5" iPhone. No iPad set needed — the target is
iPhone-only.

**Age rating:** expect 12+ or 17+. The app handles mental-health content and has
crisis detection. Answer the "Medical/Treatment Information" question honestly —
this is a wellness app, not a medical device, and the listing must not claim to
diagnose or treat.

**Guideline 5.1.1(v) — account deletion:** satisfied. `Settings.tsx` has an
in-app delete flow with type-to-confirm, calling `auth.deleteAccount` →
`deleteUserAccount()`, which clears 25+ tables.

**Review notes — write these.** Reviewers will find the crisis-detection
behaviour and the "Higher Self is calling" push. Explain up front:
- The app is a self-reflection and journaling tool, not therapy or medical advice.
- Crisis keyword detection (`server/_core/safety.ts`) is a *safety* feature: it
  intercepts before any AI call and returns a fixed response with resources.
- Provide a demo account. There is a `/demo` route backed by
  `server/demoInterceptor.ts` that serves fixture data without touching the
  database — point the reviewer at it so they aren't blocked by OAuth.
- Note that the 10-day trial gates most features, so a fresh account sees a
  different app than a subscriber.

---

## Google Play

**Needs:** Play Console account ($25 one-time).

1. Generate an upload keystore, keep it **outside** the repo, and back it up.
   Losing it means you can never update the app.
   ```bash
   keytool -genkey -v -keystore mirrored-upload.jks -keyalg RSA \
     -keysize 2048 -validity 10000 -alias mirrored
   ```
2. Wire it via `android/keystore.properties` (already gitignored) and a
   `signingConfigs` block in `android/app/build.gradle`.
3. `VITE_API_BASE_URL=... pnpm cap:build && npx cap open android`, then
   Build → Generate Signed Bundle → **AAB** (Play does not accept APKs for new apps).

**Data safety form** — separate from Apple's, and stricter about third parties.
Disclose that content is processed by external AI providers: the LLM gateway,
Gemini (embeddings + session valence), Hume (voice + prosody), and ElevenLabs
(TTS). Declare encryption in transit and the in-app deletion path.

**Health apps declaration:** Play will ask whether this is a health app. It's
wellness/lifestyle, not medical — but you must not imply diagnosis or treatment
in the listing copy.

**Sensitive permissions:** `RECORD_AUDIO` needs an in-listing justification.
Explain it powers the Voice Mirror conversation feature and is requested at point
of use, not at launch.

**Target API level:** 36 — current and compliant.

---

## Samsung Galaxy Store

**Needs:** Samsung Developer account (free).

Samsung accepts the **same signed AAB or APK** as Play, so build once and upload
to both. Differences:

- Galaxy Store still accepts APKs, which can be simpler for a first submission.
- Separate store listing, screenshots, and age rating (Samsung uses its own
  questionnaire rather than IARC in some regions).
- IAP: Samsung has its own billing SDK. RevenueCat does **not** support Samsung
  IAP. Options: ship Samsung as a free/limited build, or integrate Samsung IAP
  directly. Decide before you submit — this is the one place your billing
  abstraction doesn't reach.
- Review is typically faster than Apple's but stricter about listing metadata
  matching in-app content.

---

## Pre-submission checklist

- [ ] `themirroredapp.com` confirmed live and serving `/api/trpc`
- [ ] Server CORS allows `capacitor://localhost` and `http://localhost`
- [ ] Sign-in tested end-to-end on a **physical** iPhone and Android device
- [ ] `google-services.json` added; push received on both platforms
- [ ] Voice session tested on device (mic permission prompt, audio in/out)
- [ ] IAP products created in both consoles and mapped in RevenueCat
- [ ] Samsung billing decision made
- [ ] `remote-notification` background mode kept or removed
- [ ] Privacy policy and terms reachable at public URLs (pages exist at
      `/privacy` and `/terms`; the policy lists `support@mirrored.com` — confirm
      that inbox is live, both stores email it)
- [ ] Screenshots captured for every required size
- [ ] Demo account or `/demo` route documented in review notes
- [ ] Build number bumped

---

## Known non-blockers

- **Bundle size.** The main chunk is 2.6 MB (717 KB gzipped), plus large
  syntax-highlighting grammars (`cpp`, `emacs-lisp`, `wasm`, `cytoscape`) pulled
  in by `streamdown`. Bundled locally in the native app so there's no download
  cost, but it slows first paint and bloats the web build. Worth code-splitting
  later.
- **Program lesson unlock uses a fixed UTC-5 offset**
  (`server/routers/programs.ts:27`), so during daylight saving (March–November)
  lessons unlock at 7 AM Eastern while the client countdown — which uses real
  `America/New_York` — displays 6 AM. Cosmetic mismatch, not a rejection risk,
  but users will notice.
