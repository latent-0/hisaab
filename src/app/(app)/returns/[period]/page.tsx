import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Download,
  FileCheck2,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { getCurrentMerchant } from "@/lib/session";
import { prisma } from "@/lib/db";
import { buildReturnData } from "@/lib/returns";
import { ActionButton } from "@/components/ActionButton";
import { Badge, Card, StatusBadge } from "@/components/ui";
import { daysUntil, inr, periodLabel, returnDueDate } from "@/lib/utils";

export default async function ReturnDetail({ params }: { params: Promise<{ period: string }> }) {
  const merchant = (await getCurrentMerchant())!;
  const { period } = await params;

  const [gstReturn, data] = await Promise.all([
    prisma.gstReturn.findUnique({
      where: { merchantId_period_type: { merchantId: merchant.id, period, type: "GSTR3B" } },
    }),
    buildReturnData(merchant.id, period),
  ]);

  const due = returnDueDate(period);
  const left = daysUntil(due);
  const status = gstReturn?.status ?? "draft";

  return (
    <div className="space-y-6">
      <Link href="/returns" className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> All returns
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-[1.9rem] font-light tracking-tight text-ink">GSTR-3B · {periodLabel(period)}</h1>
            <StatusBadge status={status} />
          </div>
          <p className="mt-1 text-sm text-ink-muted">
            {data.merchant.businessName} · {data.merchant.gstin} · Due {due.toLocaleDateString("en-IN", { dateStyle: "medium" })}
            {status !== "filed" && left >= 0 && ` (${left} days)`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ActionButton url={`/api/returns/${period}`} variant="ghost">
            <RefreshCw className="h-4 w-4" /> Regenerate
          </ActionButton>
          <a href={`/api/returns/${period}/export`} className="btn-ghost">
            <Download className="h-4 w-4" /> Export JSON
          </a>
          {status === "draft" && (
            <ActionButton url={`/api/returns/${period}`} body={{ action: "review" }} variant="subtle">
              <ShieldCheck className="h-4 w-4" /> Mark reviewed
            </ActionButton>
          )}
          {status !== "filed" && (
            <ActionButton
              url={`/api/returns/${period}`}
              body={{ action: "file" }}
              variant="primary"
              confirm="Mark this GSTR-3B as filed? (Demo action, this does not submit to the GST portal.)"
            >
              <FileCheck2 className="h-4 w-4" /> Mark as filed
            </ActionButton>
          )}
        </div>
      </div>

      {data.invoicesFlagged > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-warning/40 bg-warning/5 px-4 py-3 text-sm">
          <AlertTriangle className="h-5 w-5 text-warning" />
          <span className="text-ink-soft">
            {data.invoicesFlagged} invoice{data.invoicesFlagged > 1 ? "s are" : " is"} still flagged, with{" "}
            <strong className="text-ink">{inr(data.itcAtRisk)}</strong> of ITC at risk.
          </span>
          <Link href="/review" className="ml-auto text-sm font-medium text-brand-600">Review now →</Link>
        </div>
      )}

      {/* Headline */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">3.1 Output tax</p>
          <p className="mt-2 text-2xl font-bold text-ink">{inr(data.outputTax)}</p>
          <p className="text-xs text-ink-muted">on {inr(data.outwardSupplies.taxableValue)} taxable supplies</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">4. Eligible ITC</p>
          <p className="mt-2 text-2xl font-bold text-success">{inr(data.itcClaimed)}</p>
          <p className="text-xs text-ink-muted">{inr(data.itc.blocked)} blocked under 17(5)</p>
        </Card>
        <Card className="bg-ink text-white">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/50">5.1 Net payable</p>
          <p className="mt-2 text-2xl font-bold">{inr(data.netPayable)}</p>
          <p className="text-xs text-white/50">CGST {inr(data.netLiability.cgst)} · SGST {inr(data.netLiability.sgst)} · IGST {inr(data.netLiability.igst)}</p>
        </Card>
      </div>

      {/* Section 3.1 */}
      <Card>
        <h2 className="mb-3 text-sm font-semibold text-ink">3.1 (a) Outward taxable supplies</h2>
        <Breakdown rows={data.outwardSupplies.total} totals={data.outwardSupplies} />
      </Card>

      {/* Section 4 */}
      <Card>
        <h2 className="mb-3 text-sm font-semibold text-ink">4. Eligible input tax credit</h2>
        {data.itc.total.length === 0 ? (
          <p className="text-sm text-ink-muted">No ITC claimed yet, approve eligible invoices to build it up.</p>
        ) : (
          <Breakdown rows={data.itc.total} totals={data.itc} />
        )}
        {data.itc.blocked > 0 && (
          <p className="mt-3 flex items-center gap-2 text-xs text-ink-muted">
            <Badge tone="red">Blocked</Badge> {inr(data.itc.blocked)} excluded as ineligible under Section 17(5).
          </p>
        )}
      </Card>

      <div className="flex items-center gap-2 rounded-xl bg-surface-muted px-4 py-3 text-xs text-ink-muted">
        <CheckCircle2 className="h-4 w-4 text-success" />
        Generated by the Hisaab pipeline on{" "}
        {gstReturn ? new Date(gstReturn.generatedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : ", "}.
        This is a draft for review, not an official filing.
      </div>
    </div>
  );
}

function Breakdown({
  rows,
  totals,
}: {
  rows: Array<{ rate: number; taxableValue: number; cgst: number; sgst: number; igst: number }>;
  totals: { taxableValue: number; cgst: number; sgst: number; igst: number };
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-surface-border text-left text-xs uppercase tracking-wide text-ink-muted">
            <th className="py-2 font-semibold">Rate</th>
            <th className="py-2 text-right font-semibold">Taxable value</th>
            <th className="py-2 text-right font-semibold">CGST</th>
            <th className="py-2 text-right font-semibold">SGST</th>
            <th className="py-2 text-right font-semibold">IGST</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-border">
          {rows.map((r) => (
            <tr key={r.rate}>
              <td className="py-2.5"><Badge tone="blue">{r.rate}%</Badge></td>
              <td className="py-2.5 text-right">{inr(r.taxableValue)}</td>
              <td className="py-2.5 text-right">{inr(r.cgst)}</td>
              <td className="py-2.5 text-right">{inr(r.sgst)}</td>
              <td className="py-2.5 text-right">{inr(r.igst)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-surface-border font-semibold text-ink">
            <td className="py-2.5">Total</td>
            <td className="py-2.5 text-right">{inr(totals.taxableValue)}</td>
            <td className="py-2.5 text-right">{inr(totals.cgst)}</td>
            <td className="py-2.5 text-right">{inr(totals.sgst)}</td>
            <td className="py-2.5 text-right">{inr(totals.igst)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
