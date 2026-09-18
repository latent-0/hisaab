"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { SUPPORTED_LANGUAGES } from "@/lib/constants";

export function SettingsForm({
  merchant,
}: {
  merchant: { businessName: string; ownerName: string; email: string | null; language: string };
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    businessName: merchant.businessName,
    ownerName: merchant.ownerName,
    email: merchant.email ?? "",
    language: merchant.language,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/merchant", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setSaved(true);
        router.refresh();
        setTimeout(() => setSaved(false), 2000);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Business name</label>
          <input className="input" value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} />
        </div>
        <div>
          <label className="label">Owner name</label>
          <input className="input" value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} />
        </div>
        <div>
          <label className="label">Email</label>
          <input className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div>
          <label className="label">Voice & interface language</label>
          <select className="input" value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })}>
            {Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button onClick={save} className="btn-primary" disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
        </button>
        {saved && (
          <span className="inline-flex items-center gap-1 text-sm text-success">
            <Check className="h-4 w-4" /> Saved
          </span>
        )}
      </div>
    </div>
  );
}
