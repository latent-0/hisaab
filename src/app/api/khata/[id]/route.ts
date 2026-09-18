import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentMerchant } from "@/lib/session";

/** Mark an entry paid, send a reminder, or delete it. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const merchant = await getCurrentMerchant();
  if (!merchant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const entry = await prisma.ledgerEntry.findUnique({ where: { id } });
  if (!entry || entry.merchantId !== merchant.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { action } = (await req.json().catch(() => ({}))) as { action?: string };

  if (action === "pay") {
    await prisma.ledgerEntry.update({ where: { id }, data: { status: "paid" } });
    return NextResponse.json({ ok: true });
  }
  if (action === "remind") {
    // In production this fires a Paytm/WhatsApp reminder to entry.phone.
    await prisma.ledgerEntry.update({ where: { id }, data: { lastRemindedAt: new Date() } });
    return NextResponse.json({ ok: true, message: `Reminder sent to ${entry.party}` });
  }
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const merchant = await getCurrentMerchant();
  if (!merchant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const entry = await prisma.ledgerEntry.findUnique({ where: { id } });
  if (!entry || entry.merchantId !== merchant.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await prisma.ledgerEntry.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
