import { NextResponse } from "next/server";
import { getCurrentMerchant } from "@/lib/session";
import { sarvamConfigured, sarvamTts } from "@/lib/sarvam";

export const runtime = "nodejs";

/** Synthesize an answer to Indic speech via Sarvam. Returns base64 WAV, or
 * { audio: null } so the client falls back to browser text-to-speech. */
export async function POST(req: Request) {
  const merchant = await getCurrentMerchant();
  if (!merchant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!sarvamConfigured()) return NextResponse.json({ audio: null });

  const { text, language } = (await req.json().catch(() => ({}))) as { text?: string; language?: string };
  if (!text?.trim()) return NextResponse.json({ error: "Missing text" }, { status: 400 });

  const audio = await sarvamTts(text, language ?? merchant.language);
  return NextResponse.json({ audio, format: "wav" });
}
