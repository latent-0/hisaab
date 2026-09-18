import { EXPENSE_CATEGORIES, GST_RATES, type GstRate } from "../constants";
import type { ClassifyResult, IntakeResult } from "../types";
import { clamp01, inr, round2 } from "../utils";
import type { AiEngine, AnswerInput, AnswerResult, ClassifyInput, IntakeInput } from "./types";

const GSTIN_RE = /\b[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]\b/;

function firstMatch(text: string, res: RegExp[]): string | null {
  for (const re of res) {
    const m = text.match(re);
    if (m) return (m[1] ?? m[0]).trim();
  }
  return null;
}

function toNumber(raw: string | null): number | null {
  if (!raw) return null;
  const n = Number(raw.replace(/[₹,\s]/g, ""));
  return Number.isFinite(n) ? n : null;
}

/**
 * Find the line containing `keyword` and return the LAST number on it. Invoice
 * lines like "CGST @ 9%: 1125" put the rate before the amount, so the last
 * number is the amount we want.
 */
function amountOnLine(text: string, keyword: RegExp): number | null {
  const line = text.split(/\r?\n/).find((l) => keyword.test(l));
  if (!line) return null;
  const nums = line.match(/[₹]?\s*[\d,]+(?:\.\d+)?/g);
  if (!nums || nums.length === 0) return null;
  // Drop a trailing "%" rate token if it slipped through, then take the last.
  const cleaned = nums.map((n) => n.replace(/[₹,\s]/g, ""));
  return toNumber(cleaned[cleaned.length - 1]);
}

/** Snap an arbitrary rate to the nearest legal GST slab. */
function snapRate(rate: number | null): GstRate | null {
  if (rate == null || !Number.isFinite(rate)) return null;
  let best: GstRate = GST_RATES[0];
  let bestDiff = Infinity;
  for (const r of GST_RATES) {
    const d = Math.abs(r - rate);
    if (d < bestDiff) {
      bestDiff = d;
      best = r;
    }
  }
  return best;
}

/**
 * Deterministic, no-API-key engine. Parses invoice text with regexes and
 * classifies via keyword rules. Doubles as the fallback for real providers.
 */
