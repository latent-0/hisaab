"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BellRing, Check, Loader2, Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/ui";
import { inr } from "@/lib/utils";

export interface KhataEntry {
  id: string;
  party: string;
  phone: string | null;
  kind: "receivable" | "payable";
  amount: number;
  note: string | null;
  dueDate: string | null;
  status: "open" | "paid";
  overdue: boolean;
}

export function KhataClient({ entries }: { entries: KhataEntry[] }) {
  const router = useRouter();
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [adding, setAdding] = useState<"receivable" | "payable" | null>(null);

  const recv = entries.filter((e) => e.kind === "receivable" && e.status === "open");
  const pay = entries.filter((e) => e.kind === "payable" && e.status === "open");

  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2400);
  };

  async function act(id: string, action: string) {
    setBusy(id + action);
    try {
      const res = await fetch(`/api/khata/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.message) flash(data.message);
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function del(id: string) {
    setBusy(id + "del");
    try {
      await fetch(`/api/khata/${id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Column
        title="You'll receive (udhaar)"
        entries={recv}
        accent="text-success"
        onAdd={() => setAdding("receivable")}
        addOpen={adding === "receivable"}
        onClose={() => setAdding(null)}
        onAdded={() => { setAdding(null); router.refresh(); }}
        kind="receivable"
        act={act}
        del={del}
        busy={busy}
      />
      <Column
        title="You'll pay"
        entries={pay}
        accent="text-ink"
        onAdd={() => setAdding("payable")}
        addOpen={adding === "payable"}
        onClose={() => setAdding(null)}
        onAdded={() => { setAdding(null); router.refresh(); }}
        kind="payable"
        act={act}
        del={del}
        busy={busy}
      />

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink px-4 py-2.5 text-sm font-medium text-white shadow-pop">
          {toast}
        </div>
      )}
    </div>
  );
}

function Column({
  title, entries, accent, onAdd, addOpen, onClose, onAdded, kind, act, del, busy,
}: {
  title: string; entries: KhataEntry[]; accent: string; onAdd: () => void; addOpen: boolean;
  onClose: () => void; onAdded: () => void; kind: "receivable" | "payable";
  act: (id: string, action: string) => void; del: (id: string) => void; busy: string | null;
}) {
  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        <button onClick={onAdd} className="btn-subtle px-3 py-1.5 text-xs"><Plus className="h-3.5 w-3.5" /> Add</button>
      </div>

      {addOpen && <AddForm kind={kind} onClose={onClose} onAdded={onAdded} />}

      {entries.length === 0 ? (
        <p className="py-6 text-center text-sm text-ink-muted">Nothing here.</p>
      ) : (
        <ul className="divide-y divide-surface-border">
          {entries.map((e) => (
            <li key={e.id} className="flex items-center gap-3 py-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-muted text-sm font-semibold text-ink-soft">
                {e.party.slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{e.party}</p>
                <p className="text-xs text-ink-muted">
                  {e.dueDate ? new Date(e.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "no due date"}
                  {e.overdue && <span className="ml-1 rounded bg-danger/10 px-1.5 py-0.5 text-[10px] font-semibold text-danger">overdue</span>}
                </p>
              </div>
              <span className={`tnum text-sm font-semibold ${accent}`}>{inr(e.amount)}</span>
              <div className="flex shrink-0 gap-1">
                {kind === "receivable" && (
                  <button onClick={() => act(e.id, "remind")} title="Send reminder" className="rounded-lg p-1.5 text-brand-600 hover:bg-brand-50" disabled={busy === e.id + "remind"}>
                    {busy === e.id + "remind" ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellRing className="h-4 w-4" />}
                  </button>
                )}
                <button onClick={() => act(e.id, "pay")} title="Mark settled" className="rounded-lg p-1.5 text-success hover:bg-success/10" disabled={busy === e.id + "pay"}>
                  {busy === e.id + "pay" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                </button>
                <button onClick={() => del(e.id)} title="Delete" className="rounded-lg p-1.5 text-ink-muted hover:bg-surface-muted" disabled={busy === e.id + "del"}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function AddForm({ kind, onClose, onAdded }: { kind: "receivable" | "payable"; onClose: () => void; onAdded: () => void }) {
  const [f, setF] = useState({ party: "", amount: "", phone: "", dueDate: "" });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/khata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, kind }),
      });
      if (!res.ok) {
        setErr((await res.json().catch(() => ({}))).error ?? "Failed");
        return;
      }
      onAdded();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mb-3 space-y-2 rounded-xl border border-surface-border bg-surface-muted p-3">
      <div className="grid grid-cols-2 gap-2">
        <input className="input py-2" placeholder={kind === "receivable" ? "Customer name" : "Supplier name"} value={f.party} onChange={(e) => setF({ ...f, party: e.target.value })} />
        <input className="input py-2" placeholder="Amount ₹" inputMode="numeric" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} />
        <input className="input py-2" placeholder="Phone (optional)" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
        <input className="input py-2" type="date" value={f.dueDate} onChange={(e) => setF({ ...f, dueDate: e.target.value })} />
      </div>
      {err && <p className="text-xs text-danger">{err}</p>}
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="btn-ghost px-3 py-1.5 text-xs">Cancel</button>
        <button onClick={submit} className="btn-primary px-3 py-1.5 text-xs" disabled={loading}>
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
        </button>
      </div>
    </div>
  );
}
