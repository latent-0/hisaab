import { ArrowDownLeft, ArrowUpRight, WalletMinimal } from "lucide-react";
import { getCurrentMerchant } from "@/lib/session";
import { prisma } from "@/lib/db";
import { StatCard } from "@/components/ui";
import { inr, round2 } from "@/lib/utils";
import { KhataClient, type KhataEntry } from "./KhataClient";

export default async function KhataPage() {
  const merchant = (await getCurrentMerchant())!;
  const rows = await prisma.ledgerEntry.findMany({
    where: { merchantId: merchant.id },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
  });

  const now = Date.now();
  const entries: KhataEntry[] = rows.map((r) => ({
    id: r.id,
    party: r.party,
    phone: r.phone,
    kind: r.kind as "receivable" | "payable",
    amount: r.amount,
    note: r.note,
    dueDate: r.dueDate ? r.dueDate.toISOString() : null,
    status: r.status as "open" | "paid",
    overdue: !!r.dueDate && r.status === "open" && r.dueDate.getTime() < now,
  }));

  const openRecv = entries.filter((e) => e.kind === "receivable" && e.status === "open");
  const openPay = entries.filter((e) => e.kind === "payable" && e.status === "open");
  const toReceive = round2(openRecv.reduce((a, e) => a + e.amount, 0));
  const toPay = round2(openPay.reduce((a, e) => a + e.amount, 0));
  const overdue = round2(openRecv.filter((e) => e.overdue).reduce((a, e) => a + e.amount, 0));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[1.9rem] font-light tracking-tight text-ink">Khata — udhaar &amp; dues</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Track who owes you and what you owe. Send a reminder in a tap instead of chasing on paper.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="You'll receive" value={inr(toReceive)} hint={`${openRecv.length} customers`} tone="success" icon={<ArrowDownLeft className="h-4 w-4" />} />
        <StatCard label="Overdue" value={inr(overdue)} hint={overdue > 0 ? "send reminders" : "all on time"} tone={overdue > 0 ? "warning" : "success"} icon={<WalletMinimal className="h-4 w-4" />} />
        <StatCard label="You'll pay" value={inr(toPay)} hint={`${openPay.length} suppliers`} icon={<ArrowUpRight className="h-4 w-4" />} />
      </div>

      <KhataClient entries={entries} />
    </div>
  );
}
