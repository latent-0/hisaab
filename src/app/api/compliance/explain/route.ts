import { NextResponse } from "next/server";
import { getEngine } from "@/lib/ai";
import { getCurrentMerchant } from "@/lib/session";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Explain a pasted GST/tax notice in plain language with next steps. */
export async function POST(req: Request) {
  const merchant = await getCurrentMerchant();
  if (!merchant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { notice } = (await req.json().catch(() => ({}))) as { notice?: string };
  if (!notice?.trim()) return NextResponse.json({ error: "Paste the notice text." }, { status: 400 });

  const result = await getEngine().explainNotice({ notice, language: merchant.language });
  return NextResponse.json(result);
}
