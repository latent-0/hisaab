import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  FileText,
  RefreshCw,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import { getCurrentMerchant } from "@/lib/session";
import { prisma } from "@/lib/db";
import { EXPENSE_CATEGORIES } from "@/lib/constants";
import type { AgentStepTrace } from "@/lib/types";
import { inr, parseJson } from "@/lib/utils";
import { ActionButton } from "@/components/ActionButton";
import { Badge, Card, StatusBadge } from "@/components/ui";
import { InvoiceEdit } from "./InvoiceEdit";

export default async function InvoiceDetail({ params }: { params: Promise<{ id: string }> }) {
  const merchant = (await getCurrentMerchant())!;
  const { id } = await params;

  const invoice = await prisma.purchaseInvoice.findUnique({
    where: { id },
    include: { reviews: { where: { status: "open" } } },
  });
  if (!invoice || invoice.merchantId !== merchant.id) notFound();

  const run = await prisma.agentRun.findFirst({
    where: { invoiceId: id, status: "completed" },
    orderBy: { startedAt: "desc" },
  });
  const steps = parseJson<AgentStepTrace[]>(run?.steps ?? null, []);

  const gst = (invoice.cgst + invoice.sgst + invoice.igst) || 0;
  const cat = invoice.category ? EXPENSE_CATEGORIES[invoice.category]?.label ?? invoice.category : "—";

  return (
    <div className="space-y-6">
      <Link href="/invoices" className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Back to invoices
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-[1.9rem] font-light tracking-tight text-ink">
              {invoice.supplierName ?? "Unknown supplier"}
            </h1>
            <StatusBadge status={invoice.status} />
          </div>
          <p className="mt-1 text-sm text-ink-muted">
            {invoice.invoiceNo ?? "—"} ·{" "}
            {invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString("en-IN", { dateStyle: "medium" }) : "no date"} ·{" "}
            {invoice.supplierGstin ?? "no GSTIN"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ActionButton url={`/api/invoices/${id}`} method="PATCH" body={{ action: "reprocess" }} variant="ghost">
            <RefreshCw className="h-4 w-4" /> Re-run pipeline
          </ActionButton>
          {invoice.status !== "approved" && (
            <ActionButton url={`/api/invoices/${id}`} method="PATCH" body={{ action: "approve" }} variant="primary">
              <CheckCircle2 className="h-4 w-4" /> Approve
            </ActionButton>
          )}
          {invoice.status !== "rejected" && (
            <ActionButton url={`/api/invoices/${id}`} method="PATCH" body={{ action: "reject" }} variant="danger">
              <XCircle className="h-4 w-4" /> Reject
            </ActionButton>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Pipeline trace */}
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink">Agent pipeline trace</h2>
              {run && <span className="text-xs text-ink-muted">via {run.provider}</span>}
            </div>
            {steps.length === 0 ? (
              <p className="text-sm text-ink-muted">No run recorded yet.</p>
            ) : (
              <ol className="relative space-y-4 border-l border-surface-border pl-6">
                {steps.map((s, i) => (
                  <li key={i} className="relative">
                    <span
                      className={`absolute -left-[27px] flex h-5 w-5 items-center justify-center rounded-full text-white ${
                        s.status === "ok" ? "bg-success" : s.status === "review" ? "bg-warning" : "bg-danger"
                      }`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-white" />
                    </span>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-ink">{s.label}</p>
                      <Badge tone={s.status === "ok" ? "green" : s.status === "review" ? "amber" : "red"}>
                        {Math.round(s.confidence * 100)}% conf
                      </Badge>
                      <span className="text-xs text-ink-muted">{s.durationMs}ms</span>
                    </div>
                    <p className="mt-0.5 text-sm text-ink-soft">{s.summary}</p>
                  </li>
                ))}
              </ol>
            )}
          </Card>

          {/* Open issues */}
          {invoice.reviews.length > 0 && (
            <Card>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
                <ShieldAlert className="h-4 w-4 text-warning" /> Needs your attention
              </h2>
              <ul className="space-y-3">
                {invoice.reviews.map((r) => (
                  <li key={r.id} className="rounded-xl border border-warning/30 bg-warning/5 p-3">
                    <div className="flex items-center gap-2">
                      <Badge tone={r.severity === "high" ? "red" : "amber"}>{r.severity}</Badge>
                      <p className="text-sm font-semibold text-ink">{r.title}</p>
                    </div>
                    <p className="mt-1 text-sm text-ink-soft">{r.detail}</p>
                    {r.suggestion && <p className="mt-1 text-xs text-ink-muted">💡 {r.suggestion}</p>}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <InvoiceEdit
            id={id}
            initial={{
              supplierName: invoice.supplierName ?? "",
              supplierGstin: invoice.supplierGstin ?? "",
              invoiceNo: invoice.invoiceNo ?? "",
              taxableValue: invoice.taxableValue?.toString() ?? "",
              cgst: invoice.cgst?.toString() ?? "",
              sgst: invoice.sgst?.toString() ?? "",
              gstRate: invoice.gstRate?.toString() ?? "",
            }}
          />

          {/* Raw text */}
          {invoice.ocrText && (
            <Card>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
                <FileText className="h-4 w-4" /> Extracted text
              </h2>
              <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-xl bg-surface-muted p-4 text-xs text-ink-soft">
                {invoice.ocrText}
              </pre>
            </Card>
          )}
        </div>

        {/* Summary sidebar */}
        <div className="space-y-6">
          <Card>
            <h2 className="mb-3 text-sm font-semibold text-ink">Tax summary</h2>
            <dl className="space-y-2.5 text-sm">
              <Line label="Taxable value" value={inr(invoice.taxableValue ?? 0)} />
              <Line label="GST rate" value={invoice.gstRate != null ? `${invoice.gstRate}%` : "—"} />
              <Line label="CGST" value={inr(invoice.cgst)} />
              <Line label="SGST" value={inr(invoice.sgst)} />
              <Line label="IGST" value={inr(invoice.igst)} />
              <div className="my-1 h-px bg-surface-border" />
              <Line label="Total GST" value={inr(gst)} strong />
              <Line label="Invoice total" value={inr(invoice.total ?? 0)} />
            </dl>
          </Card>

          <Card>
            <h2 className="mb-3 text-sm font-semibold text-ink">Classification</h2>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-xs text-ink-muted">Category</p>
                <p className="font-medium text-ink">{cat}</p>
              </div>
              <div>
                <p className="text-xs text-ink-muted">Input tax credit</p>
                {invoice.itcEligible === false ? (
                  <div>
                    <Badge tone="red">Blocked</Badge>
                    <p className="mt-1 text-xs text-ink-muted">{invoice.itcBlockReason}</p>
                  </div>
                ) : invoice.itcEligible ? (
                  <Badge tone="green">Eligible · {inr(gst)}</Badge>
                ) : (
                  <Badge tone="gray">Unknown</Badge>
                )}
              </div>
              <div>
                <p className="text-xs text-ink-muted">GSTR-2B</p>
                <StatusBadge status={invoice.gstr2bStatus} />
                {invoice.matchNotes && <p className="mt-1 text-xs text-ink-muted">{invoice.matchNotes}</p>}
              </div>
              <div>
                <p className="text-xs text-ink-muted">Confidence</p>
                <div className="mt-1 flex items-center gap-2">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-muted">
                    <div
                      className="h-full rounded-full bg-brand-500"
                      style={{ width: `${Math.round(invoice.confidence * 100)}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-ink">{Math.round(invoice.confidence * 100)}%</span>
                </div>
              </div>
            </div>
          </Card>

          <div className="flex items-center gap-2 rounded-xl bg-surface-muted px-3 py-2.5 text-xs text-ink-muted">
            <Clock className="h-3.5 w-3.5" />
            Added {new Date(invoice.createdAt).toLocaleDateString("en-IN", { dateStyle: "medium" })} · source {invoice.source}
          </div>
        </div>
      </div>
    </div>
  );
}

function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-ink-muted">{label}</dt>
      <dd className={strong ? "font-bold text-ink" : "font-medium text-ink"}>{value}</dd>
    </div>
  );
}
