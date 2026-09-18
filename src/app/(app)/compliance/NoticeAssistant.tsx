"use client";

import { useState } from "react";
import { Loader2, Sparkles, Wand2 } from "lucide-react";
import { Card, Badge } from "@/components/ui";

interface Explanation {
  title: string;
  summary: string;
  severity: "low" | "medium" | "high";
  steps: string[];
  deadlineHint?: string | null;
}

const SAMPLE = `Form GST ASMT-10 — Notice for intimation of discrepancies in the return after scrutiny.
On scrutiny of your GSTR-3B for the tax period, the input tax credit availed appears higher than that reflected in your auto-populated GSTR-2B. You are requested to explain the discrepancy or pay the differential tax with interest within 15 days, failing which action under sections 73/74 may be initiated.`;

export function NoticeAssistant() {
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState<Explanation | null>(null);

  async function explain() {
    if (!notice.trim()) return;
    setLoading(true);
    setRes(null);
    try {
      const r = await fetch("/api/compliance/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notice }),
      });
      setRes(await r.json());
    } finally {
      setLoading(false);
    }
  }

  const tone = res?.severity === "high" ? "red" : res?.severity === "medium" ? "amber" : "green";

  return (
    <Card>
      <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
        <Wand2 className="h-4 w-4 text-brand-600" /> Got a GST notice? Understand it in plain language
      </h2>
      <p className="mt-1 text-sm text-ink-muted">
        Paste the notice text. Hisaab explains what it means and what to do — before you panic or pay a CA.
      </p>
      <textarea
        className="input mt-3 min-h-[110px] text-sm"
        placeholder="Paste the notice text here…"
        value={notice}
        onChange={(e) => setNotice(e.target.value)}
      />
      <div className="mt-2 flex items-center gap-2">
        <button onClick={explain} className="btn-primary" disabled={loading || !notice.trim()}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Explain this notice
        </button>
        <button onClick={() => setNotice(SAMPLE)} className="text-xs font-medium text-brand-600">Paste a sample</button>
      </div>

      {res && (
        <div className="mt-4 rounded-xl border border-surface-border bg-surface-muted p-4">
          <div className="flex items-center gap-2">
            <Badge tone={tone}>{res.severity} urgency</Badge>
            <p className="font-semibold text-ink">{res.title}</p>
          </div>
          <p className="mt-2 text-sm text-ink-soft">{res.summary}</p>
          {res.deadlineHint && <p className="mt-1 text-xs font-medium text-danger">⏰ {res.deadlineHint}</p>}
          {res.steps?.length > 0 && (
            <ol className="mt-3 space-y-1.5">
              {res.steps.map((s, i) => (
                <li key={i} className="flex gap-2 text-sm text-ink-soft">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">{i + 1}</span>
                  {s}
                </li>
              ))}
            </ol>
          )}
          <p className="mt-3 text-[11px] text-ink-muted">Guidance only, not legal advice. For demands, confirm with a CA.</p>
        </div>
      )}
    </Card>
  );
}
