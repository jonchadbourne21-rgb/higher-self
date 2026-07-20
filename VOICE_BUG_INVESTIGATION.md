# Voice Disconnect Bug — Client-Side Investigation

## Date: Jul 20, 2026

## Symptom
User taps "Begin Session" → iPhone shows microphone indicator → immediately hangs up.
Status goes: disconnected → connecting → connected → disconnected in rapid succession.

## Server-Side: CONFIRMED HEALTHY
- HUME_API_KEY: present, valid (HTTP 200 from Hume configs API)
- Male config ID: exists, valid
- Female config ID (b5b9a42c-ef7e-42c6-bd7d-7495a10da489): exists, valid
- mintToken procedure: returns apiKey + configId correctly

## Client-Side Findings

### 1. AudioWorklet on Safari/iOS — HIGH PROBABILITY ROOT CAUSE

The `VoiceProvider` in App.tsx uses **default props**, which means:
- `enableAudioWorklet = true` (the default)

The SDK's `initPlayer()` (line 412) attempts to load:
```
https://storage.googleapis.com/evi-react-sdk-assets/audio-worklet-20250702.js
```

**On Safari/iOS**, AudioWorklet support is degraded (confirmed in SDK README line 67-70).
If this fetch fails or the worklet can't initialize:
1. `onError` fires with `audio_worklet_load_failure`
2. The error effect (line 1680-1683) catches it: `if (error !== null) → disconnectAndCleanUpResources()`
3. This tears down mic + socket + audio player → status becomes "disconnected"

The user sees: mic prompt → brief connection → immediate hangup.

### 2. Global Auth Error Handler — MEDIUM PROBABILITY

In `main.tsx` (lines 35-48), ANY tRPC query/mutation error with `UNAUTHORIZED` code triggers:
- Token removal
- Full page redirect to login

If a background query (e.g., `chat.sessions`, `chat.getLastSession`) returns 401 while voice is active:
- The entire app unmounts
- VoiceProvider's cleanup effect (line 1685-1697) fires `disconnectAndCleanUpResources()`
- User sees mic briefly appear then page redirects

### 3. SDK Cleanup on VoiceProvider Unmount — LOW PROBABILITY (but relevant)

Line 1685-1697 in the SDK:
```js
useEffect(() => {
  return () => {
    void disconnectAndCleanUpResources().then(() => {
      setStatus({ value: "disconnected" });
    });
  };
}, []);
```

If VoiceProvider re-mounts (e.g., due to parent re-render with key change), this cleanup fires.
Currently VoiceProvider wraps the entire app in App.tsx with no key prop, so this is unlikely
unless the ErrorBoundary catches and re-renders.

### 4. MIME Type Not Supported — LOW PROBABILITY

Line 264-270: On mount, the SDK checks `getBrowserSupportedMimeType()`.
If no supported MIME type is found, it fires `onError("mime_types_not_supported")`.
This would cascade into the auto-disconnect effect.
However, modern iOS Safari supports `audio/webm` or `audio/mp4`, so this is unlikely.

## Recommended Fix (in priority order)

### Fix 1: Disable AudioWorklet on iOS/Safari
Add `enableAudioWorklet={false}` to VoiceProvider for Safari:
```tsx
const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
<VoiceProvider enableAudioWorklet={!isSafari}>
```

### Fix 2: Add onError handler to VoiceProvider for diagnosis
```tsx
<VoiceProvider
  onError={(err) => console.error("[Voice Error]", err)}
  onClose={(event) => console.log("[Voice Close]", event.code, event.reason)}
>
```

### Fix 3: Prevent auth redirect during active voice session
In main.tsx, check if voice is active before redirecting on auth errors.

## VOW Scar Record
- NEVER modify the voice connection flow without first reproducing the bug
- The SDK has internal auto-disconnect on ANY error type — changes that introduce errors cascade
- AudioWorklet is the #1 Safari failure point in this SDK version (0.2.14)
- Previous attempts to "fix" voice by modifying AnimatePresence/layout props were unrelated to the actual disconnect cause
