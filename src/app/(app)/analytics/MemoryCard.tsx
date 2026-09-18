"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Brain, Loader2, RefreshCw, Send, Sparkles } from "lucide-react";
import { Card } from "@/components/ui";

const EXAMPLES = [
  "Which supplier gave me the most input tax credit?",
  "How much ITC is blocked and why?",
  "Which invoices are not in my GSTR-2B?",
  "How did my net GST change over the last few months?",
];

export function MemoryCard({
  configured,
  syncedAt,
}: {
  configured: boolean;
  syncedAt: string | null;
}) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [asking, setAsking] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  async function sync() {
    setSyncing(true);
    setNote(null);
    try {
      const res = await fetch("/api/cognee/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Sync failed");
      setNote("Knowledge synced. The graph builds in ~30–60s, then ask away.");
      router.refresh();
    } catch (e) {
      setNote((e as Error).message);
    } finally {
      setSyncing(false);
    }
  }

  async function ask(q: string) {
    if (!q.trim()) return;
    setAsking(true);
    setAnswer(null);
    setNote(null);
    try {
      const res = await fetch("/api/cognee/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json();
      if (data.answer) {
        setAnswer(data.answer);
      } else {
        setNote(
          syncedAt
            ? "No grounded answer yet, the graph may still be building, or try rephrasing."
            : "Sync your knowledge first, then ask.",
        );
      }
    } catch {
      setAnswer(null);
      setNote("Something went wrong reaching the knowledge graph.");
    } finally {
      setAsking(false);
    }
  }

  return (
    <Card className="border-brand-200 bg-gradient-to-br from-brand-50/50 to-surface">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-white">
            <Brain className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-ink">Ask your books</h2>
              <span className="chip bg-brand-50 text-brand-700">Cognee memory</span>
            </div>
            <p className="mt-0.5 text-sm text-ink-muted">
              {configured
                ? syncedAt
                  ? `Knowledge graph synced ${new Date(syncedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}.`
                  : "Not synced yet, push your GST history into the knowledge graph."
                : "Not configured. Add COGNEE_API_BASE and COGNEE_API_KEY to enable."}
            </p>
          </div>
        </div>
        {configured && (
          <button onClick={sync} disabled={syncing} className="btn-ghost">
            {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {syncedAt ? "Re-sync" : "Sync knowledge"}
          </button>
        )}
      </div>

      {configured && (
        <>
          <form
            className="mt-4 flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              ask(question);
            }}
          >
            <input
              className="input"
              placeholder="Ask about suppliers, ITC, trends across months…"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
            <button type="submit" className="btn-primary shrink-0" disabled={asking || !question.trim()}>
              {asking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </form>

          <div className="mt-3 flex flex-wrap gap-2">
            {EXAMPLES.map((e) => (
              <button
                key={e}
                onClick={() => {
                  setQuestion(e);
                  ask(e);
                }}
                disabled={asking}
                className="rounded-full border border-surface-border bg-surface px-3 py-1.5 text-xs text-ink-soft transition hover:border-brand-300 hover:bg-brand-50"
              >
                {e}
              </button>
            ))}
          </div>

          {answer && (
            <div className="mt-4 rounded-xl border border-brand-200 bg-white p-4">
              <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-brand-600">
                <Sparkles className="h-3.5 w-3.5" /> Grounded in your knowledge graph
              </p>
              <p className="text-sm leading-relaxed text-ink">{answer}</p>
            </div>
          )}
          {note && <p className="mt-3 text-sm text-ink-muted">{note}</p>}
        </>
      )}
    </Card>
  );
}
