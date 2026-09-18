import { NextResponse } from "next/server";
import { getEngine } from "@/lib/ai";
import { cogneeConfigured, cogneeSearch, datasetFor } from "@/lib/cognee";
import { prisma } from "@/lib/db";
import { computeDashboardStats } from "@/lib/returns";
import { sarvamConfigured, sarvamTranslate } from "@/lib/sarvam";
import { getCurrentMerchant } from "@/lib/session";
import { currentPeriod } from "@/lib/utils";

// Deeper "knowledge / history" questions are routed to the Cognee graph; quick
// current-month stat questions stay on the fast, precise facts engine.
const KNOWLEDGE_RE =
  /(which|who|whom|most|highest|top|largest|supplier|vendor|compare|versus|\bvs\b|trend|over time|last month|previous|quarter|blocked|why|history|when did|list|कौन|सबसे|सप्लायर|पिछले|क्यों|ब्लॉक)/i;

export async function POST(req: Request) {
  const merchant = await getCurrentMerchant();
  if (!merchant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { question, language } = (await req.json().catch(() => ({}))) as {
    question?: string;
    language?: string;
  };
  if (!question?.trim()) {
    return NextResponse.json({ error: "Missing question" }, { status: 400 });
  }

  const lang = language ?? merchant.language;
  const period = currentPeriod();

  // 1) Knowledge-graph path (Cognee) for history/relationship questions.
  if (cogneeConfigured() && merchant.cogneeSyncedAt && KNOWLEDGE_RE.test(question)) {
    try {
      const raw = await cogneeSearch(datasetFor(merchant.gstin), question);
      if (raw) {
        let answerText = raw;
        if (lang !== "en" && sarvamConfigured()) {
          answerText = (await sarvamTranslate(raw, lang, "en")) ?? raw;
        }
        await prisma.voiceQuery.create({
          data: { merchantId: merchant.id, language: lang, transcript: question, intent: "knowledge", answerText },
        });
        return NextResponse.json({ intent: "knowledge", answerText, source: "cognee" });
      }
    } catch {
      /* fall through to the facts engine */
    }
  }

  // 2) Fast facts engine for current-month stats.
  const stats = await computeDashboardStats(merchant.id, period);
  const result = await getEngine().answer({
    question,
    language: lang,
    period,
    facts: {
      salesTotal: stats.salesTotal,
      salesCount: stats.salesCount,
      itcThisMonth: stats.itcThisMonth,
      unclaimedItc: stats.unclaimedItc,
      outputTax: stats.outputTax,
      netPayable: stats.netPayable,
      flaggedCount: stats.flaggedCount,
      invoiceCount: stats.invoiceCount,
    },
  });

  await prisma.voiceQuery.create({
    data: {
      merchantId: merchant.id,
      language: lang,
      transcript: question,
      intent: result.intent,
      answerText: result.answerText,
    },
  });

  return NextResponse.json({ ...result, source: "engine" });
}
