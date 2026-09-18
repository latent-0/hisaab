// GSTR-2B reconciliation adapter.
//
// GSTR-2B is the auto-drafted statement of Input Tax Credit generated from the
// filings of a merchant's SUPPLIERS. The Cross-Check agent compares each
// purchase invoice against 2B: if the supplier hasn't filed (or filed a
// different value), the buyer's ITC is at risk. In production this reads the
// GSTN GSTR-2B API. Here it deterministically simulates supplier behaviour so
// the mismatch-detection UX is exercised.

import type { Gstr2bStatus } from "../constants";
import { isValidGstinFormat } from "../utils";

export interface Gstr2bMatch {
  status: Gstr2bStatus;
  detail: string;
  filedValue?: number;
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export interface Gstr2bAdapter {
  lookup(input: {
    supplierGstin: string | null;
    invoiceNo: string | null;
    taxableValue: number | null;
  }): Promise<Gstr2bMatch>;
}

export class SandboxGstr2bAdapter implements Gstr2bAdapter {
  async lookup(input: {
    supplierGstin: string | null;
    invoiceNo: string | null;
    taxableValue: number | null;
  }): Promise<Gstr2bMatch> {
    if (!input.supplierGstin) {
      return { status: "missing", detail: "No supplier GSTIN on the invoice." };
    }
    if (!isValidGstinFormat(input.supplierGstin)) {
      return {
        status: "mismatch",
        detail: `Supplier GSTIN ${input.supplierGstin} is not a valid format.`,
      };
    }

    // Deterministic supplier behaviour: ~78% filed & matched, ~12% not yet
    // filed (missing in 2B), ~10% filed with a value mismatch.
    const bucket = hash(`${input.supplierGstin}:${input.invoiceNo ?? ""}`) % 100;
    if (bucket < 78) {
      return {
        status: "matched",
        detail: "Found in GSTR-2B with matching value. Fully eligible.",
        filedValue: input.taxableValue ?? undefined,
      };
    }
    if (bucket < 90) {
      return {
        status: "missing",
        detail: "Not yet reflected in GSTR-2B — supplier may not have filed GSTR-1.",
      };
    }
    const filed = input.taxableValue ? Math.round(input.taxableValue * 0.9) : undefined;
    return {
      status: "mismatch",
      detail:
        filed != null
          ? `Value in GSTR-2B (₹${filed}) differs from the invoice. Reconcile before claiming.`
          : "Value in GSTR-2B differs from the invoice.",
      filedValue: filed,
    };
  }
}

let _adapter: Gstr2bAdapter | null = null;
export function getGstr2bAdapter(): Gstr2bAdapter {
  if (!_adapter) _adapter = new SandboxGstr2bAdapter();
  return _adapter;
}
