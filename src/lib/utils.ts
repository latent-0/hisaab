import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a number as Indian Rupees with the Indian digit grouping (lakh/crore). */
export function inr(amount: number, opts: { paise?: boolean } = {}): string {
  const value = Number.isFinite(amount) ? amount : 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: opts.paise ? 2 : 0,
    maximumFractionDigits: opts.paise ? 2 : 0,
  }).format(value);
}

/** Format a plain number in the Indian numbering system. */
export function inNum(value: number): string {
  return new Intl.NumberFormat("en-IN").format(value);
}

/** Current filing period as "YYYY-MM". */
export function currentPeriod(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** The last `n` filing periods, oldest first, ending with the current month. */
export function recentPeriods(n: number, from = new Date()): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(from.getFullYear(), from.getMonth() - i, 1);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

/** Human label for a "YYYY-MM" period, e.g. "August 2026". */
export function periodLabel(period: string): string {
  const [y, m] = period.split("-").map(Number);
  if (!y || !m) return period;
  return new Date(y, m - 1, 1).toLocaleString("en-IN", { month: "long", year: "numeric" });
}

/** GSTR-3B is due on the 20th of the following month. */
export function returnDueDate(period: string): Date {
  const [y, m] = period.split("-").map(Number);
  // month index m is 1-based; next month => m (0-based next), so day 20 of next month
  return new Date(y, m, 20);
}

export function daysUntil(date: Date): number {
  const ms = date.getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

/** Round to 2 decimals to avoid floating point noise in currency math. */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Validate an Indian GSTIN. Format: 2-digit state + 10-char PAN + entity digit
 * + 'Z' + checksum. We validate structure (not the full checksum) which is
 * sufficient for surfacing obviously-broken GSTINs during cross-check.
 */
export function isValidGstinFormat(gstin: string | null | undefined): boolean {
  if (!gstin) return false;
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstin.trim().toUpperCase());
}

export function stateCodeFromGstin(gstin: string | null | undefined): string | null {
  if (!gstin || gstin.length < 2) return null;
  return gstin.slice(0, 2);
}

export function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

/** Safe JSON parse that returns a fallback instead of throwing. */
export function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
