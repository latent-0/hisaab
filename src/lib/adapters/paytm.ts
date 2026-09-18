// Paytm settlement adapter.
//
// This is the seam where Hisaab reads the SALES side of the ledger. In
// production this would call Paytm's Merchant Settlement / Transaction APIs
// (which require a merchant partnership). For the hackathon build it returns
// realistic, deterministic settlement data so the whole reconciliation and
// GSTR-3B flow works end to end. Swap `SandboxPaytmAdapter` for a real
// implementation of `PaytmAdapter` without touching the rest of the app.

import { SALES_CHANNELS, type GstRate, type SalesChannel } from "../constants";
import { round2 } from "../utils";

export interface PaytmSettlement {
  paytmTxnId: string;
  channel: SalesChannel;
  grossAmount: number; // amount incl. GST
  taxableValue: number;
  gstRate: GstRate;
  cgst: number;
  sgst: number;
  igst: number;
  hsnCode?: string;
  category?: string;
  settledAt: string; // ISO
}

export interface PaytmAdapter {
  /** Fetch settlements for a merchant within a period ("YYYY-MM"). */
  fetchSettlements(gstin: string, period: string): Promise<PaytmSettlement[]>;
}

// Deterministic pseudo-random generator so seeds/demos are reproducible.
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// A merchant's typical basket: which GST slabs their sales fall into.
const SALES_MIX: Array<{ rate: GstRate; hsn: string; weight: number }> = [
  { rate: 5, hsn: "2106", weight: 0.35 },
  { rate: 12, hsn: "1905", weight: 0.2 },
  { rate: 18, hsn: "8517", weight: 0.35 },
  { rate: 28, hsn: "2202", weight: 0.1 },
];

function pickRate(r: number): { rate: GstRate; hsn: string } {
  let acc = 0;
  for (const m of SALES_MIX) {
    acc += m.weight;
    if (r <= acc) return { rate: m.rate, hsn: m.hsn };
  }
  return { rate: 18, hsn: "8517" };
}

export class SandboxPaytmAdapter implements PaytmAdapter {
  async fetchSettlements(gstin: string, period: string): Promise<PaytmSettlement[]> {
    const [year, month] = period.split("-").map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const rnd = mulberry32(hashSeed(`${gstin}:${period}`));

    // ~3–6 settlements per day across QR/Soundbox/EDC.
    const out: PaytmSettlement[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const txns = 3 + Math.floor(rnd() * 4);
      for (let i = 0; i < txns; i++) {
        const channel = SALES_CHANNELS[Math.floor(rnd() * SALES_CHANNELS.length)];
        const { rate, hsn } = pickRate(rnd());
        // Ticket size varies by channel.
        const base = channel === "edc" ? 640 : channel === "soundbox" ? 200 : 400;
        const grossAmount = round2(base + rnd() * base * 4);
        const taxableValue = round2(grossAmount / (1 + rate / 100));
        const taxTotal = round2(grossAmount - taxableValue);
        // Intra-state: split CGST/SGST. (Sandbox merchants sell locally.)
        const cgst = round2(taxTotal / 2);
        const sgst = round2(taxTotal - cgst);
        const settledAt = new Date(
          year,
          month - 1,
          day,
          9 + Math.floor(rnd() * 12),
          Math.floor(rnd() * 60),
        ).toISOString();
        out.push({
          paytmTxnId: `PYTM${period.replace("-", "")}${String(day).padStart(2, "0")}${String(
            out.length,
          ).padStart(4, "0")}`,
          channel,
          grossAmount,
          taxableValue,
          gstRate: rate,
          cgst,
          sgst,
          igst: 0,
          hsnCode: hsn,
          category: "sales",
          settledAt,
        });
      }
    }
    return out;
  }
}

let _adapter: PaytmAdapter | null = null;
export function getPaytmAdapter(): PaytmAdapter {
  if (!_adapter) _adapter = new SandboxPaytmAdapter();
  return _adapter;
}
