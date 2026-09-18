import { NextResponse } from "next/server";
import { cogneeConfigured, cogneeSearch, datasetFor } from "@/lib/cognee";
import { getCurrentMerchant } from "@/lib/session";
import { sarvamConfigured, sarvamTranslate } from "@/lib/sarvam";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Ask a natural-language question grounded in the merchant's GST knowledge graph. */
export async function POST(req: Request) {
  const merchant = await getCurrentMerchant();
  if (!merchant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!cogneeConfigured()) {
    return NextResponse.json({ configured: false, answer: null });
  }

  const { question } = (await req.json().catch(() => ({}))) as { question?: string };
  if (!question?.trim()) return NextResponse.json({ error: "Missing question" }, { status: 400 });

  const dataset = datasetFor(merchant.gstin);
  try {
    const answer = await cogneeSearch(dataset, question);
    // Cognee answers in English; localize to the merchant's language via Sarvam.
    let localized = answer;
    if (answer && merchant.language !== "en" && sarvamConfigured()) {
      localized = (await sarvamTranslate(answer, merchant.language, "en")) ?? answer;
    }
    return NextResponse.json({
      configured: true,
      synced: Boolean(merchant.cogneeSyncedAt),
      answer: localized,
      answerEn: localized !== answer ? answer : undefined,
    });
  } catch (err) {
    return NextResponse.json({ configured: true, answer: null, error: (err as Error).message }, { status: 502 });
  }
}
