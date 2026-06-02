/**
 * Hume Octave TTS — Text-to-Speech via REST API
 *
 * Uses Hume's /v0/tts/file endpoint to generate audio.
 * Returns a Buffer of mp3 audio data.
 */

const HUME_API_KEY = process.env.HUME_API_KEY ?? "";

export interface HumeTtsOptions {
  text: string;
  /** Acting instructions for tone/emotion/style */
  description?: string;
  /** Voice name from Hume voice library (optional — generates novel voice if omitted) */
  voiceName?: string;
  /** Voice provider: 'HUME_AI' for built-in voices, 'CUSTOM_VOICE' for library voices */
  provider?: "HUME_AI" | "CUSTOM_VOICE";
  /** Speaking speed 0.5-2.0 (optional, model auto-selects) */
  speed?: number;
}

/**
 * Generate speech audio from text using Hume Octave TTS
 * Returns a Buffer of mp3 audio data
 */
export async function humeTextToSpeech(options: HumeTtsOptions): Promise<Buffer> {
  if (!HUME_API_KEY) {
    throw new Error("HUME_API_KEY not set — cannot generate TTS audio");
  }

  const utterance: Record<string, unknown> = {
    text: options.text,
  };

  if (options.description) {
    utterance.description = options.description;
  }

  if (options.voiceName) {
    utterance.voice = {
      name: options.voiceName,
      ...(options.provider ? { provider: options.provider } : {}),
    };
  }

  if (options.speed) {
    utterance.speed = options.speed;
  }

  const body = {
    utterances: [utterance],
    format: { type: "mp3" },
    num_generations: 1,
  };

  const response = await fetch("https://api.hume.ai/v0/tts/file", {
    method: "POST",
    headers: {
      "X-Hume-Api-Key": HUME_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(`Hume TTS failed (${response.status}): ${errorText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
