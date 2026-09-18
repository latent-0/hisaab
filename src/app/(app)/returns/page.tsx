import Link from "next/link";
import { ArrowRight, FileCheck2 } from "lucide-react";
import { getCurrentMerchant } from "@/lib/session";
import { prisma } from "@/lib/db";
import { ActionButton } from "@/components/ActionButton";
import { Card, EmptyState, StatusBadge } from "@/components/ui";
import { currentPeriod, daysUntil, inr, periodLabel, returnDueDate } from "@/lib/utils";

export default async function ReturnsPage() {
  const merchant = (await getCurrentMerchant())!;
  const period = currentPeriod();

  const returns = await prisma.gstReturn.findMany({
    where: { merchantId: merchant.id },
    orderBy: { period: "desc" },
  });

  const hasCurrent = returns.some((r) => r.period === period);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[1.9rem] font-light tracking-tight text-ink">GST returns</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Pre-filled GSTR-3B drafts, always reviewed by a human before filing.
          </p>
        </div>
        {!hasCurrent && (
          <ActionButton url={`/api/returns/${period}`} variant="primary">
            Generate {periodLabel(period)}
          </ActionButton>
        )}
      </div>

      {returns.length === 0 ? (
        <EmptyState
          icon={<FileCheck2 className="h-10 w-10" />}
          title="No returns drafted yet"
          description="Sync your Paytm sales and add a few invoices, then generate your first GSTR-3B draft."
          action={
            <ActionButton url={`/api/returns/${period}`} variant="primary">
              Generate {periodLabel(period)}
            </ActionButton>
          }
        />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border bg-surface-muted text-left text-xs uppercase tracking-wide text-ink-muted">
                <th className="px-4 py-3 font-semibold">Period</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 text-right font-semibold">Output tax</th>
                <th className="px-4 py-3 text-right font-semibold">ITC</th>
                <th className="px-4 py-3 text-right font-semibold">Net payable</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Due</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {returns.map((r) => {
                const due = returnDueDate(r.period);
                const left = daysUntil(due);
                return (
                  <tr key={r.id} className="transition hover:bg-surface-muted">
                    <td className="px-4 py-3 font-medium text-ink">{periodLabel(r.period)}</td>
                    <td className="px-4 py-3 text-ink-soft">{r.type}</td>
                    <td className="px-4 py-3 text-right">{inr(r.outputTax)}</td>
                    <td className="px-4 py-3 text-right text-success">{inr(r.itcClaimed)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-ink">{inr(r.netPayable)}</td>
                    <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                    <td className="px-4 py-3 text-xs text-ink-muted">
                      {r.status === "filed" ? ", " : left >= 0 ? `${left} days` : `${-left} days ago`}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/returns/${r.period}`} className="inline-flex items-center gap-1 text-sm font-medium text-brand-600">
                        Open <ArrowRight className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
