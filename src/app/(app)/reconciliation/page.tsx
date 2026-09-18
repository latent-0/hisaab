import { GitCompareArrows, QrCode, Radio, CreditCard, RefreshCw } from "lucide-react";
import { getCurrentMerchant } from "@/lib/session";
import { prisma } from "@/lib/db";
import { buildReturnData } from "@/lib/returns";
import { ActionButton } from "@/components/ActionButton";
import { Badge, Card, StatusBadge } from "@/components/ui";
import { currentPeriod, inr, periodLabel, round2 } from "@/lib/utils";

const CHANNEL_META: Record<string, { label: string; icon: typeof QrCode }> = {
  qr: { label: "QR", icon: QrCode },
  soundbox: { label: "Soundbox", icon: Radio },
  edc: { label: "EDC / card", icon: CreditCard },
};

export default async function ReconciliationPage() {
  const merchant = (await getCurrentMerchant())!;
  const period = currentPeriod();
  const data = await buildReturnData(merchant.id, period);

  const channelAgg = await prisma.salesTransaction.groupBy({
    by: ["channel"],
    where: { merchantId: merchant.id, period },
    _sum: { grossAmount: true, cgst: true, sgst: true, igst: true },
    _count: true,
  });

  const purchases = await prisma.purchaseInvoice.findMany({
    where: { merchantId: merchant.id, period },
    orderBy: { createdAt: "desc" },
  });

  const twoBGroups = {
    matched: purchases.filter((p) => p.gstr2bStatus === "matched"),
    missing: purchases.filter((p) => p.gstr2bStatus === "missing"),
    mismatch: purchases.filter((p) => p.gstr2bStatus === "mismatch"),
  };
  const sumGst = (arr: typeof purchases) => round2(arr.reduce((a, p) => a + p.cgst + p.sgst + p.igst, 0));

  const recentSettlements = await prisma.salesTransaction.findMany({
    where: { merchantId: merchant.id, period },
    orderBy: { settledAt: "desc" },
    take: 8,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[1.9rem] font-light tracking-tight text-ink">Reconciliation</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Two ledgers, finally talking, Paytm sales matched to purchase invoices for {periodLabel(period)}.
          </p>
        </div>
        <ActionButton url="/api/sales/sync" body={{ period }} variant="ghost">
          <RefreshCw className="h-4 w-4" /> Sync Paytm ledger
        </ActionButton>
      </div>

      {/* The two ledgers */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-brand-200 bg-brand-50/40">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Sales ledger · Paytm</p>
          <p className="mt-2 text-3xl font-bold text-ink">{inr(data.outwardSupplies.taxableValue)}</p>
          <p className="text-sm text-ink-muted">taxable · output tax {inr(data.outputTax)}</p>
          <div className="mt-4 space-y-2">
            {channelAgg.map((c) => {
              const meta = CHANNEL_META[c.channel] ?? { label: c.channel, icon: QrCode };
              const Icon = meta.icon;
              return (
                <div key={c.channel} className="flex items-center justify-between rounded-lg bg-surface px-3 py-2">
                  <span className="flex items-center gap-2 text-sm text-ink-soft">
                    <Icon className="h-4 w-4 text-brand-500" /> {meta.label}
                    <span className="text-xs text-ink-muted">· {c._count} txns</span>
                  </span>
                  <span className="text-sm font-medium text-ink">{inr(c._sum.grossAmount ?? 0)}</span>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Purchase ledger · Invoices</p>
          <p className="mt-2 text-3xl font-bold text-ink">{inr(data.itc.taxableValue + data.itc.blocked)}</p>
          <p className="text-sm text-ink-muted">
            ITC eligible {inr(data.itcClaimed)} · blocked {inr(data.itc.blocked)}
          </p>
          <div className="mt-4 space-y-2">
            <ReconRow label="Matched in GSTR-2B" count={twoBGroups.matched.length} amount={sumGst(twoBGroups.matched)} tone="green" />
            <ReconRow label="Not in GSTR-2B" count={twoBGroups.missing.length} amount={sumGst(twoBGroups.missing)} tone="amber" />
            <ReconRow label="Value mismatch" count={twoBGroups.mismatch.length} amount={sumGst(twoBGroups.mismatch)} tone="red" />
          </div>
        </Card>
      </div>

      {/* Net position */}
      <Card className="bg-ink text-white">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <GitCompareArrows className="h-6 w-6 text-brand-300" />
            <div>
              <p className="text-sm text-white/60">Net GST position for {periodLabel(period)}</p>
              <p className="text-2xl font-bold">{inr(data.netPayable)} <span className="text-base font-normal text-white/60">payable</span></p>
            </div>
          </div>
          <div className="flex gap-6 text-sm">
            <div><p className="text-white/50">Output tax</p><p className="font-semibold">{inr(data.outputTax)}</p></div>
            <div><p className="text-white/50">− ITC claimed</p><p className="font-semibold text-brand-200">{inr(data.itcClaimed)}</p></div>
            <div><p className="text-white/50">At risk</p><p className="font-semibold text-warning">{inr(data.itcAtRisk)}</p></div>
          </div>
        </div>
      </Card>

      {/* Per-rate breakdown */}
      <Card>
        <h2 className="mb-3 text-sm font-semibold text-ink">Rate-wise reconciliation</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border text-left text-xs uppercase tracking-wide text-ink-muted">
                <th className="py-2 font-semibold">Rate</th>
                <th className="py-2 text-right font-semibold">Sales taxable</th>
                <th className="py-2 text-right font-semibold">Output tax</th>
                <th className="py-2 text-right font-semibold">ITC taxable</th>
                <th className="py-2 text-right font-semibold">ITC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {[0, 5, 12, 18, 28].map((rate) => {
                const out = data.outwardSupplies.total.find((b) => b.rate === rate);
                const itc = data.itc.total.find((b) => b.rate === rate);
                if (!out && !itc) return null;
                return (
                  <tr key={rate}>
                    <td className="py-2.5"><Badge tone="blue">{rate}%</Badge></td>
                    <td className="py-2.5 text-right">{inr(out?.taxableValue ?? 0)}</td>
                    <td className="py-2.5 text-right">{inr((out?.cgst ?? 0) + (out?.sgst ?? 0) + (out?.igst ?? 0))}</td>
                    <td className="py-2.5 text-right text-ink-muted">{inr(itc?.taxableValue ?? 0)}</td>
                    <td className="py-2.5 text-right text-success">{inr((itc?.cgst ?? 0) + (itc?.sgst ?? 0) + (itc?.igst ?? 0))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Live settlements */}
      <Card>
        <h2 className="mb-3 text-sm font-semibold text-ink">Recent Paytm settlements</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border text-left text-xs uppercase tracking-wide text-ink-muted">
                <th className="py-2 font-semibold">Txn ID</th>
                <th className="py-2 font-semibold">Channel</th>
                <th className="py-2 font-semibold">Date</th>
                <th className="py-2 text-right font-semibold">Amount</th>
                <th className="py-2 text-right font-semibold">GST</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {recentSettlements.map((s) => (
                <tr key={s.id}>
                  <td className="py-2.5 font-mono text-xs text-ink-muted">{s.paytmTxnId}</td>
                  <td className="py-2.5">{CHANNEL_META[s.channel]?.label ?? s.channel}</td>
                  <td className="py-2.5 text-ink-soft">{new Date(s.settledAt).toLocaleDateString("en-IN")}</td>
                  <td className="py-2.5 text-right font-medium">{inr(s.grossAmount)}</td>
                  <td className="py-2.5 text-right text-ink-muted">{inr(s.cgst + s.sgst + s.igst)} <span className="text-xs">@{s.gstRate}%</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function ReconRow({ label, count, amount, tone }: { label: string; count: number; amount: number; tone: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-surface-muted px-3 py-2">
      <span className="flex items-center gap-2 text-sm text-ink-soft">
        <Badge tone={tone}>{count}</Badge> {label}
      </span>
      <span className="text-sm font-medium text-ink">{inr(amount)} ITC</span>
    </div>
  );
}
