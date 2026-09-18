import Link from "next/link";
import { Receipt } from "lucide-react";
import { getCurrentMerchant } from "@/lib/session";
import { prisma } from "@/lib/db";
import { EMPTY_HINT } from "@/lib/uiText";
import { Badge, EmptyState, StatusBadge } from "@/components/ui";
import { UploadInvoice } from "./UploadInvoice";
import { EXPENSE_CATEGORIES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { inr } from "@/lib/utils";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "needs_review", label: "Needs review" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const merchant = (await getCurrentMerchant())!;
  const { status } = await searchParams;
  const filter = status ?? "all";

  const invoices = await prisma.purchaseInvoice.findMany({
    where: {
      merchantId: merchant.id,
      ...(filter !== "all" ? { status: filter } : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  const counts = await prisma.purchaseInvoice.groupBy({
    by: ["status"],
    where: { merchantId: merchant.id },
    _count: true,
  });
  const countMap = Object.fromEntries(counts.map((c) => [c.status, c._count]));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[1.9rem] font-light tracking-tight text-ink">Purchase invoices</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Every invoice runs through Intake → Classify → Cross-Check → Calculate automatically.
          </p>
        </div>
        <UploadInvoice />
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = filter === f.key;
          const count = f.key === "all"
            ? Object.values(countMap).reduce((a, b) => a + b, 0)
            : countMap[f.key] ?? 0;
          return (
            <Link
              key={f.key}
              href={f.key === "all" ? "/invoices" : `/invoices?status=${f.key}`}
              className={cn(
                "chip border transition",
                active
                  ? "border-brand-300 bg-brand-50 text-brand-700"
                  : "border-surface-border bg-surface text-ink-soft hover:bg-surface-muted",
              )}
            >
              {f.label}
              <span className={cn("ml-1 rounded-full px-1.5", active ? "bg-brand-600 text-white" : "bg-surface-muted")}>
                {count}
              </span>
            </Link>
          );
        })}
      </div>

      {invoices.length === 0 ? (
        <EmptyState
          icon={<Receipt className="h-10 w-10" />}
          title="No invoices here yet"
          description={EMPTY_HINT}
          action={<UploadInvoice />}
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border bg-surface-muted text-left text-xs uppercase tracking-wide text-ink-muted">
                  <th className="px-4 py-3 font-semibold">Supplier</th>
                  <th className="px-4 py-3 font-semibold">Invoice</th>
                  <th className="px-4 py-3 font-semibold">Category</th>
                  <th className="px-4 py-3 text-right font-semibold">GST</th>
                  <th className="px-4 py-3 font-semibold">ITC</th>
                  <th className="px-4 py-3 font-semibold">GSTR-2B</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {invoices.map((inv) => {
                  const gst = (inv.cgst + inv.sgst + inv.igst) || 0;
                  const cat = inv.category ? EXPENSE_CATEGORIES[inv.category]?.label ?? inv.category : ", ";
                  return (
                    <tr key={inv.id} className="group transition hover:bg-surface-muted">
                      <td className="px-4 py-3">
                        <Link href={`/invoices/${inv.id}`} className="block">
                          <span className="font-medium text-ink group-hover:text-brand-700">
                            {inv.supplierName ?? "Unknown supplier"}
                          </span>
                          <span className="block text-xs text-ink-muted">{inv.supplierGstin ?? "no GSTIN"}</span>
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-ink">{inv.invoiceNo ?? ", "}</span>
                        <span className="block text-xs text-ink-muted">
                          {inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString("en-IN") : ", "}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-ink-soft">{cat}</td>
                      <td className="px-4 py-3 text-right font-medium text-ink">{inr(gst)}</td>
                      <td className="px-4 py-3">
                        {inv.itcEligible === false ? (
                          <Badge tone="red">Blocked</Badge>
                        ) : inv.itcEligible ? (
                          <Badge tone="green">Eligible</Badge>
                        ) : (
                          <Badge tone="gray">, </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={inv.gstr2bStatus} /></td>
                      <td className="px-4 py-3"><StatusBadge status={inv.status} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
