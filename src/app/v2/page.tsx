"use client";

import { useState } from "react";
import {
  ArrowRight,
  Building2,
  Calculator,
  CreditCard,
  Landmark,
  Lightbulb,
  Megaphone,
  Mic,
  Radio,
  ScanLine,
  Shield,
  Smartphone,
  Sparkles,
  Store,
  Tv,
  Wallet,
} from "lucide-react";

// Paytm palette (recreated for a concept integration demo).
const NAVY = "#002970";
const CYAN = "#00BAF2";

export default function PaytmV2() {
  const [toast, setToast] = useState<string | null>(null);
  const demo = () => {
    setToast("Concept demo — only the Hisaab feature is live here.");
    window.clearTimeout((demo as any)._t);
    (demo as any)._t = window.setTimeout(() => setToast(null), 2600);
  };

  return (
    <div className="min-h-screen bg-[#f6f8fc] text-[#0f1a2e] font-sans">
      {/* ===== Top nav ===== */}
      <header className="sticky top-0 z-40 border-b border-black/5 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <Wordmark />
            <span className="hidden rounded-full bg-[#eaf7ff] px-2.5 py-1 text-[11px] font-semibold text-[#0077b6] sm:inline">
              Concept demo
            </span>
          </div>
          <button
            onClick={demo}
            className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold text-white shadow-sm"
            style={{ background: `linear-gradient(90deg, ${CYAN}, ${NAVY})` }}
          >
            <span className="grid h-5 w-5 place-items-center rounded-full bg-white/25 text-[11px]">👤</span>
            Sign In
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-4 px-4 py-5">
        {/* ===== Recharges & Bill Payments ===== */}
        <section className="rounded-2xl bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,.04),0_10px_30px_rgba(16,24,40,.05)]">
          <h2 className="mb-5 text-xl font-extrabold tracking-tight">Recharges &amp; Bill Payments</h2>
          <div className="grid grid-cols-2 gap-y-6 sm:grid-cols-4">
            {[
              { icon: Smartphone, label: "Mobile Recharge/Bill" },
              { icon: Lightbulb, label: "Electricity Bill" },
              { icon: CreditCard, label: "FASTag Recharge" },
              { icon: Tv, label: "DTH Recharge" },
              { icon: Shield, label: "Insurance Premium" },
              { icon: Landmark, label: "Loan Repayment" },
              { icon: Radio, label: "Broadband / Landline" },
              { icon: Wallet, label: "View All Products" },
            ].map((s) => (
              <Tile key={s.label} icon={<s.icon className="h-6 w-6" />} label={s.label} onClick={demo} />
            ))}
          </div>
        </section>

        {/* ===== HISAAB integration spotlight ===== */}
        <section
          className="relative overflow-hidden rounded-2xl p-6 text-white sm:p-8"
          style={{ background: `linear-gradient(120deg, ${NAVY} 0%, #123a86 55%, #0a6fb0 100%)` }}
        >
          <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full" style={{ background: CYAN, opacity: 0.25, filter: "blur(70px)" }} />
          <div className="relative grid items-center gap-8 lg:grid-cols-[1.1fr_.9fr]">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wide">
                <Sparkles className="h-3.5 w-3.5" /> New for GST-registered merchants
              </span>
              <div className="mt-4 flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-white/15 text-2xl font-bold">ह</div>
                <div>
                  <p className="text-2xl font-extrabold leading-none">Hisaab</p>
                  <p className="text-sm text-white/70">GST copilot, inside Paytm</p>
                </div>
              </div>
              <h3 className="mt-5 max-w-xl text-3xl font-extrabold leading-[1.1] tracking-tight sm:text-[2.4rem]">
                Your GST, sorted automatically.
              </h3>
              <p className="mt-3 max-w-lg text-white/75">
                Hisaab reads your Paytm sales, matches them to purchase invoices, catches every unclaimed
                rupee of input tax credit, and pre-fills GSTR-3B. Reviewed by a human, spoken in your language.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <a
                  href="/v2/open-hisaab"
                  className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-[#002970] transition hover:bg-white/90"
                >
                  Open Hisaab <ArrowRight className="h-4 w-4" />
                </a>
                <span className="inline-flex items-center gap-2 text-sm text-white/60">
                  <Mic className="h-4 w-4" /> "इस महीने कितना GST बचा?"
                </span>
              </div>
            </div>

            {/* Preview card */}
            <div className="rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur">
              <div className="flex items-center justify-between text-xs text-white/60">
                <span className="inline-flex items-center gap-1.5"><Store className="h-3.5 w-3.5" /> Sharma General Store</span>
                <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-emerald-400" /> Live</span>
              </div>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-white/50">Unclaimed input tax credit</p>
              <p className="text-5xl font-extrabold tracking-tight">₹4,120</p>
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-amber-300/25 text-xs font-bold text-amber-200">2</span>
                invoices flagged for review
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                {[["Sales", "₹1.68L"], ["ITC", "₹16,626"], ["Net", "₹2,432"]].map(([k, v]) => (
                  <div key={k} className="rounded-lg border border-white/10 bg-white/5 px-2 py-2">
                    <p className="text-[10px] text-white/50">{k}</p>
                    <p className="text-sm font-bold">{v}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ===== Paytm for Business ===== */}
        <section className="rounded-2xl bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,.04),0_10px_30px_rgba(16,24,40,.05)]">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-extrabold tracking-tight">Paytm for Business</h2>
            <span className="text-sm font-semibold" style={{ color: NAVY }}>4.8 crore+ merchants</span>
          </div>
          <div className="grid grid-cols-2 gap-y-6 sm:grid-cols-4">
            <Tile icon={<Calculator className="h-6 w-6" />} label="Hisaab · GST" href="/v2/open-hisaab" badge="NEW" live />
            <Tile icon={<Radio className="h-6 w-6" />} label="Soundbox" onClick={demo} />
            <Tile icon={<CreditCard className="h-6 w-6" />} label="Card Machine / EDC" onClick={demo} />
            <Tile icon={<Store className="h-6 w-6" />} label="Payment Gateway" onClick={demo} />
            <Tile icon={<Landmark className="h-6 w-6" />} label="Business Loan" onClick={demo} />
            <Tile icon={<Building2 className="h-6 w-6" />} label="Business Khata" onClick={demo} />
            <Tile icon={<Megaphone className="h-6 w-6" />} label="Paytm Ads" onClick={demo} />
            <Tile icon={<ScanLine className="h-6 w-6" />} label="QR &amp; Collections" onClick={demo} />
          </div>
        </section>

        {/* ===== promo band ===== */}
        <section className="grid items-center gap-6 rounded-2xl bg-[#eaf7ff] p-6 sm:grid-cols-[1.4fr_1fr] sm:p-8">
          <div>
            <h3 className="text-2xl font-extrabold tracking-tight" style={{ color: NAVY }}>
              File-ready GSTR-3B, straight from your <span style={{ color: CYAN }}>settlements</span>.
            </h3>
            <p className="mt-2 max-w-md text-sm text-[#41506b]">
              No re-typing, no separate app. The sales side is already in Paytm — Hisaab adds the rest.
            </p>
            <a
              href="/v2/open-hisaab"
              className="mt-5 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-white"
              style={{ background: NAVY }}
            >
              Try Hisaab now <ArrowRight className="h-4 w-4" />
            </a>
          </div>
          <div className="flex justify-center">
            <div className="w-full max-w-[240px] rounded-2xl border border-black/5 bg-white p-4 shadow-lg">
              <div className="mb-3 flex items-center gap-2"><Wordmark small /></div>
              <div className="space-y-2">
                {[["Output tax", "₹19,058"], ["ITC claimed", "− ₹16,626"], ["Net payable", "₹2,432"]].map(([k, v], i) => (
                  <div key={k} className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs ${i === 2 ? "bg-[#eaf7ff] font-bold text-[#002970]" : "bg-[#f6f8fc] text-[#41506b]"}`}>
                    <span>{k}</span><span>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ===== Footer ===== */}
      <footer className="mt-6 border-t border-black/5 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="grid gap-6 sm:grid-cols-4">
            <div>
              <Wordmark />
              <p className="mt-3 max-w-[24ch] text-xs text-[#5a6b86]">
                The GST layer for 4.8 crore merchants — built into the app they already use.
              </p>
            </div>
            {[
              ["Consumer", ["UPI", "Recharges", "Bill Payments", "Travel"]],
              ["Business", ["Hisaab · GST", "Soundbox", "Payment Gateway", "Business Loan"]],
              ["Company", ["About", "Careers", "Press", "Contact"]],
            ].map(([h, items]) => (
              <div key={h as string}>
                <p className="text-sm font-bold" style={{ color: NAVY }}>{h as string}</p>
                <ul className="mt-2 space-y-1.5 text-xs text-[#5a6b86]">
                  {(items as string[]).map((it) => <li key={it}>{it}</li>)}
                </ul>
              </div>
            ))}
          </div>
          <p className="mt-8 border-t border-black/5 pt-5 text-[11px] leading-relaxed text-[#8a97b2]">
            Concept integration demo built for the Build for India hackathon. Not affiliated with, endorsed by,
            or operated by Paytm / One97 Communications. Paytm name and marks belong to their owners. Only the
            Hisaab feature is functional; all other tiles are illustrative.
          </p>
        </div>
      </footer>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-full bg-[#0f1a2e] px-4 py-2.5 text-sm font-medium text-white shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}

function Wordmark({ small }: { small?: boolean }) {
  return (
    <span className={`inline-flex items-center font-extrabold tracking-tight ${small ? "text-lg" : "text-2xl"}`}>
      <span style={{ color: NAVY }}>Pay</span>
      <span style={{ color: CYAN }}>tm</span>
      <span className="mx-1 text-rose-500">♥</span>
      <span style={{ color: NAVY }}>UPI</span>
    </span>
  );
}

function Tile({
  icon,
  label,
  onClick,
  href,
  badge,
  live,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  href?: string;
  badge?: string;
  live?: boolean;
}) {
  const inner = (
    <>
      <div className="relative">
        <div
          className={`grid h-16 w-16 place-items-center rounded-2xl transition group-hover:scale-105 ${live ? "text-white" : "text-[#002970]"}`}
          style={live ? { background: `linear-gradient(135deg, ${CYAN}, ${NAVY})` } : { background: "#eef4ff" }}
        >
          {icon}
        </div>
        {badge && (
          <span className="absolute -right-1 -top-1 rounded-full bg-rose-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
            {badge}
          </span>
        )}
      </div>
      <span className="max-w-[12ch] text-center text-[13px] font-semibold leading-tight text-[#0f1a2e]">{label}</span>
    </>
  );

  const cls = "group flex cursor-pointer flex-col items-center gap-2.5";
  if (href) {
    return (
      <a href={href} className={cls}>
        {inner}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}
