import {
  Clock,
  GitCompareArrows,
  Receipt,
  Sparkles,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { getCurrentMerchant } from "@/lib/session";
import { getAnalytics } from "@/lib/analytics";
import { cogneeConfigured } from "@/lib/cognee";
import { CategoryBarChart, TaxSplitChart, TrendChart } from "@/components/Charts";
import { Card, StatCard } from "@/components/ui";
import { inr, inNum } from "@/lib/utils";
import { MemoryCard } from "./MemoryCard";

export default async function AnalyticsPage() {
  const merchant = (await getCurrentMerchant())!;
  const a = await getAnalytics(merchant.id);
  const reconPct = Math.round(a.reconciliationRate * 100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[1.9rem] font-light tracking-tight text-ink">Analytics &amp; impact</h1>
        <p className="mt-1 text-sm text-ink-muted">
          What Hisaab has done for {merchant.businessName}, measured, not claimed.
        </p>
      </div>

      {/* Impact banner */}
      <div className="relative overflow-hidden rounded-2xl bg-ink p-6 text-white md:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-brand-500/30 blur-3xl" />
        <div className="relative">
          <p className="flex items-center gap-2 text-sm text-white/60">
            <Sparkles className="h-4 w-4 text-brand-300" /> Your impact so far
          </p>
          <p className="mt-3 max-w-3xl text-2xl font-light leading-snug tracking-tight md:text-[2rem]">
            Hisaab processed <NumHi>{inNum(a.invoicesProcessed)}</NumHi> invoices, reconciled{" "}
            <NumHi>{inNum(a.settlementsReconciled)}</NumHi> Paytm settlements, and identified{" "}
            <NumHi>{inr(a.totals.itcIdentified)}</NumHi> of input tax credit.
          </p>
          <div className="mt-6 flex flex-wrap gap-x-10 gap-y-4">
            <BannerStat icon={<Clock className="h-4 w-4" />} value={`${a.hoursSaved} hrs`} label="Manual work saved" />
            <BannerStat icon={<GitCompareArrows className="h-4 w-4" />} value={`${reconPct}%`} label="GSTR-2B match rate" />
            <BannerStat icon={<Wallet className="h-4 w-4" />} value={inr(a.totals.itcAtRisk)} label="ITC still recoverable" />
          </div>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="ITC identified" value={inr(a.totals.itcIdentified)} hint="all eligible invoices" tone="brand" icon={<Wallet className="h-4 w-4" />} />
        <StatCard label="ITC claimed" value={inr(a.totals.itcClaimed)} hint="approved & filed-ready" tone="success" icon={<TrendingUp className="h-4 w-4" />} />
        <StatCard label="ITC at risk" value={inr(a.totals.itcAtRisk)} hint="pending review" tone={a.totals.itcAtRisk > 0 ? "warning" : "success"} icon={<Sparkles className="h-4 w-4" />} />
        <StatCard label="Invoices processed" value={inNum(a.invoicesProcessed)} hint={`${a.returnsDrafted} returns drafted`} icon={<Receipt className="h-4 w-4" />} />
      </div>

      {/* Cognee knowledge memory */}
      <MemoryCard
        configured={cogneeConfigured()}
        syncedAt={merchant.cogneeSyncedAt ? merchant.cogneeSyncedAt.toISOString() : null}
      />

      {/* Trend */}
      <Card>
        <h2 className="mb-1 text-sm font-semibold text-ink">Tax position, last 6 months</h2>
        <p className="mb-3 text-xs text-ink-muted">Output tax vs. ITC claimed vs. net payable</p>
        <TrendChart data={a.trend} />
      </Card>

      {/* Splits */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-ink">ITC recovery</h2>
          <TaxSplitChart data={a.recoverySplit} />
        </Card>
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-ink">GSTR-2B reconciliation</h2>
          <TaxSplitChart data={a.twoBSplit} />
        </Card>
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-ink">Sales by channel</h2>
          <TaxSplitChart data={a.channelSplit} />
        </Card>
      </div>

      {/* Category + suppliers */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-ink">Spend by category</h2>
          <CategoryBarChart data={a.categorySpend} />
        </Card>
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-ink">Top suppliers by input tax credit</h2>
          {a.topSuppliers.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-muted">No suppliers yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border text-left text-xs uppercase tracking-wide text-ink-muted">
                  <th className="py-2 font-semibold">Supplier</th>
                  <th className="py-2 text-right font-semibold">Invoices</th>
                  <th className="py-2 text-right font-semibold">ITC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {a.topSuppliers.map((s) => (
                  <tr key={s.name}>
                    <td className="py-2.5 font-medium text-ink">{s.name}</td>
                    <td className="py-2.5 text-right text-ink-soft">{s.invoices}</td>
                    <td className="tnum py-2.5 text-right font-medium text-success">{inr(s.itc)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      <p className="text-center text-xs text-ink-muted">
        Estimates use {inNum(8)} min saved per invoice and 45 min per return, replace with your own benchmarks in{" "}
        <code className="rounded bg-surface-muted px-1">src/lib/analytics.ts</code>.
      </p>
    </div>
  );
}

function NumHi({ children }: { children: React.ReactNode }) {
  return <span className="font-normal text-brand-200">{children}</span>;
}

function BannerStat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-brand-200">{icon}</div>
      <div>
        <p className="tnum text-lg font-semibold">{value}</p>
        <p className="text-xs text-white/50">{label}</p>
      </div>
    </div>
  );
}
