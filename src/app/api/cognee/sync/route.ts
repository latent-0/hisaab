import { NextResponse } from "next/server";
import { cogneeAdd, cogneeCognify, cogneeConfigured, datasetFor } from "@/lib/cognee";
import { buildMerchantKnowledge } from "@/lib/knowledge";
import { prisma } from "@/lib/db";
import { getCurrentMerchant } from "@/lib/session";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Push the merchant's GST knowledge into Cognee and trigger graph construction.
 * Graph build is async on Cognee's side (~30–60s); "ask" works once it's ready.
 */
export async function POST() {
  const merchant = await getCurrentMerchant();
  if (!merchant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!cogneeConfigured()) {
    return NextResponse.json({ error: "Cognee is not configured (set COGNEE_API_BASE and COGNEE_API_KEY)." }, { status: 503 });
  }

  const dataset = datasetFor(merchant.gstin);
  try {
    const knowledge = await buildMerchantKnowledge(merchant.id);
    await cogneeAdd(dataset, knowledge);
    await cogneeCognify(dataset);
    await prisma.merchant.update({
      where: { id: merchant.id },
      data: { cogneeSyncedAt: new Date() },
    });
    return NextResponse.json({ ok: true, dataset, syncedAt: new Date().toISOString() });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
