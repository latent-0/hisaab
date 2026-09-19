import { NextResponse } from "next/server";
import { getCurrentMerchant } from "@/lib/session";
import { elevenLabsConfigured, elevenLabsTts } from "@/lib/elevenlabs";
import { sarvamConfigured, sarvamTts } from "@/lib/sarvam";

export const runtime = "nodejs";

/**
 * Synthesize an answer to speech. Tries ElevenLabs v3 first (expressive,
 * emotion-aware delivery), falls back to Sarvam (Indic-native) if
 * ElevenLabs is unset or the call fails, and finally to
 * { audio: null } so the client falls back to browser text-to-speech.
 */
export async function POST(req: Request) {
  const merchant = await getCurrentMerchant();
  if (!merchant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { text, language } = (await req.json().catch(() => ({}))) as { text?: string; language?: string };
  if (!text?.trim()) return NextResponse.json({ error: "Missing text" }, { status: 400 });

  if (elevenLabsConfigured()) {
    const audio = await elevenLabsTts(text);
    if (audio) return NextResponse.json({ audio, format: "mp3", provider: "elevenlabs" });
  }

  if (sarvamConfigured()) {
    const audio = await sarvamTts(text, language ?? merchant.language);
    if (audio) return NextResponse.json({ audio, format: "wav", provider: "sarvam" });
  }

  return NextResponse.json({ audio: null });
}
