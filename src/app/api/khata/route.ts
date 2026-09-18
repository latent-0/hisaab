import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentMerchant } from "@/lib/session";

/** Add a khata entry (receivable / udhaar or payable). */
export async function POST(req: Request) {
  const merchant = await getCurrentMerchant();
  if (!merchant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const party = String(b.party ?? "").trim();
  const amount = Number(b.amount);
  const kind = b.kind === "payable" ? "payable" : "receivable";
  if (!party || !Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Enter a name and a valid amount." }, { status: 400 });
  }

  await prisma.ledgerEntry.create({
    data: {
      merchantId: merchant.id,
      party,
      kind,
      amount,
      phone: b.phone ? String(b.phone) : null,
      note: b.note ? String(b.note) : null,
      dueDate: b.dueDate ? new Date(String(b.dueDate)) : null,
    },
  });
  return NextResponse.json({ ok: true });
}
