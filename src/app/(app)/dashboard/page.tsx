import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  IndianRupee,
  Mic,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { getCurrentMerchant } from "@/lib/session";
import { buildReturnData, computeDashboardStats } from "@/lib/returns";
import { prisma } from "@/lib/db";
import { SalesTrendChart, TaxSplitChart } from "@/components/Charts";
import { PipelineDiagram } from "@/components/PipelineDiagram";
import { ActionButton } from "@/components/ActionButton";
import { Card, LinkButton, StatCard, StatusBadge } from "@/components/ui";
import {
  currentPeriod,
  daysUntil,
  inr,
  parseJson,
  periodLabel,
  returnDueDate,
} from "@/lib/utils";
import type { AgentStepTrace } from "@/lib/types";

function prevPeriods(n: number): string[] {
  const out: string[] = [];
  const d = new Date();
  d.setDate(1);
  for (let i = n - 1; i >= 0; i--) {
    const dd = new Date(d.getFullYear(), d.getMonth() - i, 1);
    out.push(`${dd.getFullYear()}-${String(dd.getMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

export default async function DashboardPage() {
  const merchant = (await getCurrentMerchant())!;
  const period = currentPeriod();
  const [stats, returnData, gstReturn] = await Promise.all([
    computeDashboardStats(merchant.id, period),
    buildReturnData(merchant.id, period),
    prisma.gstReturn.findUnique({
      where: { merchantId_period_type: { merchantId: merchant.id, period, type: "GSTR3B" } },
    }),
  ]);

  // Trend across the last 3 periods.
  const periods = prevPeriods(3);
  const trend = await Promise.all(
    periods.map(async (p) => {
      const salesAgg = await prisma.salesTransaction.aggregate({
        where: { merchantId: merchant.id, period: p },
        _sum: { grossAmount: true },
      });
      const ret = await prisma.gstReturn.findUnique({
        where: { merchantId_period_type: { merchantId: merchant.id, period: p, type: "GSTR3B" } },
      });
      return {
        label: periodLabel(p).split(" ")[0].slice(0, 3),
        sales: Math.round(salesAgg._sum.grossAmount ?? 0),
        itc: Math.round(ret?.itcClaimed ?? 0),
      };
    }),
  );

  const flagged = await prisma.purchaseInvoice.findMany({
    where: { merchantId: merchant.id, status: "needs_review" },
    orderBy: { updatedAt: "desc" },
    take: 4,
  });

  const runs = await prisma.agentRun.findMany({
    where: { merchantId: merchant.id },
    orderBy: { startedAt: "desc" },
    take: 6,
  });

  const due = returnDueDate(period);
  const daysLeft = daysUntil(due);

  const split = [
    { name: "ITC claimed", value: returnData.itcClaimed },
    { name: "ITC at risk", value: returnData.itcAtRisk },
    { name: "Blocked (17(5))", value: returnData.itc.blocked },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-ink-muted">Namaste, {merchant.ownerName.split(" ")[0]} 👋</p>
          <h1 className="text-[2rem] font-light tracking-tight text-ink">
            {periodLabel(period)} at a glance
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="chip bg-brand-50 text-brand-700">
            <CalendarClock className="h-3.5 w-3.5" />
            GSTR-3B due in {daysLeft} days
          </span>
          <ActionButton url="/api/sales/sync" body={{ period }} variant="ghost">
            <RefreshCw className="h-4 w-4" /> Sync Paytm
          </ActionButton>
        </div>
      </div>

      {/* The moment that sells it */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="relative overflow-hidden rounded-2xl bg-ink p-6 text-white lg:col-span-2">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-brand-500/30 blur-3xl" />
          <div className="relative">
            <p className="flex items-center gap-2 text-sm text-white/60">
              <Sparkles className="h-4 w-4 text-brand-300" /> This month
            </p>
            <p className="display-hero tnum mt-3 text-5xl md:text-6xl">
              {inr(stats.unclaimedItc)}
            </p>
            <p className="mt-1 text-white/70">
              in input tax credit you haven&apos;t claimed yet.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              {stats.flaggedCount > 0 ? (
                <Link
                  href="/review"
                  className="btn bg-white/10 text-white hover:bg-white/20"
                >
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  {stats.flaggedCount} invoice{stats.flaggedCount > 1 ? "s" : ""} flagged for review
                  <ArrowRight className="h-4 w-4" />
                </Link>
              ) : (
                <span className="chip bg-success/20 text-white">All invoices reconciled ✓</span>
              )}
              <span className="inline-flex items-center gap-2 text-sm text-white/50">
                <Mic className="h-4 w-4" /> Ask &ldquo;How much GST did I save?&rdquo;
              </span>
            </div>
          </div>
        </div>

        <Card className="flex flex-col justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
              GSTR-3B draft · {periodLabel(period)}
            </p>
            <div className="mt-3 flex items-center gap-2">
              <StatusBadge status={gstReturn?.status ?? "draft"} />
              <span className="text-xs text-ink-muted">
                {returnData.invoicesFlagged} flagged · {returnData.invoicesConsidered} invoices
              </span>
            </div>
            <div className="mt-4 space-y-2 text-sm">
              <Row label="Output tax" value={inr(returnData.outputTax)} />
              <Row label="ITC claimed" value={`− ${inr(returnData.itcClaimed)}`} tone="success" />
              <div className="my-2 h-px bg-surface-border" />
              <Row label="Net payable" value={inr(returnData.netPayable)} strong />
            </div>
          </div>
          <LinkButton href={`/returns/${period}`} variant="subtle" className="mt-4 w-full">
            Review & file <ArrowRight className="h-4 w-4" />
          </LinkButton>
        </Card>
      </div>

      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Sales this month"
          value={inr(stats.salesTotal)}
          hint={`${stats.salesCount} Paytm settlements`}
          tone="brand"
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <StatCard
          label="ITC claimed"
          value={inr(stats.itcThisMonth)}
          hint="from approved invoices"
          tone="success"
          icon={<Wallet className="h-4 w-4" />}
        />
        <StatCard
          label="Net GST payable"
          value={inr(stats.netPayable)}
          hint="output tax minus ITC"
          icon={<IndianRupee className="h-4 w-4" />}
        />
        <StatCard
          label="Awaiting review"
          value={stats.reviewOpen}
          hint={stats.reviewOpen ? "action needed" : "you're all caught up"}
          tone={stats.reviewOpen ? "warning" : "success"}
          icon={<AlertTriangle className="h-4 w-4" />}
        />
      </div>

      {/* Pipeline */}
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">The Hisaab pipeline</h2>
          <span className="text-xs text-ink-muted">Five agents · one pipeline · human-reviewed</span>
        </div>
        <PipelineDiagram />
      </Card>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-ink">Sales & ITC — last 3 months</h2>
          <SalesTrendChart data={trend} />
        </Card>
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-ink">Input tax credit breakdown</h2>
          <TaxSplitChart data={split} />
        </Card>
      </div>

      {/* Flagged + activity */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink">Flagged before filing</h2>
            <Link href="/review" className="text-xs font-medium text-brand-600">View all</Link>
          </div>
          {flagged.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-muted">Nothing flagged. 🎉</p>
          ) : (
            <ul className="divide-y divide-surface-border">
              {flagged.map((inv) => (
                <li key={inv.id}>
                  <Link href={`/invoices/${inv.id}`} className="flex items-center justify-between gap-3 py-3 hover:opacity-80">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">{inv.supplierName ?? "Unknown supplier"}</p>
                      <p className="truncate text-xs text-ink-muted">
                        {inv.invoiceNo ?? "—"} · {inr((inv.cgst + inv.sgst + inv.igst) || 0)} ITC
                      </p>
                    </div>
                    <StatusBadge status={inv.gstr2bStatus} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold text-ink">Recent agent activity</h2>
          <ul className="space-y-3">
            {runs.map((run) => {
              const steps = parseJson<AgentStepTrace[]>(run.steps, []);
              const last = steps[steps.length - 1];
              return (
                <li key={run.id} className="flex items-start gap-3">
                  <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                    <Sparkles className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-ink">
                      {last?.summary ?? "Pipeline run"}
                    </p>
                    <p className="text-xs text-ink-muted">
                      {run.provider} · {new Date(run.startedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                    </p>
                  </div>
                </li>
              );
            })}
            {runs.length === 0 && <p className="text-sm text-ink-muted">No runs yet.</p>}
          </ul>
        </Card>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  tone,
  strong,
}: {
  label: string;
  value: string;
  tone?: "success";
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-ink-muted">{label}</span>
      <span
        className={
          strong
            ? "text-base font-bold text-ink"
            : tone === "success"
              ? "font-medium text-success"
              : "font-medium text-ink"
        }
      >
        {value}
      </span>
    </div>
  );
}
