"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FileUp, Loader2, PlusCircle, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Mode = "upload" | "manual";

const SAMPLE = `TAX INVOICE
Krishna Electricals & Hardware
GSTIN: 27AABCK4521P1Z9
Invoice No: KEH-2261
Invoice Date: ${new Date().toISOString().slice(0, 10)}
HSN: 8536
Description: LED lighting and electrical fittings
Taxable Value: 12500
CGST @ 9%: 1125
SGST @ 9%: 1125
Grand Total: 14750`;

export function UploadInvoice() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("upload");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [fields, setFields] = useState({
    supplierName: "",
    supplierGstin: "",
    invoiceNo: "",
    taxableValue: "",
    cgst: "",
    sgst: "",
    gstRate: "",
  });

  function reset() {
    setFile(null);
    setText("");
    setError(null);
    setFields({ supplierName: "", supplierGstin: "", invoiceNo: "", taxableValue: "", cgst: "", sgst: "", gstRate: "" });
  }

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      let res: Response;
      if (mode === "upload") {
        if (!file && !text.trim()) {
          throw new Error("Attach a file or paste the invoice text.");
        }
        const fd = new FormData();
        if (file) fd.append("file", file);
        if (text.trim()) fd.append("text", text);
        res = await fetch("/api/invoices", { method: "POST", body: fd });
      } else {
        if (!fields.supplierName && !fields.taxableValue) {
          throw new Error("Enter at least a supplier and taxable value.");
        }
        res = await fetch("/api/invoices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(fields),
        });
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Upload failed");
      }
      const data = await res.json();
      setOpen(false);
      reset();
      router.push(`/invoices/${data.invoiceId}`);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-primary">
        <PlusCircle className="h-4 w-4" /> Add invoice
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink/50" onClick={() => !loading && setOpen(false)} />
          <div className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-surface p-6 shadow-pop">
            <button
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 text-ink-muted hover:text-ink"
            >
              <X className="h-5 w-5" />
            </button>
            <h2 className="text-lg font-semibold text-ink">Add a purchase invoice</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Upload a file, paste the text, or enter it manually. Hisaab&apos;s agents will read,
              classify and cross-check it automatically.
            </p>

            <div className="mt-4 inline-flex rounded-xl bg-surface-muted p-1">
              {(["upload", "manual"] as Mode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={cn(
                    "rounded-lg px-4 py-1.5 text-sm font-medium capitalize transition",
                    mode === m ? "bg-surface text-ink shadow-sm" : "text-ink-muted",
                  )}
                >
                  {m === "upload" ? "Upload / paste" : "Manual entry"}
                </button>
              ))}
            </div>

            {mode === "upload" ? (
              <div className="mt-4 space-y-3">
                <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-surface-border bg-surface-muted px-4 py-8 text-center transition hover:border-brand-300">
                  <FileUp className="h-7 w-7 text-brand-500" />
                  <span className="text-sm font-medium text-ink">
                    {file ? file.name : "Click to choose a file"}
                  </span>
                  <span className="text-xs text-ink-muted">PDF, image, or .txt — up to 10 MB</span>
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.png,.jpg,.jpeg,.txt,.csv"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                </label>
                <div className="text-center text-xs text-ink-muted">or paste the invoice text</div>
                <textarea
                  className="input min-h-[120px] font-mono text-xs"
                  placeholder="Paste invoice text here…"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
                <button
                  onClick={() => setText(SAMPLE)}
                  className="text-xs font-medium text-brand-600"
                >
                  <Sparkles className="mr-1 inline h-3 w-3" /> Fill a sample invoice
                </button>
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-2 gap-3">
                <Field label="Supplier name" value={fields.supplierName} onChange={(v) => setFields({ ...fields, supplierName: v })} full />
                <Field label="Supplier GSTIN" value={fields.supplierGstin} onChange={(v) => setFields({ ...fields, supplierGstin: v })} full />
                <Field label="Invoice no." value={fields.invoiceNo} onChange={(v) => setFields({ ...fields, invoiceNo: v })} />
                <Field label="Taxable value ₹" value={fields.taxableValue} onChange={(v) => setFields({ ...fields, taxableValue: v })} />
                <Field label="CGST ₹" value={fields.cgst} onChange={(v) => setFields({ ...fields, cgst: v })} />
                <Field label="SGST ₹" value={fields.sgst} onChange={(v) => setFields({ ...fields, sgst: v })} />
                <Field label="GST rate %" value={fields.gstRate} onChange={(v) => setFields({ ...fields, gstRate: v })} />
              </div>
            )}

            {error && <p className="mt-3 text-sm text-danger">{error}</p>}

            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setOpen(false)} className="btn-ghost" disabled={loading}>
                Cancel
              </button>
              <button onClick={submit} className="btn-primary" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Running pipeline…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" /> Process invoice
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Field({
  label,
  value,
  onChange,
  full,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  full?: boolean;
}) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <label className="label">{label}</label>
      <input className="input" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