export const mockEngine: AiEngine = {
  name: "mock",

  async intake(input: IntakeInput): Promise<IntakeResult> {
    const text = input.ocrText || "";
    const h = input.hints ?? {};

    const supplierGstin = h.supplierGstin ?? firstMatch(text, [GSTIN_RE]);

    // Supplier name: an explicit label, else the first meaningful line.
    let supplierName =
      h.supplierName ??
      firstMatch(text, [
        /(?:supplier|seller|from|billed by|vendor)\s*[:\-]\s*(.+)/i,
      ]);
    if (!supplierName) {
      const firstLine = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .find((l) => l.length > 2 && !/^(tax invoice|invoice|gstin)/i.test(l));
      supplierName = firstLine ?? null;
    }

    const invoiceNo =
      h.invoiceNo ??
      firstMatch(text, [
        /(?:invoice|bill|inv)\s*(?:no|number|#)?\s*[:\-#]\s*([A-Za-z0-9/\-]+)/i,
      ]);

    const dateRaw = firstMatch(text, [
      /(?:invoice date|date|dated)\s*[:\-]?\s*(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/i,
      /\b(\d{4}-\d{2}-\d{2})\b/,
    ]);
    const invoiceDate = h.invoiceDate ?? parseDate(dateRaw);

    // Note: 0 hints are treated as "absent" (|| in the pipeline), so we parse
    // from text unless a real value was supplied.
    const cgst = h.cgst ?? amountOnLine(text, /cgst/i) ?? 0;
    const sgst = h.sgst ?? amountOnLine(text, /sgst/i) ?? 0;
    const igst = h.igst ?? amountOnLine(text, /igst/i) ?? 0;

    const taxableValue =
      h.taxableValue ??
      toNumber(
        firstMatch(text, [
          /(?:taxable value|taxable amount|sub ?total|amount before tax)[^0-9₹]*([₹0-9,.]+)/i,
        ]),
      );

    const total =
      h.total ??
      toNumber(
        firstMatch(text, [
          /(?:grand total|total amount|invoice total|net payable|total)[^0-9₹]*([₹0-9,.]+)/i,
        ]),
      );

    const hsnCode = h.hsnCode ?? firstMatch(text, [/hsn(?:\/sac)?\s*(?:code)?\s*[:\-]?\s*(\d{4,8})/i]);

    // Derive rate from tax vs taxable when possible.
    let gstRate: GstRate | null = h.gstRate ?? null;
    const taxTotal = round2(cgst + sgst + igst);
    if (gstRate == null && taxableValue && taxableValue > 0 && taxTotal > 0) {
      gstRate = snapRate((taxTotal / taxableValue) * 100);
    }
    if (gstRate == null) {
      const rateStr = firstMatch(text, [/@?\s*(\d{1,2})\s*%/]);
      gstRate = snapRate(rateStr ? Number(rateStr) : null);
    }

    // Confidence: reward how many key fields we recovered.
    const found = [supplierGstin, invoiceNo, taxableValue, total, gstRate].filter(
      (x) => x != null && x !== "",
    ).length;
    const confidence = clamp01(0.45 + found * 0.11);

    return {
      supplierName: supplierName || null,
      supplierGstin: supplierGstin ? supplierGstin.toUpperCase() : null,
      invoiceNo: invoiceNo || null,
      invoiceDate: invoiceDate ?? null,
      taxableValue: taxableValue ?? null,
      cgst: round2(cgst),
      sgst: round2(sgst),
      igst: round2(igst),
      total: total ?? null,
      hsnCode: hsnCode || null,
      gstRate,
      confidence,
      notes: found >= 4 ? "Parsed cleanly from document." : "Some fields could not be read confidently.",
    };
  },

  async classify(input: ClassifyInput): Promise<ClassifyResult> {
    const hay = `${input.supplierName ?? ""} ${input.invoiceText}`.toLowerCase();
    const rules: Array<[string, RegExp]> = [
      ["food_beverage", /\b(restaurant|cafe|caterer|food|beverage|swiggy|zomato|hotel|canteen|snacks|tea|coffee)\b/],
      ["motor_vehicle", /\b(car|motor|vehicle|automobile|scooter|bike showroom|maruti|honda cars)\b/],
      ["capital_goods", /\b(machine|machinery|equipment|plant|fixed asset|furniture|computer|laptop|printer)\b/],
      ["rent", /\b(rent|lease|licence fee|premises)\b/],
      ["telecom", /\b(airtel|jio|vodafone|bsnl|broadband|internet|telecom|mobile bill)\b/],
      ["utilities", /\b(electricity|power|water bill|gas bill|utility)\b/],
      ["transport_freight", /\b(transport|freight|logistics|courier|cargo|delhivery|blue dart|shipping)\b/],
      ["software_saas", /\b(software|saas|subscription|license|cloud|hosting|aws|google cloud|microsoft)\b/],
      ["advertising", /\b(advertis|marketing|google ads|meta ads|promotion|hoarding)\b/],
      ["professional_services", /\b(consultant|legal|audit|chartered accountant|ca fees|professional|advisory)\b/],
      ["packaging", /\b(packaging|carton|box|wrapping|label)\b/],
      ["raw_materials", /\b(raw material|stock|goods|wholesale|trading|supplier|distributor|mart|store|traders)\b/],
    ];

    let category = "raw_materials";
    let matched = false;
    for (const [cat, re] of rules) {
      if (re.test(hay)) {
        category = cat;
        matched = true;
        break;
      }
    }

    const meta = EXPENSE_CATEGORIES[category];
    const confidence = clamp01(matched ? 0.86 : 0.62);
    return {
      category,
      itcEligible: meta.defaultItc,
      itcBlockReason: meta.defaultItc ? null : meta.blockReason ?? null,
      confidence,
      reasoning: matched
        ? `Matched keywords to "${meta.label}".`
        : `No strong signal; defaulted to "${meta.label}" (most common for merchants).`,
    };
  },

  async answer(input: AnswerInput): Promise<AnswerResult> {
    const q = input.question.toLowerCase();
    const f = input.facts as Record<string, number>;
    const isHindi = input.language === "hi";

    const money = (n: number | undefined) => inr(n ?? 0);

    let intent = "summary";
    let answerText: string;

    if (/(save|saved|बच|itc|input tax|credit|क्रेडिट)/i.test(q)) {
      intent = "itc_savings";
      answerText = isHindi
        ? `इस महीने आपने ${money(f.itcThisMonth)} का इनपुट टैक्स क्रेडिट क्लेम किया है। ${money(
            f.unclaimedItc,
          )} अभी भी अनक्लेम्ड है — फाइल करने से पहले ${f.flaggedCount ?? 0} इनवॉइस की समीक्षा करें।`
        : `You've claimed ${money(f.itcThisMonth)} in input tax credit this month, and ${money(
            f.unclaimedItc,
          )} is still unclaimed. Review ${f.flaggedCount ?? 0} flagged invoice(s) before filing to catch it.`;
    } else if (/(pay|payable|liability|देना|देय)/i.test(q)) {
      intent = "net_payable";
      answerText = isHindi
        ? `इस महीने आपकी नेट GST देनदारी ${money(f.netPayable)} है (आउटपुट टैक्स ${money(
            f.outputTax,
          )} माइनस ITC ${money(f.itcThisMonth)})।`
        : `Your net GST payable this month is ${money(f.netPayable)} (output tax ${money(
            f.outputTax,
          )} minus ITC ${money(f.itcThisMonth)}).`;
    } else if (/(sale|sales|revenue|बिक्री|टर्नओवर)/i.test(q)) {
      intent = "sales";
      answerText = isHindi
        ? `इस महीने ${f.salesCount ?? 0} सेटलमेंट्स में कुल बिक्री ${money(f.salesTotal)} रही।`
        : `Sales this month total ${money(f.salesTotal)} across ${f.salesCount ?? 0} settlements.`;
    } else if (/(flag|review|mismatch|समीक्षा|गड़बड़)/i.test(q)) {
      intent = "review";
      answerText = isHindi
        ? `${f.flaggedCount ?? 0} इनवॉइस समीक्षा के लिए फ्लैग की गई हैं। इन्हें ठीक करने से ${money(
            f.unclaimedItc,
          )} ITC बच सकता है।`
        : `${f.flaggedCount ?? 0} invoice(s) are flagged for review. Resolving them can recover ${money(
            f.unclaimedItc,
          )} of ITC.`;
    } else if (/(deadline|due|कब|तारीख|file)/i.test(q)) {
      intent = "deadline";
      answerText = isHindi
        ? `आपका GSTR-3B अगले महीने की 20 तारीख तक फाइल करना है। ड्राफ्ट तैयार है — बस समीक्षा करें।`
        : `Your GSTR-3B is due by the 20th of next month. The draft is ready — just review and file.`;
    } else {
      answerText = isHindi
        ? `इस महीने: बिक्री ${money(f.salesTotal)}, ITC ${money(f.itcThisMonth)}, नेट देय ${money(
            f.netPayable,
          )}। ${f.flaggedCount ?? 0} इनवॉइस समीक्षा के लिए बाकी हैं।`
        : `This month: sales ${money(f.salesTotal)}, ITC ${money(f.itcThisMonth)}, net payable ${money(
            f.netPayable,
          )}. ${f.flaggedCount ?? 0} invoice(s) await review.`;
    }

    return { intent, answerText };
  },
};

function parseDate(raw: string | null): string | null {
  if (!raw) return null;
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const parts = raw.split(/[\/\-.]/).map((p) => p.trim());
  if (parts.length === 3) {
    let [d, m, y] = parts;
    if (y.length === 2) y = `20${y}`;
    const dd = d.padStart(2, "0");
    const mm = m.padStart(2, "0");
    if (Number(mm) >= 1 && Number(mm) <= 12 && Number(dd) >= 1 && Number(dd) <= 31) {
      return `${y}-${mm}-${dd}`;
    }
  }
  return null;
}
