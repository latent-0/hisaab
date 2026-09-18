import { NextResponse } from "next/server";
import { getCurrentMerchant } from "@/lib/session";
import { sarvamConfigured, sarvamStt } from "@/lib/sarvam";

export const runtime = "nodejs";

/** Transcribe recorded audio to text via Sarvam speech-to-text. */
export async function POST(req: Request) {
  const merchant = await getCurrentMerchant();
  if (!merchant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!sarvamConfigured()) return NextResponse.json({ transcript: null });

  const form = await req.formData().catch(() => null);
  const file = form?.get("audio") as File | null;
  if (!file || file.size === 0) return NextResponse.json({ error: "Missing audio" }, { status: 400 });

  const buf = Buffer.from(await file.arrayBuffer());
  // Let Sarvam auto-detect the language so merchants can speak any supported tongue.
  const result = await sarvamStt(buf, file.name || "audio.webm", file.type || "audio/webm");
  if (!result) return NextResponse.json({ transcript: null });
  return NextResponse.json(result);
}
