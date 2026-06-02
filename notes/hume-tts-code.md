# Hume TTS TypeScript Code Pattern

Uses the `hume` npm package:
```ts
import { HumeClient } from 'hume';

const hume = new HumeClient({ apiKey });

// For file output (non-streaming):
const response = await hume.tts.synthesizeFile({
  utterances: [
    {
      text: "The text to synthesize",
      description: "Acting instructions for tone/emotion",
      voice: { name: 'Ava Song', provider: 'HUME_AI' as const }
    }
  ],
  format: { type: "mp3" }
});
// response is binary audio data

// For JSON streaming:
const stream = await hume.tts.synthesizeJsonStreaming({
  utterances: [utterance],
  stripHeaders: true
});
for await (const chunk of stream) {
  if (chunk.type === 'audio') {
    const buffer = Buffer.from(chunk.audio, 'base64');
  }
}
```

## Direct REST API (no SDK):
POST https://api.hume.ai/v0/tts/file
Headers: X-Hume-Api-Key: <key>, Content-Type: application/json
Body: { utterances: [...], format: { type: "mp3" } }
Response: binary audio file
