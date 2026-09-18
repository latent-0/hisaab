import { ArrowRight, Lightbulb, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { getCurrentMerchant } from "@/lib/session";
import { getBusinessHealth } from "@/lib/growth";
import { ProfitTrendChart } from "@/components/Charts";
import { Card, LinkButton, StatCard } from "@/components/ui";
import { inr, periodLabel } from "@/lib/utils";

function scoreTone(s: number) {
  if (s >= 75) return { label: "Strong", color: "#0f9d58", bg: "#e7f7ee" };
  if (s >= 50) return { label: "Steady", color: "#b47905", bg: "#fdf3e2" };
  return { label: "Needs work", color: "#e0433c", bg: "#fdecec" };
}

export default async function HealthPage() {
  const merchant = (await getCurrentMerchant())!;
  const h = await getBusinessHealth(merchant.id);
  const tone = scoreTone(h.growthScore);
  const dash = 2 * Math.PI * 52;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[1.9rem] font-light tracking-tight text-ink">Business health</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Not just GST — your profit, growth and cash, from the sales and purchases Hisaab already sees.
        </p>
      </div>

      {/* Score + KPIs */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="flex items-center gap-5">
          <div className="relative h-32 w-32 shrink-0">
            <svg viewBox="0 0 120 120" className="h-32 w-32 -rotate-90">
              <circle cx="60" cy="60" r="52" fill="none" stroke="#eef2f8" strokeWidth="12" />
              <circle
                cx="60" cy="60" r="52" fill="none" stroke={tone.color} strokeWidth="12" strokeLinecap="round"
                strokeDasharray={dash} strokeDashoffset={dash * (1 - h.growthScore / 100)}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="tnum text-3xl font-bold text-ink">{h.growthScore}</span>
              <span className="text-[11px] text-ink-muted">/ 100</span>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Growth score</p>
            <p className="mt-1 text-lg font-semibold" style={{ color: tone.color }}>{tone.label}</p>
            <p className="mt-1 text-sm text-ink-muted">{periodLabel(h.period)}</p>
          </div>
        </Card>

        <StatCard
          label="Revenue (this month)"
          value={inr(h.revenue)}
          hint={
            h.momGrowth >= 0
              ? `▲ ${h.momGrowth}% vs last month`
              : `▼ ${Math.abs(h.momGrowth)}% vs last month`
          }
          tone={h.momGrowth >= 0 ? "success" : "danger"}
          icon={h.momGrowth >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
        />
        <StatCard
          label="Est. gross profit"
          value={inr(h.estGrossProfit)}
          hint={`~${h.marginPct}% est. margin · stock ${inr(h.purchases)}`}
          tone="brand"
          icon={<Wallet className="h-4 w-4" />}
        />
      </div>

      {/* Trend + score breakdown */}
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <h2 className="mb-1 text-sm font-semibold text-ink">Revenue, cost &amp; profit — last 6 months</h2>
          <p className="mb-3 text-xs text-ink-muted">Revenue from Paytm sales, cost from purchase invoices.</p>
          <ProfitTrendChart data={h.trend} />
        </Card>
        <Card>
          <h2 className="mb-4 text-sm font-semibold text-ink">What makes up your score</h2>
          <div className="space-y-3.5">
            {h.components.map((c) => (
              <div key={c.key}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium text-ink">{c.label} <span className="text-xs text-ink-muted">· {c.weight}%</span></span>
                  <span className="tnum font-semibold text-ink">{c.score}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
                  <div className="h-full rounded-full bg-brand-500" style={{ width: `${c.score}%` }} />
                </div>
                <p className="mt-0.5 text-[11px] text-ink-muted">{c.detail}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Tips + credit CTA */}
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
            <Lightbulb className="h-4 w-4 text-warning" /> How to grow the score
          </h2>
          <ul className="space-y-2.5">
            {h.tips.map((t, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-ink-soft">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
                {t}
              </li>
            ))}
          </ul>
        </Card>
        <Card className="flex flex-col justify-between bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500 text-white">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-white/60">Powered by your books</p>
            <p className="mt-2 text-lg font-medium">Clean books unlock working capital.</p>
            <p className="mt-1 text-sm text-white/70">A strong score pre-qualifies you for a loan against your verified income.</p>
          </div>
          <LinkButton href="/credit" variant="ghost" className="mt-4 w-full border-white/25 bg-white/10 text-white hover:bg-white/20">
            See your offer <ArrowRight className="h-4 w-4" />
          </LinkButton>
        </Card>
      </div>
    </div>
  );
}
