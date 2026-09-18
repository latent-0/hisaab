import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { computeDashboardStats } from "@/lib/returns";
import { checkAutomationAuth } from "@/lib/automation";
import { currentPeriod, daysUntil, periodLabel, returnDueDate } from "@/lib/utils";

/**
 * n8n / cron entrypoint: for the current filing period, return each merchant's
 * unfiled GSTR-3B status, days to the due date, net payable, unclaimed ITC and
 * open review count, so a workflow can send WhatsApp/Slack/email reminders.
 * Bearer-token protected.
 */
export async function GET(req: Request) {
  const auth = checkAutomationAuth(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const url = new URL(req.url);
  const period = url.searchParams.get("period") ?? currentPeriod();
  const merchants = await prisma.merchant.findMany();
  const due = returnDueDate(period);
  const daysLeft = daysUntil(due);

  const reminders = [];
  for (const m of merchants) {
    const ret = await prisma.gstReturn.findUnique({
      where: { merchantId_period_type: { merchantId: m.id, period, type: "GSTR3B" } },
    });
    if (ret?.status === "filed") continue;
    const stats = await computeDashboardStats(m.id, period);
    reminders.push({
      gstin: m.gstin,
      business: m.businessName,
      owner: m.ownerName,
      phone: m.phone,
      language: m.language,
      period,
      periodLabel: periodLabel(period),
      dueDate: due.toISOString().slice(0, 10),
      daysLeft,
      status: ret?.status ?? "not_generated",
      netPayable: stats.netPayable,
      unclaimedItc: stats.unclaimedItc,
      openReviews: stats.reviewOpen,
      message:
        m.language === "hi"
          ? `${m.businessName}: ${periodLabel(period)} का GSTR-3B ${daysLeft} दिनों में देय है। ₹${stats.unclaimedItc} ITC अभी भी अनक्लेम्ड, ${stats.reviewOpen} आइटम समीक्षा के लिए बाकी।`
          : `${m.businessName}: GSTR-3B for ${periodLabel(period)} is due in ${daysLeft} days. ₹${stats.unclaimedItc} ITC still unclaimed, ${stats.reviewOpen} item(s) to review.`,
    });
  }

  return NextResponse.json({ ok: true, period, daysLeft, count: reminders.length, reminders });
}
