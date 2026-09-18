"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A button that fires a fetch (with method/body), shows a spinner, then refreshes
 * server components. Optional confirm + toast-ish inline result.
 */
export function ActionButton({
  url,
  method = "POST",
  body,
  children,
  variant = "primary",
  className,
  confirm,
  onDone,
  disabled,
}: {
  url: string;
  method?: string;
  body?: unknown;
  children: ReactNode;
  variant?: "primary" | "ghost" | "subtle" | "danger";
  className?: string;
  confirm?: string;
  onDone?: () => void;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function run() {
    if (confirm && !window.confirm(confirm)) return;
    setLoading(true);
    try {
      const res = await fetch(url, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? "Something went wrong");
        return;
      }
      onDone?.();
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  const cls =
    variant === "primary"
      ? "btn-primary"
      : variant === "subtle"
        ? "btn-subtle"
        : variant === "danger"
          ? "btn bg-danger/10 text-danger hover:bg-danger/15"
          : "btn-ghost";

  return (
    <button onClick={run} disabled={loading || disabled} className={cn(cls, className)}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : children}
    </button>
  );
}
