// ElevenLabs client, expressive text-to-speech (model eleven_v3).
// Primary voice for spoken answers; Sarvam (src/lib/sarvam.ts) is the
// fallback whenever this is unset or a call fails. Never throws to the
// caller, failures just return null so the caller can fall back.

const BASE = "https://api.elevenlabs.io/v1";
const KEY = process.env.ELEVENLABS_API_KEY ?? "";
const MODEL = process.env.ELEVENLABS_MODEL || "eleven_v3";
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM"; // Rachel, multilingual-capable
const STABILITY = Number(process.env.ELEVENLABS_STABILITY ?? "0.4");
const STYLE = Number(process.env.ELEVENLABS_STYLE ?? "0.65");
const SIMILARITY_BOOST = Number(process.env.ELEVENLABS_SIMILARITY_BOOST ?? "0.8");

export function elevenLabsConfigured(): boolean {
  return Boolean(KEY);
}

/**
 * Synthesize expressive speech with ElevenLabs v3. Returns base64 MP3, or
 * null so the caller falls back to Sarvam / browser TTS.
 *
 * Voice settings are tuned for expressiveness by default: lower stability
 * and higher style let the v3 model vary delivery and emotion instead of
 * reading everything in one flat tone.
 */
export async function elevenLabsTts(text: string): Promise<string | null> {
  if (!KEY || !text.trim()) return null;
  try {
    const res = await fetch(`${BASE}/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128`, {
      method: "POST",
      headers: {
        "xi-api-key": KEY,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text: text.slice(0, 4800),
        model_id: MODEL,
        voice_settings: {
          stability: STABILITY,
          similarity_boost: SIMILARITY_BOOST,
          style: STYLE,
          use_speaker_boost: true,
        },
      }),
    });
    if (!res.ok) {
      console.warn("[elevenlabs.tts]", res.status, await res.text().catch(() => ""));
      return null;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (!buf.length) return null;
    return buf.toString("base64");
  } catch (err) {
    console.warn("[elevenlabs.tts] error:", (err as Error).message);
    return null;
  }
}
