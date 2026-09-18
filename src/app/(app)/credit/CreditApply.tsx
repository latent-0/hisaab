"use client";

import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";

export function CreditApply({ amount }: { amount: number }) {
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");

  if (state === "done") {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-white/15 px-4 py-3 text-sm font-medium text-white">
        <CheckCircle2 className="h-5 w-5" />
        Application received — Paytm will disburse to your linked account.
      </div>
    );
  }

  return (
    <button
      onClick={() => {
        setState("loading");
        setTimeout(() => setState("done"), 900);
      }}
      disabled={state === "loading"}
      className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-brand-700 transition hover:bg-white/90 disabled:opacity-70"
    >
      {state === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Accept ₹{amount.toLocaleString("en-IN")} offer</>}
    </button>
  );
}
