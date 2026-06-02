# Hume TTS API Reference

## Endpoint
POST https://api.hume.ai/v0/tts/file

## Authentication
Header: X-Hume-Api-Key: <apiKey>

## Request Body
```json
{
  "utterances": [
    {
      "text": "The text to synthesize",
      "description": "Voice description/acting instructions"
    }
  ],
  "format": {
    "type": "mp3"
  },
  "num_generations": 1
}
```

## Key Parameters
- utterances[].text: The input text to synthesize (required)
- utterances[].description: Acting instructions for tone/emotion (optional)
- utterances[].voice: Voice specification (optional - if omitted, generates novel voice)
- format.type: "mp3" or "wav"
- num_generations: 1-5

## Response
Returns the audio file directly in the response body.

## Notes
- Auth via X-Hume-Api-Key header
- HUME_API_KEY env var is already available in the project
- Returns binary audio data in the specified format
