"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  BarChart3,
  FileCheck2,
  GaugeCircle,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  Receipt,
  Settings,
  ShieldAlert,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/invoices", label: "Invoices", icon: Receipt },
  { href: "/reconciliation", label: "Reconciliation", icon: GaugeCircle },
  { href: "/returns", label: "GST Returns", icon: FileCheck2 },
  { href: "/review", label: "Review queue", icon: ListChecks, badgeKey: "review" as const },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({
  merchant,
  openReviews,
}: {
  merchant: { businessName: string; ownerName: string; gstin: string; planTier: string };
  openReviews: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
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

      <div className="border-t border-surface-border p-3">
        <div className="flex items-center gap-3 rounded-xl px-3 py-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-sm font-semibold text-white">
            {merchant.businessName.slice(0, 1)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink">{merchant.businessName}</p>
            <p className="truncate text-[11px] text-ink-muted">{merchant.gstin}</p>
          </div>
        </div>
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
