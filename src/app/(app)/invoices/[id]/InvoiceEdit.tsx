"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Pencil, X } from "lucide-react";

interface Fields {
  supplierName: string;
  supplierGstin: string;
  invoiceNo: string;
  taxableValue: string;
  cgst: string;
  sgst: string;
  gstRate: string;
}

export function InvoiceEdit({
  id,
  initial,
}: {
  id: string;
  initial: Partial<Fields>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fields, setFields] = useState<Fields>({
    supplierName: initial.supplierName ?? "",
    supplierGstin: initial.supplierGstin ?? "",
    invoiceNo: initial.invoiceNo ?? "",
    taxableValue: initial.taxableValue ?? "",
    cgst: initial.cgst ?? "",
    sgst: initial.sgst ?? "",
    gstRate: initial.gstRate ?? "",
  });

  async function save() {
    setLoading(true);
    try {
      const res = await fetch(`/api/invoices/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields }),
      });
      if (res.ok) {
        setOpen(false);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-ghost">
        <Pencil className="h-4 w-4" /> Correct fields
      </button>
    );
  }

  return (
    <div className="card space-y-3 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink">Correct extracted fields</h3>
        <button onClick={() => setOpen(false)} className="text-ink-muted">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <F label="Supplier" v={fields.supplierName} on={(x) => setFields({ ...fields, supplierName: x })} full />
        <F label="GSTIN" v={fields.supplierGstin} on={(x) => setFields({ ...fields, supplierGstin: x })} full />
        <F label="Invoice no." v={fields.invoiceNo} on={(x) => setFields({ ...fields, invoiceNo: x })} />
        <F label="Taxable ₹" v={fields.taxableValue} on={(x) => setFields({ ...fields, taxableValue: x })} />
        <F label="CGST ₹" v={fields.cgst} on={(x) => setFields({ ...fields, cgst: x })} />
        <F label="SGST ₹" v={fields.sgst} on={(x) => setFields({ ...fields, sgst: x })} />
        <F label="GST rate %" v={fields.gstRate} on={(x) => setFields({ ...fields, gstRate: x })} />
      </div>
      <p className="text-xs text-ink-muted">Saving re-runs the pipeline with your corrections.</p>
      <div className="flex justify-end gap-2">
        <button onClick={() => setOpen(false)} className="btn-ghost" disabled={loading}>Cancel</button>
        <button onClick={save} className="btn-primary" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save & re-run"}
        </button>
      </div>
    </div>
  );
}

function F({ label, v, on, full }: { label: string; v: string; on: (x: string) => void; full?: boolean }) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <label className="label">{label}</label>
      <input className="input" value={v} onChange={(e) => on(e.target.value)} />
    </div>
  );
}
