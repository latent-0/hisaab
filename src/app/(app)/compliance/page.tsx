import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { getCurrentMerchant } from "@/lib/session";
import { getComplianceItems } from "@/lib/compliance";
import { Badge, Card } from "@/components/ui";
import { NoticeAssistant } from "./NoticeAssistant";

const STATUS: Record<string, { tone: string; label: string }> = {
  filed: { tone: "green", label: "Filed" },
  overdue: { tone: "red", label: "Overdue" },
  due_soon: { tone: "amber", label: "Due soon" },
  upcoming: { tone: "gray", label: "Upcoming" },
};

export default async function CompliancePage() {
  const merchant = (await getCurrentMerchant())!;
  const items = await getComplianceItems(merchant.id);
  const openCount = items.filter((i) => i.status !== "filed").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[1.9rem] font-light tracking-tight text-ink">Compliance calendar</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Every deadline in one place — GST, TDS, advance tax and more. Never miss a date, never fear a notice.
        </p>
      </div>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
            <CalendarClock className="h-4 w-4 text-brand-600" /> Upcoming deadlines
          </h2>
          <span className="text-xs text-ink-muted">{openCount} open</span>
        </div>
        <ul className="divide-y divide-surface-border">
          {items.map((it) => {
            const s = STATUS[it.status];
            const due = new Date(it.dueDate);
            return (
              <li key={it.key} className="flex items-center gap-4 py-3">
                <div className="w-14 shrink-0 text-center">
                  <p className="text-lg font-bold leading-none text-ink">{due.getDate()}</p>
                  <p className="text-[11px] uppercase text-ink-muted">{due.toLocaleString("en-IN", { month: "short" })}</p>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink">{it.title}</p>
                  <p className="text-xs text-ink-muted">{it.authority} · {it.detail}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <Badge tone={s.tone}>{s.label}</Badge>
                  {it.status !== "filed" && (
                    <span className="text-[11px] text-ink-muted">
                      {it.daysLeft >= 0 ? `in ${it.daysLeft} days` : `${-it.daysLeft} days ago`}
                    </span>
                  )}
                </div>
                {it.key === "gstr3b" && it.status !== "filed" && (
                  <Link href="/returns" className="shrink-0 text-xs font-semibold text-brand-600">File →</Link>
                )}
              </li>
            );
          })}
        </ul>
      </Card>

      <NoticeAssistant />
    </div>
  );
}
