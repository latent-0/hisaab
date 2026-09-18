// Sarvam client, Indic speech + translation.
//   - Text-to-Speech (bulbul): speak answers in the merchant's language.
//   - Speech-to-Text (saarika): transcribe spoken Indic questions.
//   - Translate (mayura): localize English (e.g. Cognee) answers.
// All optional: if SARVAM_API_KEY is unset, callers fall back (browser
// speech / English text). Failures never throw to the user, they return null.

const BASE = "https://api.sarvam.ai";
const KEY = process.env.SARVAM_API_KEY ?? "";
const TTS_MODEL = process.env.SARVAM_TTS_MODEL || "bulbul:v3";
const TTS_SPEAKER = process.env.SARVAM_TTS_SPEAKER || "anushka";
const STT_MODEL = process.env.SARVAM_STT_MODEL || ""; // empty → API default

// App language code → Sarvam BCP-47-ish code.
const LANG: Record<string, string> = {
  en: "en-IN",
  hi: "hi-IN",
  ta: "ta-IN",
  te: "te-IN",
  kn: "kn-IN",
  mr: "mr-IN",
  bn: "bn-IN",
  gu: "gu-IN",
};

export function sarvamLang(code: string): string {
  return LANG[code] ?? "en-IN";
}

export function sarvamConfigured(): boolean {
  return Boolean(KEY);
}

function headers(extra?: Record<string, string>): Record<string, string> {
  return { "api-subscription-key": KEY, ...(extra ?? {}) };
}

// bulbul:v3 speakers (fallback to a safe default if an env speaker is invalid).
const V3_SPEAKERS = new Set([
  "aditya", "ritu", "ashutosh", "priya", "neha", "rahul", "pooja", "rohan", "simran",
  "kavya", "amit", "dev", "ishita", "shreya", "ratan", "varun", "manan", "sumit", "roopa",
  "kabir", "aayan", "shubh", "advait", "anand", "tanya", "tarun", "sunny", "mani", "gokul",
  "vijay", "shruti", "suhani", "mohit", "kavitha", "rehan", "soham", "rupali",
]);

function speakerFor(): string {
  if (TTS_MODEL.startsWith("bulbul:v3")) {
    return V3_SPEAKERS.has(TTS_SPEAKER) ? TTS_SPEAKER : "priya";
  }
  return TTS_SPEAKER;
}

/** Synthesize speech; returns base64 WAV, or null to let the caller fall back. */
export async function sarvamTts(text: string, langCode: string): Promise<string | null> {
  if (!KEY || !text.trim()) return null;
  try {
    const res = await fetch(`${BASE}/text-to-speech`, {
      method: "POST",
      headers: headers({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        text: text.slice(0, 2400),
        target_language_code: sarvamLang(langCode),
        model: TTS_MODEL,
        speaker: speakerFor(),
        output_audio_codec: "wav",
      }),
    });
    if (!res.ok) {
      console.warn("[sarvam.tts]", res.status, await res.text());
      return null;
    }
    const data = (await res.json()) as { audios?: string[] };
    return data.audios?.[0] ?? null;
  } catch (err) {
    console.warn("[sarvam.tts] error:", (err as Error).message);
    return null;
  }
}

/** Transcribe an audio buffer; returns transcript + detected language, or null. */
export async function sarvamStt(
  audio: Buffer,
  filename: string,
  mimeType: string,
  langCode?: string,
): Promise<{ transcript: string; language: string | null } | null> {
  if (!KEY) return null;
  try {
    const form = new FormData();
    form.append("file", new Blob([new Uint8Array(audio)], { type: mimeType || "audio/wav" }), filename);
    form.append("language_code", langCode ? sarvamLang(langCode) : "unknown");
    if (STT_MODEL) form.append("model", STT_MODEL);
    const res = await fetch(`${BASE}/speech-to-text`, { method: "POST", headers: headers(), body: form });
    if (!res.ok) {
      console.warn("[sarvam.stt]", res.status, await res.text());
      return null;
    }
    const data = (await res.json()) as { transcript?: string; language_code?: string | null };
    if (!data.transcript) return null;
    return { transcript: data.transcript, language: data.language_code ?? null };
  } catch (err) {
    console.warn("[sarvam.stt] error:", (err as Error).message);
    return null;
  }
}

/** Translate text into a target app-language; returns null on failure. */
export async function sarvamTranslate(
  input: string,
  targetLangCode: string,
  sourceLangCode = "auto",
): Promise<string | null> {
  if (!KEY || !input.trim()) return null;
  // No-op if already the target language.
  if (targetLangCode === "en") return input;
  try {
    const res = await fetch(`${BASE}/translate`, {
      method: "POST",
      headers: headers({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        input: input.slice(0, 1000),
        source_language_code: sourceLangCode === "auto" ? "auto" : sarvamLang(sourceLangCode),
        target_language_code: sarvamLang(targetLangCode),
        model: "mayura:v1",
      }),
    });
    if (!res.ok) {
      console.warn("[sarvam.translate]", res.status, await res.text());
      return null;
    }
    const data = (await res.json()) as { translated_text?: string };
    return data.translated_text ?? null;
  } catch (err) {
    console.warn("[sarvam.translate] error:", (err as Error).message);
    return null;
  }
}
