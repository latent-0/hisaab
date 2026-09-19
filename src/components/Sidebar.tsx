"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  Activity,
  BarChart3,
  Banknote,
  CalendarClock,
  Check,
  ChevronsUpDown,
  FileCheck2,
  GaugeCircle,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  NotebookPen,
  Receipt,
  Settings,
  ShieldAlert,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/health", label: "Business health", icon: Activity },
  { href: "/invoices", label: "Invoices", icon: Receipt },
  { href: "/reconciliation", label: "Reconciliation", icon: GaugeCircle },
  { href: "/returns", label: "GST Returns", icon: FileCheck2 },
  { href: "/review", label: "Review queue", icon: ListChecks, badgeKey: "review" as const },
  { href: "/khata", label: "Khata", icon: NotebookPen },
  { href: "/credit", label: "Working capital", icon: Banknote },
  { href: "/compliance", label: "Compliance", icon: CalendarClock },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({
  merchant,
  merchants,
  openReviews,
}: {
  merchant: { id: string; businessName: string; ownerName: string; gstin: string; planTier: string };
  merchants: { id: string; businessName: string; gstin: string }[];
  openReviews: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  async function switchAccount(merchantId: string) {
    if (merchantId === merchant.id) {
      setSwitcherOpen(false);
      return;
    }
    setSwitchingId(merchantId);
    try {
      await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merchantId }),
      });
      setSwitcherOpen(false);
      router.push("/dashboard");
      router.refresh();
    } finally {
      setSwitchingId(null);
    }
  }

  const content = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500 font-bold text-white">ह</div>
        <div>
          <p className="text-base font-semibold tracking-tight text-ink">Hisaab</p>
          <p className="text-[11px] text-ink-muted">GST copilot</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                active ? "bg-brand-50 text-brand-700" : "text-ink-soft hover:bg-surface-muted",
              )}
            >
              <Icon className={cn("h-5 w-5", active ? "text-brand-600" : "text-ink-muted")} />
              <span className="flex-1">{item.label}</span>
              {item.badgeKey === "review" && openReviews > 0 && (
                <span className="chip bg-warning/15 text-[#a9760a]">{openReviews}</span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="relative border-t border-surface-border p-3">
        {switcherOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setSwitcherOpen(false)} />
            <div className="absolute bottom-full left-3 right-3 z-20 mb-2 max-h-72 overflow-y-auto rounded-xl border border-surface-border bg-surface p-1.5 shadow-pop">
              <p className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                Switch account
              </p>
              {merchants.map((m) => (
                <button
                  key={m.id}
                  onClick={() => switchAccount(m.id)}
                  disabled={switchingId !== null}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition hover:bg-surface-muted disabled:opacity-60"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-semibold text-white">
                    {m.businessName.slice(0, 1)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-ink">{m.businessName}</p>
                    <p className="truncate text-[11px] text-ink-muted">{m.gstin}</p>
                  </div>
                  {m.id === merchant.id && <Check className="h-4 w-4 shrink-0 text-brand-600" />}
                </button>
              ))}
            </div>
          </>
        )}

        <button
          onClick={() => setSwitcherOpen((v) => !v)}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-surface-muted"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-semibold text-white">
            {merchant.businessName.slice(0, 1)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink">{merchant.businessName}</p>
            <p className="truncate text-[11px] text-ink-muted">{merchant.gstin}</p>
          </div>
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-ink-muted" />
        </button>
        <button
          onClick={logout}
          className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-soft transition hover:bg-surface-muted"
        >
          <LogOut className="h-4 w-4 text-ink-muted" /> Sign out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-40 flex items-center justify-between border-b border-surface-border bg-surface px-4 py-3 lg:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 font-bold text-white">ह</div>
          <span className="font-semibold">Hisaab</span>
          {openReviews > 0 && (
            <span className="chip bg-warning/15 text-[#a9760a]">
              <ShieldAlert className="h-3 w-3" /> {openReviews}
            </span>
          )}
        </div>
        <button onClick={() => setOpen(true)} className="btn-ghost p-2">
          <Menu className="h-5 w-5" />
        </button>
      </div>
      <div className="h-14 lg:hidden" />

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-surface-border bg-surface lg:block">
        {content}
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-surface shadow-pop">
            <button onClick={() => setOpen(false)} className="absolute right-3 top-4 text-ink-muted">
              <X className="h-5 w-5" />
            </button>
            {content}
          </aside>
        </div>
      )}
    </>
  );
}
