import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Calculator,
  FileCheck2,
  FileText,
  GitCompareArrows,
  Mic,
  Receipt,
  ScanLine,
  ShieldCheck,
  Store,
  Tags,
  Wallet,
} from "lucide-react";
import { getCurrentMerchant } from "@/lib/session";
import { getHeroSnapshot, getImpactStats } from "@/lib/impact";
import { inr, inNum, periodLabel } from "@/lib/utils";

export default async function LandingPage() {
  const merchant = await getCurrentMerchant();
  const appHref = merchant ? "/dashboard" : "/login";
  const appLabel = merchant ? "Open dashboard" : "Enter Hisaab";
  const [snap, impact] = await Promise.all([getHeroSnapshot(), getImpactStats()]);

  return (
    <div className="min-h-screen bg-ink text-white">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-ink/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Logo />
          <nav className="hidden items-center gap-8 text-sm text-white/60 md:flex">
            <a href="#problem" className="transition hover:text-white">Problem</a>
            <a href="#product" className="transition hover:text-white">Product</a>
            <a href="#pipeline" className="transition hover:text-white">How it works</a>
            <a href="#moat" className="transition hover:text-white">The moat</a>
          </nav>
          <Link href={appHref} className="btn-primary bg-white text-ink hover:bg-white/90">
            {appLabel} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      {/* Hero — left text, product visual on the right */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -left-40 top-0 h-[560px] w-[820px] rounded-full bg-brand-500/20 blur-[150px]" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-5 pb-24 pt-20 lg:grid-cols-[1.05fr_0.95fr] lg:pt-28">
          {/* Left */}
          <div>
            <h1 className="display-hero text-6xl leading-[0.98] md:text-7xl">
              GST, sorted
              <br />
              <span className="bg-gradient-to-r from-brand-300 to-sky-200 bg-clip-text text-transparent">
                automatically.
              </span>
            </h1>
            <p className="mt-7 max-w-md text-lg leading-relaxed text-white/60">
              Hisaab reads your Paytm sales, catches every unclaimed rupee of input
              tax credit, and drafts your GSTR-3B.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link href={appHref} className="btn-primary bg-white px-6 py-3 text-ink hover:bg-white/90">
                {appLabel} <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#pipeline" className="btn-ghost border-white/15 bg-white/5 px-6 py-3 text-white hover:bg-white/10">
                See how it works
              </a>
            </div>
            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-white/40">
              <span className="inline-flex items-center gap-2"><BadgeCheck className="h-4 w-4 text-brand-300" /> Zero manual entry</span>
              <span className="inline-flex items-center gap-2"><Mic className="h-4 w-4 text-brand-300" /> Voice-first, in your language</span>
            </div>
          </div>

          {/* Right — the product moment as hero visual (real data) */}
          <HeroVisual snap={snap} />
        </div>
      </section>

      {/* Live impact — real numbers from the database */}
      <section className="border-y border-white/10 bg-white/[0.02]">
        <div className="mx-auto max-w-6xl px-5 py-10">
          <div className="mb-6 flex items-center gap-2 text-xs font-medium tracking-[0.2em] text-brand-300">
            <LiveDot /> LIVE IMPACT · FROM THE HISAAB DATABASE
          </div>
          <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-6">
            <ImpactStat icon={<Wallet className="h-4 w-4" />} value={inr(impact.itcIdentified)} label="Input tax credit identified" />
            <ImpactStat icon={<Receipt className="h-4 w-4" />} value={inNum(impact.invoicesProcessed)} label="Invoices processed" />
            <ImpactStat icon={<GitCompareArrows className="h-4 w-4" />} value={inNum(impact.settlementsReconciled)} label="Settlements reconciled" />
            <ImpactStat icon={<BadgeCheck className="h-4 w-4" />} value={inr(impact.gstReconciled)} label="GST turnover reconciled" />
            <ImpactStat icon={<FileCheck2 className="h-4 w-4" />} value={inNum(impact.returnsDrafted)} label="GSTR-3B drafts" />
            <ImpactStat icon={<Store className="h-4 w-4" />} value={inNum(impact.merchants)} label="Merchants onboarded" />
          </div>
        </div>
      </section>

      {/* Problem */}
      <Section id="problem" eyebrow="THE PROBLEM" title="Two ledgers that never talk to each other">
        <div className="grid gap-4 md:grid-cols-2">
          <GlassCard>
            <h3 className="text-lg font-medium">Sales — live in Paytm</h3>
            <p className="mt-2 text-white/55">Every QR, Soundbox and EDC transaction is captured — but never automatically matched to what you buy.</p>
          </GlassCard>
          <GlassCard>
            <h3 className="text-lg font-medium">Purchases — on paper</h3>
            <p className="mt-2 text-white/55">Supplier invoices pile up in a drawer, so input tax credit quietly slips away.</p>
          </GlassCard>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Stat big="61–73%" small="of MSMEs lose input tax credit to supplier-side GSTR-2B mismatches" />
          <Stat big="3–5%" small="of annual revenue spent just staying GST-compliant" />
        </div>
      </Section>

      {/* Product */}
      <Section id="product" eyebrow="THE PRODUCT" title="Your GST, sorted automatically">
        <div className="grid gap-4 md:grid-cols-3">
          <Feature icon={<Receipt className="h-5 w-5" />} title="Auto-Reconcile">
            Matches Paytm settlements to purchase invoices — no re-typing, ever.
          </Feature>
          <Feature icon={<Wallet className="h-5 w-5" />} title="Catch Every Rupee">
            Flags unclaimed input tax credit before it&apos;s lost for good.
          </Feature>
          <Feature icon={<FileCheck2 className="h-5 w-5" />} title="File-Ready, Instantly">
            Pre-fills GSTR-3B, always reviewed by a human before filing.
          </Feature>
        </div>
      </Section>

      {/* Pipeline */}
      <Section id="pipeline" eyebrow="HOW IT WORKS" title="Five agents. One pipeline.">
        <div className="grid gap-3 md:grid-cols-5">
          {[
            { name: "Intake", desc: "Reads the invoice", icon: ScanLine },
            { name: "Classify", desc: "Category & ITC", icon: Tags },
            { name: "Cross-Check", desc: "Matches GSTR-2B", icon: GitCompareArrows },
            { name: "Calculate", desc: "Nets your liability", icon: Calculator },
            { name: "Generate", desc: "Drafts GSTR-3B", icon: FileText },
          ].map((s, i) => {
            const Icon = s.icon;
            return (
              <GlassCard key={s.name} className="h-full">
                <div className="flex items-center justify-between text-brand-300">
                  <Icon className="h-5 w-5" />
                  <span className="text-xs font-medium text-white/30">0{i + 1}</span>
                </div>
                <h3 className="mt-4 font-medium">{s.name}</h3>
                <p className="mt-1 text-sm text-white/50">{s.desc}</p>
              </GlassCard>
            );
          })}
        </div>
        <p className="mt-6 text-center text-sm text-white/40">
          A human reviews anything the model isn&apos;t sure about — always.
        </p>
      </Section>

      {/* Moat */}
      <Section id="moat" eyebrow="THE MOAT" title="Why only Paytm can build this">
        <div className="grid gap-4 md:grid-cols-3">
          <Feature icon={<ShieldCheck className="h-5 w-5" />} title="Owns the ledger">
            Real-time visibility into every QR, Soundbox and EDC transaction — the sales side no other tool can see.
          </Feature>
          <Feature icon={<BadgeCheck className="h-5 w-5" />} title="Already the default">
            4.8 crore+ registered merchants already open Paytm every day.
          </Feature>
          <Feature icon={<Wallet className="h-5 w-5" />} title="Lending-ready">
            Clean, verified books feed straight into Paytm&apos;s own underwriting.
          </Feature>
        </div>
      </Section>

      {/* CTA */}
      <section className="relative mx-auto max-w-6xl px-5 py-28 text-center">
        <div className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-64 w-[700px] rounded-full bg-brand-500/15 blur-[130px]" />
        <div className="relative">
          <h2 className="display-title mx-auto max-w-3xl text-4xl md:text-5xl">
            The GST layer for 4.8 crore merchants starts here.
          </h2>
          <div className="mt-9">
            <Link href={appHref} className="btn-primary bg-white px-7 py-3.5 text-ink hover:bg-white/90">
              {appLabel} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 py-8 text-sm text-white/35 md:flex-row">
          <Logo />
          <span>Hisaab · Merchant Growth AI · Built for India</span>
        </div>
      </footer>
    </div>
  );
}

function HeroVisual({
  snap,
}: {
  snap: Awaited<ReturnType<typeof getHeroSnapshot>>;
}) {
  return (
    <div className="relative">
      <div className="pointer-events-none absolute -right-8 -top-10 h-44 w-44 rounded-full bg-brand-400/20 blur-3xl" />

      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-pop backdrop-blur-xl sm:p-7">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-white/55">
            <Store className="h-4 w-4 text-brand-300" />
            <span className="truncate">{snap.businessName}</span>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 text-[11px] font-medium text-white/50">
            <LiveDot /> {periodLabel(snap.period).split(" ")[0]}
          </span>
        </div>

        {/* Headline number */}
        <p className="mt-5 text-xs font-medium uppercase tracking-wide text-white/40">
          Unclaimed input tax credit
        </p>
        <p className="display-hero tnum mt-1 text-6xl leading-none text-white">
          {inr(snap.unclaimedItc)}
        </p>

        {/* Flagged banner */}
        <div className="mt-5 flex items-center gap-3 rounded-xl border border-warning/25 bg-warning/10 px-3.5 py-2.5 text-sm text-white/80">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-warning/25 text-xs font-semibold text-warning">
            {snap.flaggedCount}
          </span>
          {snap.flaggedCount === 1 ? "invoice" : "invoices"} flagged for review before filing
        </div>

        {/* Real metric row */}
        <div className="mt-5 grid grid-cols-3 gap-2">
          <MiniStat label="Sales" value={inr(snap.salesTotal)} />
          <MiniStat label="ITC claimed" value={inr(snap.itcThisMonth)} accent />
          <MiniStat label="Net payable" value={inr(snap.netPayable)} />
        </div>

        {/* Voice row (in-card, no overlap) */}
        <div className="mt-5 flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600">
            <Mic className="h-4 w-4" />
          </span>
          <span className="text-sm text-white/70">&ldquo;इस महीने कितना GST बचा?&rdquo;</span>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
      <p className="text-[11px] text-white/40">{label}</p>
      <p className={`tnum mt-0.5 truncate text-sm font-semibold ${accent ? "text-brand-200" : "text-white"}`}>
        {value}
      </p>
    </div>
  );
}

function ImpactStat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div>
      <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/15 text-brand-200">
        {icon}
      </div>
      <p className="display-title tnum text-2xl text-white">{value}</p>
      <p className="mt-0.5 text-xs leading-snug text-white/45">{label}</p>
    </div>
  );
}

