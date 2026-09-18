// Central catalog of "enum-like" string values (kept in app code for cross-DB
// portability) plus GST domain constants.

export const GST_RATES = [0, 5, 12, 18, 28] as const;
export type GstRate = (typeof GST_RATES)[number];

export const SALES_CHANNELS = ["qr", "soundbox", "edc"] as const;
export type SalesChannel = (typeof SALES_CHANNELS)[number];

export const INVOICE_STATUS = [
  "received",
  "processing",
  "needs_review",
  "approved",
  "rejected",
] as const;
export type InvoiceStatus = (typeof INVOICE_STATUS)[number];

export const GSTR2B_STATUS = ["matched", "mismatch", "missing", "unknown"] as const;
export type Gstr2bStatus = (typeof GSTR2B_STATUS)[number];

export const REVIEW_KINDS = [
  "low_confidence",
  "gstr2b_mismatch",
  "itc_blocked",
  "missing_gstin",
  "duplicate",
] as const;
export type ReviewKind = (typeof REVIEW_KINDS)[number];

export const RETURN_STATUS = ["draft", "reviewed", "filed"] as const;
export type ReturnStatus = (typeof RETURN_STATUS)[number];

// Expense categories used by the Classify agent. `itcEligible=false` categories
// map to common Section 17(5) blocked-credit cases.
export const EXPENSE_CATEGORIES: Record<
  string,
  { label: string; defaultItc: boolean; blockReason?: string; typicalRate: GstRate }
> = {
  raw_materials: { label: "Raw materials / stock", defaultItc: true, typicalRate: 18 },
  packaging: { label: "Packaging", defaultItc: true, typicalRate: 18 },
  capital_goods: { label: "Capital goods / equipment", defaultItc: true, typicalRate: 18 },
  rent: { label: "Commercial rent", defaultItc: true, typicalRate: 18 },
  telecom: { label: "Telecom / internet", defaultItc: true, typicalRate: 18 },
  utilities: { label: "Utilities", defaultItc: true, typicalRate: 18 },
  professional_services: { label: "Professional services", defaultItc: true, typicalRate: 18 },
  transport_freight: { label: "Transport / freight", defaultItc: true, typicalRate: 5 },
  software_saas: { label: "Software / SaaS", defaultItc: true, typicalRate: 18 },
  advertising: { label: "Advertising / marketing", defaultItc: true, typicalRate: 18 },
  // Blocked credits (Sec 17(5)):
  food_beverage: {
    label: "Food & beverage",
    defaultItc: false,
    blockReason: "Sec 17(5)(b): food and beverages are blocked credits",
    typicalRate: 5,
  },
  motor_vehicle: {
    label: "Motor vehicle (≤13 seats)",
    defaultItc: false,
    blockReason: "Sec 17(5)(a): motor vehicles for personal use are blocked",
    typicalRate: 28,
  },
  personal_use: {
    label: "Personal / non-business",
    defaultItc: false,
    blockReason: "Sec 17(5)(g): goods/services for personal consumption are blocked",
    typicalRate: 18,
  },
} as const;

export type ExpenseCategoryKey = keyof typeof EXPENSE_CATEGORIES;

// Confidence below this routes an invoice to the human review queue.
export const REVIEW_CONFIDENCE_THRESHOLD = 0.8;

export const SUPPORTED_LANGUAGES: Record<string, string> = {
  en: "English",
  hi: "हिन्दी",
  ta: "தமிழ்",
  te: "తెలుగు",
  kn: "ಕನ್ನಡ",
  mr: "मराठी",
  bn: "বাংলা",
  gu: "ગુજરાતી",
};

// GST state codes (subset commonly needed for demos).
export const GST_STATES: Record<string, string> = {
  "07": "Delhi",
  "09": "Uttar Pradesh",
  "19": "West Bengal",
  "24": "Gujarat",
  "27": "Maharashtra",
  "29": "Karnataka",
  "33": "Tamil Nadu",
  "36": "Telangana",
};
