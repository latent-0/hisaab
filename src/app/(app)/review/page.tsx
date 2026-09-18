import Link from "next/link";
import { CheckCircle2, ListChecks, ShieldAlert } from "lucide-react";
import { getCurrentMerchant } from "@/lib/session";
import { prisma } from "@/lib/db";
import { ActionButton } from "@/components/ActionButton";
import { Badge, Card, EmptyState } from "@/components/ui";
import { inr } from "@/lib/utils";

export default async function ReviewPage() {
  const merchant = (await getCurrentMerchant())!;

  const tasks = await prisma.reviewTask.findMany({
    where: { merchantId: merchant.id, status: "open" },
    orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
    include: { invoice: true },
  });

  const resolvedCount = await prisma.reviewTask.count({
    where: { merchantId: merchant.id, status: { in: ["resolved", "dismissed"] } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[1.9rem] font-light tracking-tight text-ink">Review queue</h1>
        <p className="mt-1 text-sm text-ink-muted">
          A human reviews anything the model isn&apos;t sure about, always. Clear these before filing.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/15 text-[#a9760a]">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-bold text-ink">{tasks.length}</p>
            <p className="text-xs text-ink-muted">open items</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/15 text-success">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-bold text-ink">{resolvedCount}</p>
            <p className="text-xs text-ink-muted">resolved all-time</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <ListChecks className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-bold text-ink">
              {inr(
                tasks.reduce((a, t) => a + ((t.invoice?.cgst ?? 0) + (t.invoice?.sgst ?? 0) + (t.invoice?.igst ?? 0)), 0),
              )}
            </p>
            <p className="text-xs text-ink-muted">ITC riding on these</p>
          </div>
        </Card>
      </div>

      {tasks.length === 0 ? (
        <EmptyState
          icon={<CheckCircle2 className="h-10 w-10 text-success" />}
          title="All clear, nothing to review"
          description="Every invoice is reconciled and your GSTR-3B draft is ready to file."
          action={<Link href="/returns" className="btn-primary">Go to returns</Link>}
        />
      ) : (
        <div className="space-y-3">
          {tasks.map((t) => (
            <Card key={t.id} className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={t.severity === "high" ? "red" : t.severity === "medium" ? "amber" : "gray"}>
                    {t.severity}
                  </Badge>
                  <p className="font-semibold text-ink">{t.title}</p>
                  {t.invoice && (
                    <Link href={`/invoices/${t.invoice.id}`} className="text-xs font-medium text-brand-600">
                      {t.invoice.supplierName ?? "invoice"} →
                    </Link>
                  )}
                </div>
                <p className="mt-1 text-sm text-ink-soft">{t.detail}</p>
                {t.suggestion && <p className="mt-1 text-xs text-ink-muted">💡 {t.suggestion}</p>}
              </div>
              <div className="flex shrink-0 gap-2">
                <ActionButton url={`/api/review/${t.id}`} method="PATCH" body={{ action: "dismiss" }} variant="ghost">
                  Dismiss
                </ActionButton>
                <ActionButton url={`/api/review/${t.id}`} method="PATCH" body={{ action: "resolve" }} variant="primary">
                  <CheckCircle2 className="h-4 w-4" /> Resolve
                </ActionButton>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
