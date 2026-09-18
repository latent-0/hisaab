import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentMerchant } from "@/lib/session";

/** Resolve or dismiss a review task. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const merchant = await getCurrentMerchant();
  if (!merchant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const task = await prisma.reviewTask.findUnique({ where: { id } });
  if (!task || task.merchantId !== merchant.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { action } = (await req.json().catch(() => ({}))) as { action?: string };
  const status = action === "dismiss" ? "dismissed" : "resolved";

  await prisma.reviewTask.update({
    where: { id },
    data: { status, resolvedBy: merchant.ownerName, resolvedAt: new Date() },
  });

  // If resolving, and there are no remaining open tasks on the invoice, approve it.
  if (status === "resolved" && task.invoiceId) {
    const remaining = await prisma.reviewTask.count({
      where: { invoiceId: task.invoiceId, status: "open" },
    });
    if (remaining === 0) {
      await prisma.purchaseInvoice.update({
        where: { id: task.invoiceId },
        data: { status: "approved" },
      });
    }
  }

  return NextResponse.json({ ok: true });
}
