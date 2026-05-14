import { ElevenLabsClient } from "elevenlabs";

// Initialize ElevenLabs client
const client = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY || "",
});

// Default voice: "Rachel" - warm, empathetic female voice ideal for coaching
// Can be changed to other voices like "Adam", "Antoni", "Bella", etc.
const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // Rachel

/**
 * Generate speech audio from text using ElevenLabs TTS
 * Returns a Buffer of mp3 audio data
 */
export async function textToSpeech(
  text: string,
  voiceId: string = DEFAULT_VOICE_ID
): Promise<Buffer> {
  const audioStream = await client.textToSpeech.convert(voiceId, {
    text,
    model_id: "eleven_turbo_v2_5", // Low latency model for real-time feel
    output_format: "mp3_44100_128",
    voice_settings: {
      stability: 0.5,
      similarity_boost: 0.75,
      style: 0.3, // Slight expressiveness for empathetic tone
      use_speaker_boost: true,
    },
  });

  // Collect stream into buffer
  const chunks: Buffer[] = [];
  for await (const chunk of audioStream) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

/**
 * Generate speech and return as base64 data URL for easy frontend playback
 */
export async function textToSpeechBase64(
  text: string,
  voiceId: string = DEFAULT_VOICE_ID
): Promise<string> {
  const audioBuffer = await textToSpeech(text, voiceId);
  const base64 = audioBuffer.toString("base64");
  return `data:audio/mpeg;base64,${base64}`;
}
