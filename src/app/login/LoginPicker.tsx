"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Building2, Loader2 } from "lucide-react";

interface MerchantOption {
  id: string;
  businessName: string;
  ownerName: string;
  gstin: string;
  stateName: string;
  phone: string;
  planTier: string;
}

export function LoginPicker({ merchants }: { merchants: MerchantOption[] }) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function login(payload: { merchantId?: string; phone?: string }, key: string) {
    setError(null);
    setLoadingId(key);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Sign in failed");
      }
      router.push("/dashboard");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setLoadingId(null);
    }
  }

  return (
    <div className="space-y-3">
      {merchants.map((m) => (
        <button
          key={m.id}
          onClick={() => login({ merchantId: m.id }, m.id)}
          disabled={loadingId !== null}
          className="card flex w-full items-center gap-4 p-4 text-left transition hover:border-brand-300 hover:shadow-pop disabled:opacity-60"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <Building2 className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate font-semibold text-ink">{m.businessName}</p>
              {m.planTier === "pro" && (
                <span className="chip bg-brand-600 text-white">Pro</span>
              )}
            </div>
            <p className="truncate text-xs text-ink-muted">
              {m.ownerName} · {m.stateName} · {m.gstin}
            </p>
          </div>
          {loadingId === m.id ? (
            <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
          ) : (
            <span className="text-sm font-medium text-brand-600">Enter →</span>
          )}
        </button>
      ))}

      <div className="relative py-2 text-center">
        <span className="relative z-10 bg-surface-muted px-3 text-xs uppercase tracking-wide text-ink-muted">
          or by phone
        </span>
        <div className="absolute inset-x-0 top-1/2 h-px bg-surface-border" />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (phone.trim()) login({ phone: phone.trim() }, "phone");
        }}
        className="flex gap-2"
      >
        <input
          className="input"
          placeholder="Registered phone e.g. 9876543210"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          inputMode="numeric"
        />
        <button type="submit" className="btn-primary shrink-0" disabled={loadingId !== null || !phone.trim()}>
          {loadingId === "phone" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
        </button>
      </form>

      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
