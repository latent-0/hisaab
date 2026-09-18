import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("card p-5", className)}>{children}</div>;
}

export function SectionHeading({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-lg font-medium tracking-tight text-ink">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-ink-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
  icon,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "default" | "success" | "warning" | "danger" | "brand";
  icon?: ReactNode;
}) {
  const toneRing = {
    default: "",
    success: "ring-1 ring-success/20",
    warning: "ring-1 ring-warning/25",
    danger: "ring-1 ring-danger/25",
    brand: "ring-1 ring-brand-200",
  }[tone];
  const valueColor = {
    default: "text-ink",
    success: "text-success",
    warning: "text-[#b47905]",
    danger: "text-danger",
    brand: "text-brand-700",
  }[tone];
  return (
    <div className={cn("card p-5", toneRing)}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{label}</p>
        {icon && <span className="text-ink-muted">{icon}</span>}
      </div>
      <p className={cn("tnum mt-2 text-[1.7rem] font-semibold tracking-tight", valueColor)}>{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-muted">{hint}</p>}
    </div>
  );
}

const TONE_CLASSES: Record<string, string> = {
  green: "bg-success/10 text-success",
  amber: "bg-warning/15 text-[#a9760a]",
  red: "bg-danger/10 text-danger",
  blue: "bg-brand-50 text-brand-700",
  gray: "bg-slate-100 text-slate-600",
};

export function Badge({
  children,
  tone = "gray",
  className,
}: {
  children: ReactNode;
  tone?: keyof typeof TONE_CLASSES | string;
  className?: string;
}) {
  return <span className={cn("chip", TONE_CLASSES[tone] ?? TONE_CLASSES.gray, className)}>{children}</span>;
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      {icon && <div className="text-brand-400">{icon}</div>}
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      {description && <p className="max-w-sm text-sm text-ink-muted">{description}</p>}
      {action}
    </div>
  );
}

export function LinkButton({
  href,
  children,
  variant = "primary",
  className,
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "ghost" | "subtle";
  className?: string;
}) {
  const cls = variant === "primary" ? "btn-primary" : variant === "subtle" ? "btn-subtle" : "btn-ghost";
  return (
    <Link href={href} className={cn(cls, className)}>
      {children}
    </Link>
  );
}

/** GST return / invoice status → badge. */
export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { tone: string; label: string }> = {
    approved: { tone: "green", label: "Approved" },
    needs_review: { tone: "amber", label: "Needs review" },
    processing: { tone: "blue", label: "Processing" },
    received: { tone: "gray", label: "Received" },
    rejected: { tone: "red", label: "Rejected" },
    draft: { tone: "blue", label: "Draft" },
    reviewed: { tone: "amber", label: "Reviewed" },
    filed: { tone: "green", label: "Filed" },
    matched: { tone: "green", label: "2B matched" },
    mismatch: { tone: "red", label: "2B mismatch" },
    missing: { tone: "amber", label: "Not in 2B" },
    unknown: { tone: "gray", label: "2B unknown" },
    open: { tone: "amber", label: "Open" },
    resolved: { tone: "green", label: "Resolved" },
    dismissed: { tone: "gray", label: "Dismissed" },
  };
  const s = map[status] ?? { tone: "gray", label: status };
  return <Badge tone={s.tone}>{s.label}</Badge>;
}
