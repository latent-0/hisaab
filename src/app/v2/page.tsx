"use client";

import { useState } from "react";
import {
  ArrowRight,
  Building2,
  Bus,
  Calculator,
  Check,
  ChevronDown,
  CreditCard,
  Download,
  Headphones,
  Landmark,
  LayoutGrid,
  Lightbulb,
  Megaphone,
  Mic,
  Plane,
  Radio,
  Satellite,
  ScanLine,
  Shield,
  Smartphone,
  Store,
  TrainFront,
  Umbrella,
  Wallet,
  Wifi,
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

  const NAV = ["Recharge & Bills", "Ticket Booking", "Payments & Services", "Paytm for Business", "Company"];

  return (
    <div className="min-h-screen bg-[#f6f8fc] text-[#0f1a2e] font-sans">
      {/* ===== Top nav ===== */}
      <header className="sticky top-0 z-40 border-b border-black/5 bg-white">
        <div className="mx-auto flex max-w-[1180px] items-center gap-4 px-4 py-3">
          <Wordmark />
          <span className="hidden rounded-full bg-[#eaf7ff] px-2.5 py-1 text-[11px] font-semibold text-[#0077b6] lg:inline">
            Concept demo
          </span>
          <nav className="mx-auto hidden items-center gap-6 lg:flex">
            {NAV.map((n) => (
              <button key={n} onClick={demo} className="flex items-center gap-1 text-sm font-bold text-[#1a2b4a] hover:text-[#002970]">
                {n} <ChevronDown className="h-3.5 w-3.5 opacity-60" />
              </button>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-4 lg:ml-0">
            <button onClick={demo} className="hidden items-center gap-1.5 text-sm font-bold text-[#1a2b4a] sm:flex">
              <Download className="h-4 w-4" /> Download App
            </button>
            <button
              onClick={demo}
              className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold text-white shadow-sm"
              style={{ background: NAVY }}
            >
              <span className="grid h-5 w-5 place-items-center rounded-full bg-white/25 text-[11px]">👤</span>
              Sign In
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1180px] space-y-4 px-4 py-5">
        {/* ===== Row 1: Recharges grid + UPI Statement promo ===== */}
        <div className="grid gap-4 lg:grid-cols-[1.9fr_1fr]">
          <section className="rounded-2xl bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,.04),0_10px_30px_rgba(16,24,40,.05)]">
            <h2 className="mb-6 text-xl font-extrabold tracking-tight">Recharges &amp; Bill Payments</h2>
            <div className="grid grid-cols-3 gap-y-7">
              {[
                { icon: Smartphone, label: "Mobile Recharge/Bill" },
                { icon: Lightbulb, label: "Electricity Bill" },
                { icon: CreditCard, label: "FASTag Recharge" },
                { icon: Satellite, label: "DTH Recharge" },
                { icon: Shield, label: "Insurance Premium" },
                { icon: LayoutGrid, label: "View All Products" },
              ].map((s) => (
                <Tile key={s.label} icon={<s.icon className="h-7 w-7" strokeWidth={1.5} />} label={s.label} onClick={demo} />
              ))}
            </div>
          </section>

          {/* UPI Statement promo */}
          <section className="relative overflow-hidden rounded-2xl bg-[#d4ecfb] p-6">
            <h3 className="text-2xl font-extrabold leading-tight" style={{ color: NAVY }}>Get UPI Statement<br />in Excel/ PDF</h3>
            <p className="mt-3 text-sm font-semibold text-[#33507d]">Track all your<br />expenses.<br />Only on Paytm.</p>
            <button onClick={demo} className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#0f1a2e] px-4 py-2 text-xs font-bold text-white">
              Download Paytm App  ▶
            </button>
            <div className="mt-5">
              <PhoneMock>
                <p className="mb-2 text-[9px] font-bold text-[#0f1a2e]">Requested Statements</p>
                {[["3 months", "Excel"], ["6 months", "PDF"]].map(([m, f]) => (
                  <div key={m} className="mb-1.5 flex items-center justify-between rounded-md bg-[#f6f8fc] px-2 py-1.5">
                    <span className="text-[9px] font-semibold">{m} <span className="rounded bg-amber-200 px-1 text-[7px]">{f}</span></span>
                    <span className="rounded-full px-2 py-0.5 text-[7px] font-bold text-white" style={{ background: CYAN }}>Download</span>
                  </div>
                ))}
              </PhoneMock>
            </div>
          </section>
        </div>

        {/* ===== Bill-pay quick cards ===== */}
        <div className="grid gap-4 sm:grid-cols-2">
          <BillCard icon={<Wifi className="h-6 w-6" style={{ color: NAVY }} />} title="Wifi, Landline or Broadband Bill Due?" sub="Check latest bill and pay instantly" onClick={demo} />
          <BillCard icon={<span className="grid h-9 w-9 place-items-center rounded-lg text-[10px] font-extrabold text-white" style={{ background: NAVY }}>EMI</span>} title="Loan EMI due?" sub="Pay pending EMIs now in few simple steps" onClick={demo} />
        </div>

        {/* ===== Three promo banners ===== */}
        <div className="grid gap-4 sm:grid-cols-3">
          <PromoBanner bg="#fdf1dc" title={<>Swipe left<br />to keep it hush</>} sub="Hide your past payments with a left swipe" onClick={demo} />
          <PromoBanner bg="#e7effb" title={<>Expense tracking<br />made smarter!</>} sub="Now, download your statement in Excel/PDF format" onClick={demo} />
          <PromoBanner bg="#e7f6ff" title={<>We do the math,<br />you do the spending.</>} sub="Check total balance of all your linked bank accounts" onClick={demo} />
        </div>

        {/* ===== Paytm Travel ===== */}
        <TravelWidget onSearch={demo} />

        {/* ===== Meet Hisaab — feature spotlight (product-in-phone) ===== */}
        <section className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-[0_1px_2px_rgba(16,24,40,.04),0_10px_30px_rgba(16,24,40,.05)]">
          <div className="grid lg:grid-cols-[1.05fr_.95fr]">
            {/* Copy */}
            <div className="p-7 sm:p-10">
              <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-xl text-lg font-bold text-white" style={{ background: NAVY }}>ह</span>
                <span className="text-sm font-extrabold" style={{ color: NAVY }}>Hisaab</span>
                <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold text-white">NEW</span>
              </div>
              <h2 className="mt-6 text-[2.4rem] font-extrabold leading-[1.03] tracking-tight text-[#0f1a2e] sm:text-[2.9rem]">
                Your GST,<br />sorted <span style={{ color: CYAN }}>automatically</span>.
              </h2>
              <p className="mt-4 max-w-md text-[15px] leading-relaxed text-[#41506b]">
                The sales side is already in Paytm. Hisaab adds the rest — reads your invoices, catches every
                unclaimed rupee of input tax credit, and files a ready GSTR-3B.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  "Zero manual entry — reads your settlements",
                  "Catches every rupee of input tax credit",
                  "File-ready GSTR-3B, reviewed by a human",
                ].map((b) => (
                  <li key={b} className="flex items-center gap-3 text-sm font-medium text-[#1a2b4a]">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full" style={{ background: "#e6f7fe", color: NAVY }}>
                      <Check className="h-3.5 w-3.5" strokeWidth={3} />
                    </span>
                    {b}
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <a href="/v2/open-hisaab" className="inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-bold text-white shadow-sm transition hover:brightness-110" style={{ background: NAVY }}>
                  Open Hisaab <ArrowRight className="h-4 w-4" />
                </a>
                <span className="inline-flex items-center gap-2 text-sm text-[#5a6b86]">
                  <Mic className="h-4 w-4" style={{ color: NAVY }} /> "इस महीने कितना GST बचा?"
                </span>
              </div>
            </div>

            {/* Product screen inside a phone */}
            <div className="relative flex justify-center overflow-hidden pt-9" style={{ background: "linear-gradient(160deg,#e9f1ff,#d7e6ff)" }}>
              <div className="w-[248px] rounded-t-[2.2rem] border-[10px] border-b-0 border-[#0f1a2e] bg-[#f4f7fc] px-2.5 pt-2 shadow-2xl">
                <div className="mx-auto mb-2 h-1.5 w-14 rounded-full bg-[#0f1a2e]/15" />
                <div className="flex items-center justify-between px-1 pb-2">
                  <span className="flex items-center gap-1.5 text-[13px] font-extrabold" style={{ color: NAVY }}>
                    <span className="grid h-5 w-5 place-items-center rounded-md text-[10px] text-white" style={{ background: NAVY }}>ह</span> Hisaab
                  </span>
                  <span className="text-[10px] text-[#8a97b2]">Sept 2026</span>
                </div>
                <div className="rounded-2xl p-4 text-white" style={{ background: `linear-gradient(145deg, ${NAVY}, #0a63b0)` }}>
                  <p className="text-[9px] font-semibold uppercase tracking-wide text-white/60">Unclaimed ITC · this month</p>
                  <p className="text-[34px] font-extrabold leading-none">₹4,120</p>
                  <div className="mt-3 flex items-center gap-2 rounded-lg bg-white/10 px-2 py-1.5 text-[11px]">
                    <span className="grid h-4 w-4 place-items-center rounded-full bg-amber-300 text-[9px] font-bold text-[#7a4d00]">2</span>
                    invoices flagged
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-1.5">
                  {[["Sales", "₹1.68L"], ["ITC", "₹16.6k"], ["Net", "₹2,432"]].map(([k, v]) => (
                    <div key={k} className="rounded-lg border border-black/5 bg-white px-1 py-1.5 text-center">
                      <p className="text-[8px] text-[#8a97b2]">{k}</p>
                      <p className="text-[11px] font-bold text-[#0f1a2e]">{v}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-2 space-y-1.5 pb-5">
                  {[["Metro Cash & Carry", "ok"], ["Bharti Airtel", "ok"], ["Blue Dart Express", "flag"]].map(([n, s]) => (
                    <div key={n} className="flex items-center justify-between rounded-lg bg-white px-2 py-1.5">
                      <span className="truncate text-[10px] font-medium text-[#1a2b4a]">{n}</span>
                      {s === "flag" ? (
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[8px] font-bold text-[#a9760a]">review</span>
                      ) : (
                        <Check className="h-3 w-3 text-emerald-500" strokeWidth={3} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== Paytm for Business ===== */}
        <section className="rounded-2xl bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,.04),0_10px_30px_rgba(16,24,40,.05)]">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-extrabold tracking-tight">Paytm for Business</h2>
            <span className="text-sm font-semibold" style={{ color: NAVY }}>4.8 crore+ merchants</span>
          </div>
          <div className="grid grid-cols-3 gap-y-7 sm:grid-cols-4">
            <Tile icon={<Calculator className="h-7 w-7" strokeWidth={1.5} />} label="Hisaab · GST" href="/v2/open-hisaab" badge="NEW" live />
            <Tile icon={<Radio className="h-7 w-7" strokeWidth={1.5} />} label="Soundbox" onClick={demo} />
            <Tile icon={<CreditCard className="h-7 w-7" strokeWidth={1.5} />} label="Card Machine / EDC" onClick={demo} />
            <Tile icon={<Store className="h-7 w-7" strokeWidth={1.5} />} label="Payment Gateway" onClick={demo} />
            <Tile icon={<Landmark className="h-7 w-7" strokeWidth={1.5} />} label="Business Loan" onClick={demo} />
            <Tile icon={<Building2 className="h-7 w-7" strokeWidth={1.5} />} label="Business Khata" onClick={demo} />
            <Tile icon={<Megaphone className="h-7 w-7" strokeWidth={1.5} />} label="Paytm Ads" onClick={demo} />
            <Tile icon={<ScanLine className="h-7 w-7" strokeWidth={1.5} />} label="QR &amp; Collections" onClick={demo} />
          </div>
        </section>

        {/* ===== Credit Cards + Insurance ===== */}
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="overflow-hidden rounded-2xl bg-gradient-to-b from-[#eaf1fb] to-[#f4f8fe] p-6">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-white shadow-sm"><CreditCard className="h-4 w-4 text-[#e0433c]" /></span>
              <span className="font-extrabold">Credit Cards</span>
            </div>
            <h3 className="mt-4 text-3xl font-extrabold leading-[1.1] tracking-tight">One destination for<br /><span style={{ color: CYAN }}>Credit Cards</span></h3>
            <p className="mt-3 max-w-sm text-sm text-[#41506b]">Paytm HDFC, SBI Card &amp; Axis Bank Credit Card with assured Cashback and incredible offers.</p>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <button onClick={demo} className="inline-flex items-center gap-1.5 rounded-full border-2 px-4 py-2 text-sm font-bold" style={{ borderColor: NAVY, color: NAVY }}>Apply Now <ArrowRight className="h-4 w-4" /></button>
              {["SBI Card", "HDFC BANK", "kotak"].map((b) => (
                <span key={b} className="rounded-lg border border-black/10 bg-white px-3 py-2 text-[11px] font-bold text-[#41506b] shadow-sm">{b}</span>
              ))}
            </div>
            <img src="/img/cards.png" alt="Paytm co-branded RuPay credit cards" className="mt-6 w-full max-w-[420px]" />
          </section>

          <section className="overflow-hidden rounded-2xl bg-gradient-to-b from-[#e9f6ff] to-[#f4fbff] p-6">
            <div className="flex items-center gap-2">
              <Umbrella className="h-6 w-6" style={{ color: NAVY }} />
              <span className="font-extrabold"><span style={{ color: NAVY }}>Pay</span><span style={{ color: CYAN }}>tm</span> <span className="text-xs font-semibold text-[#41506b]">Insurance Broking</span></span>
            </div>
            <h3 className="mt-4 text-3xl font-extrabold leading-[1.1] tracking-tight">Insurance ka<br /><span style={{ color: CYAN }}>Super Market</span></h3>
            <p className="mt-3 max-w-sm text-sm text-[#41506b]">A Smart, Simple &amp; Transparent Platform to Explore &amp; Purchase Insurance.</p>
            <button onClick={demo} className="mt-5 inline-flex items-center gap-1.5 rounded-full border-2 px-4 py-2 text-sm font-bold" style={{ borderColor: NAVY, color: NAVY }}>Get It Now <ArrowRight className="h-4 w-4" /></button>
            <img src="/img/family.png" alt="An insured Indian family" className="mt-4 ml-auto w-full max-w-[320px]" />
          </section>
        </div>

        {/* ===== 24x7 support banner ===== */}
        <button onClick={demo} className="flex w-full items-center gap-4 rounded-2xl px-5 py-4 text-left text-white shadow-sm" style={{ background: `linear-gradient(90deg, #0a6fb0, ${CYAN})` }}>
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/20"><Headphones className="h-5 w-5" /></span>
          <span className="flex-1 text-sm font-bold sm:text-base">24×7 Trusted customer support to assist and help you in every step of your journey</span>
          <span className="hidden shrink-0 items-center gap-1.5 rounded-full border border-white/60 px-4 py-2 text-sm font-bold sm:inline-flex">Learn More <ArrowRight className="h-4 w-4" /></span>
        </button>

        {/* ===== Hisaab promo band ===== */}
        <section className="grid items-center gap-6 rounded-2xl bg-[#eaf7ff] p-6 sm:grid-cols-[1.4fr_1fr] sm:p-8">
          <div>
            <h3 className="text-2xl font-extrabold tracking-tight" style={{ color: NAVY }}>File-ready GSTR-3B, straight from your <span style={{ color: CYAN }}>settlements</span>.</h3>
            <p className="mt-2 max-w-md text-sm text-[#41506b]">No re-typing, no separate app. The sales side is already in Paytm — Hisaab adds the rest.</p>
            <a href="/v2/open-hisaab" className="mt-5 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-white" style={{ background: NAVY }}>Try Hisaab now <ArrowRight className="h-4 w-4" /></a>
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
        <div className="mx-auto max-w-[1180px] px-4 py-8">
          <div className="grid gap-6 sm:grid-cols-4">
            <div>
              <Wordmark />
              <p className="mt-3 max-w-[24ch] text-xs text-[#5a6b86]">The GST layer for 4.8 crore merchants, built into the app they already use.</p>
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

      {toast && (
        <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-full bg-[#0f1a2e] px-4 py-2.5 text-sm font-medium text-white shadow-xl">{toast}</div>
      )}
    </div>
  );
}

function Wordmark({ small }: { small?: boolean }) {
  return (
    <span className={`inline-flex items-center font-extrabold tracking-tight ${small ? "text-lg" : "text-2xl"}`}>
      <span style={{ color: NAVY }}>Pay</span><span style={{ color: CYAN }}>tm</span>
      <span className="mx-1 text-rose-500">♥</span><span style={{ color: NAVY }}>UPI</span>
    </span>
  );
}

function Tile({ icon, label, onClick, href, badge, live }: { icon: React.ReactNode; label: string; onClick?: () => void; href?: string; badge?: string; live?: boolean }) {
  const inner = (
    <>
      <div className="relative">
        <div className={`grid h-12 w-12 place-items-center transition group-hover:scale-110 ${live ? "" : ""}`} style={{ color: live ? CYAN : NAVY }}>
          {icon}
        </div>
        {badge && <span className="absolute -right-2 -top-1 rounded-full bg-rose-500 px-1.5 py-0.5 text-[9px] font-bold text-white">{badge}</span>}
      </div>
      <span className="max-w-[13ch] text-center text-[13px] font-semibold leading-tight text-[#0f1a2e]">{label}</span>
    </>
  );
  const cls = "group flex cursor-pointer flex-col items-center gap-2.5";
  return href ? <a href={href} className={cls}>{inner}</a> : <button type="button" onClick={onClick} className={cls}>{inner}</button>;
}

function PhoneMock({ children }: { children: React.ReactNode }) {
  return (
    <div className="ml-auto w-[150px] rounded-t-2xl border-4 border-b-0 border-[#0f1a2e] bg-white p-2 shadow-xl">
      <div className="mb-2 flex items-center"><span className="text-[9px] font-extrabold" style={{ color: NAVY }}>Pay<span style={{ color: CYAN }}>tm</span></span></div>
      {children}
    </div>
  );
}

function BillCard({ icon, title, sub, onClick }: { icon: React.ReactNode; title: string; sub: string; onClick: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,.04),0_8px_24px_rgba(16,24,40,.05)]">
      <span className="shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-extrabold leading-tight">{title}</p>
        <p className="text-xs text-[#5a6b86]">{sub}</p>
      </div>
      <button onClick={onClick} className="shrink-0 rounded-full border-2 px-4 py-1.5 text-sm font-bold" style={{ borderColor: NAVY, color: NAVY }}>Pay Now</button>
    </div>
  );
}

function PromoBanner({ bg, title, sub, onClick }: { bg: string; title: React.ReactNode; sub: string; onClick: () => void }) {
  return (
    <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl p-5" style={{ background: bg }}>
      <div className="relative z-10 max-w-[62%]">
        <h4 className="text-lg font-extrabold leading-tight" style={{ color: NAVY }}>{title}</h4>
        <p className="mt-1.5 text-xs text-[#41506b]">{sub}</p>
      </div>
      <button onClick={onClick} className="relative z-10 mt-4 inline-flex w-fit items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold text-white" style={{ background: NAVY }}>
        Download App Now <ArrowRight className="h-3.5 w-3.5" />
      </button>
      <div className="pointer-events-none absolute -right-3 bottom-2 w-[92px] rounded-t-xl border-4 border-b-0 border-[#0f1a2e] bg-white p-1.5 opacity-95">
        <span className="text-[7px] font-extrabold" style={{ color: NAVY }}>Pay<span style={{ color: CYAN }}>tm</span></span>
        <div className="mt-1 space-y-1">
          <div className="h-2 rounded bg-[#eef4ff]" /><div className="h-2 w-3/4 rounded bg-[#eef4ff]" /><div className="h-2 rounded bg-[#eef4ff]" />
        </div>
      </div>
    </div>
  );
}

function TravelWidget({ onSearch }: { onSearch: () => void }) {
  const tabs = [{ icon: Plane, label: "Flights" }, { icon: Bus, label: "Bus" }, { icon: TrainFront, label: "Trains" }, { icon: Plane, label: "Intl. Flights" }];
  return (
    <section className="rounded-2xl bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,.04),0_10px_30px_rgba(16,24,40,.05)] sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex gap-6">
          {tabs.map((t, i) => (
            <div key={t.label} className={`flex flex-col items-center gap-1 pb-2 text-xs font-semibold ${i === 0 ? "border-b-2 text-[#002970]" : "text-[#5a6b86]"}`} style={i === 0 ? { borderColor: CYAN } : {}}>
              <t.icon className="h-5 w-5" style={{ color: i === 0 ? NAVY : "#8a97b2" }} />
              {t.label}
            </div>
          ))}
        </div>
        <span className="hidden font-extrabold sm:inline"><span style={{ color: NAVY }}>Pay</span><span style={{ color: CYAN }}>tm</span> <span className="text-[#0f1a2e]">travel</span></span>
      </div>
      <div className="rounded-xl border border-black/10 p-4">
        <div className="mb-3 flex items-center gap-5 text-sm font-semibold">
          <span className="inline-flex items-center gap-2" style={{ color: NAVY }}><i className="h-3.5 w-3.5 rounded-full border-4" style={{ borderColor: CYAN }} /> One Way</span>
          <span className="inline-flex items-center gap-2 text-[#5a6b86]"><i className="h-3.5 w-3.5 rounded-full border border-[#c3ccdd]" /> Round Trip</span>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-4 lg:grid-cols-5">
          <div><p className="text-xs text-[#8a97b2]">From</p><p className="text-lg font-extrabold">Delhi (DEL)</p></div>
          <div><p className="text-xs text-[#8a97b2]">To</p><p className="text-lg font-extrabold">Mumbai (BOM)</p></div>
          <div><p className="text-xs text-[#8a97b2]">Depart</p><p className="text-lg font-extrabold">Wed, 23 Sep 26</p></div>
          <div><p className="text-xs text-[#8a97b2]">Passenger &amp; Class</p><p className="text-lg font-extrabold">1 Traveller</p></div>
          <button onClick={onSearch} className="rounded-xl px-5 py-2 text-sm font-bold text-white" style={{ background: CYAN }}>Search Flights</button>
        </div>
      </div>
    </section>
  );
}