function LiveDot() {
  return (
    <span className="relative flex h-2 w-2">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
    </span>
  );
}

function Logo() {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 font-display text-lg font-medium text-white">
        ह
      </div>
      <span className="text-lg font-medium tracking-tight">Hisaab</span>
    </div>
  );
}

function Section({
  id,
  eyebrow,
  title,
  children,
}: {
  id?: string;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mx-auto max-w-6xl scroll-mt-20 px-5 py-16">
      <p className="mb-3 text-xs font-medium tracking-[0.25em] text-brand-300">{eyebrow}</p>
      <h2 className="display-title mb-9 max-w-3xl text-3xl md:text-[2.6rem]">{title}</h2>
      {children}
    </section>
  );
}

function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur ${className}`}>{children}</div>
  );
}

function Feature({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <GlassCard className="h-full">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/15 text-brand-200">{icon}</div>
      <h3 className="mt-4 text-lg font-medium">{title}</h3>
      <p className="mt-2 text-sm text-white/55">{children}</p>
    </GlassCard>
  );
}

function Stat({ big, small }: { big: string; small: string }) {
  return (
    <GlassCard>
      <p className="display-title text-3xl text-brand-200">{big}</p>
      <p className="mt-1 text-sm text-white/55">{small}</p>
    </GlassCard>
  );
}
