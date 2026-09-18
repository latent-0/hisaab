import { BadgeCheck, CheckCircle2, ShieldCheck, XCircle } from "lucide-react";
import { getCurrentMerchant } from "@/lib/session";
import { getCreditOffer } from "@/lib/credit";
import { Card } from "@/components/ui";
import { inr } from "@/lib/utils";
import { CreditApply } from "./CreditApply";

export default async function CreditPage() {
  const merchant = (await getCurrentMerchant())!;
  const o = await getCreditOffer(merchant.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[1.9rem] font-light tracking-tight text-ink">Working capital</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Your verified Paytm income and reconciled books, turned into a pre-approved offer — no paperwork.
        </p>
      </div>

      {/* Offer */}
      <Card className="relative overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500 p-7 text-white">
        <div className="pointer-events-none absolute -right-16 -top-20 h-60 w-60 rounded-full bg-accent/40 blur-3xl" />
        <div className="relative grid gap-6 lg:grid-cols-[1.2fr_1fr] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wide">
              <ShieldCheck className="h-3.5 w-3.5" /> {o.eligible ? "Pre-approved" : "Not yet eligible"}
            </span>
            <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-white/55">Available to you now</p>
            <p className="tnum text-6xl font-light tracking-tight">{inr(o.amount)}</p>
            <p className="mt-2 max-w-md text-sm text-white/75">{o.reason}</p>
            {o.eligible && (
              <div className="mt-5">
                <CreditApply amount={o.amount} />
              </div>
            )}
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-white/55">Interest</p><p className="tnum text-lg font-semibold">{o.aprMin}–{o.aprMax}% p.a.</p></div>
              <div><p className="text-white/55">Tenure</p><p className="tnum text-lg font-semibold">{o.tenureMonths} months</p></div>
              <div><p className="text-white/55">Est. EMI</p><p className="tnum text-lg font-semibold">{inr(o.emi)}/mo</p></div>
              <div><p className="text-white/55">Book quality</p><p className="tnum text-lg font-semibold">{o.bookQuality}/100</p></div>
            </div>
            <p className="mt-4 border-t border-white/15 pt-3 text-[11px] text-white/50">
              Indicative offer for demonstration. Final terms subject to Paytm lending-partner approval.
            </p>
          </div>
        </div>
      </Card>

      {/* Why you qualify */}
      <Card>
        <h2 className="mb-4 text-sm font-semibold text-ink">Why you qualify</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {o.factors.map((f) => (
            <div key={f.label} className="flex items-center gap-3 rounded-xl border border-surface-border p-3">
              {f.good ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
              ) : (
                <XCircle className="h-5 w-5 shrink-0 text-ink-muted" />
              )}
              <div className="flex-1">
                <p className="text-sm font-medium text-ink">{f.label}</p>
              </div>
              <span className="tnum text-sm font-semibold text-ink">{f.value}</span>
            </div>
          ))}
        </div>
        <p className="mt-4 flex items-center gap-2 rounded-xl bg-surface-muted px-4 py-3 text-xs text-ink-muted">
          <BadgeCheck className="h-4 w-4 text-brand-600" />
          Underwritten on data Paytm already has — every QR/Soundbox settlement plus Hisaab-reconciled purchases —
          so a merchant with clean books gets a better rate. This is the lending flywheel.
        </p>
      </Card>
    </div>
  );
}
