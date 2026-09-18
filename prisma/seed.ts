/**
 * Seed Hisaab with realistic demo data:
 *  - two merchants,
 *  - Paytm settlement sync for the last 3 periods (sandbox adapter),
 *  - a spread of purchase invoices run through the full agent pipeline,
 *  - generated GSTR-3B drafts.
 *
 * Run with: npm run db:seed   (or npm run db:reset to wipe + reseed)
 */
import { prisma } from "../src/lib/db";
import { getPaytmAdapter } from "../src/lib/adapters/paytm";
import { processInvoice } from "../src/lib/agents/pipeline";
import { generateReturn } from "../src/lib/returns";
import { round2 } from "../src/lib/utils";

function period(offsetMonths: number): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - offsetMonths);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function invoiceText(o: {
  supplier: string;
  gstin?: string;
  invNo: string;
  date: string;
  hsn: string;
  desc: string;
  taxable: number;
  rate: number;
}): string {
  const cgst = round2((o.taxable * o.rate) / 200);
  const sgst = cgst;
  const total = round2(o.taxable + cgst + sgst);
  return [
    "TAX INVOICE",
    o.supplier,
    o.gstin ? `GSTIN: ${o.gstin}` : "GSTIN: (not printed)",
    `Invoice No: ${o.invNo}`,
    `Invoice Date: ${o.date}`,
    `HSN: ${o.hsn}`,
    `Description: ${o.desc}`,
    `Taxable Value: ${o.taxable}`,
    `CGST @ ${o.rate / 2}%: ${cgst}`,
    `SGST @ ${o.rate / 2}%: ${sgst}`,
    `Grand Total: ${total}`,
  ].join("\n");
}

async function syncSales(merchantId: string, gstin: string, per: string) {
  const adapter = getPaytmAdapter();
  const settlements = await adapter.fetchSettlements(gstin, per);
  for (const s of settlements) {
    await prisma.salesTransaction.upsert({
      where: { paytmTxnId: s.paytmTxnId },
      update: {},
      create: {
        merchantId,
        paytmTxnId: s.paytmTxnId,
        channel: s.channel,
        grossAmount: s.grossAmount,
        taxableValue: s.taxableValue,
        gstRate: s.gstRate,
        cgst: s.cgst,
        sgst: s.sgst,
        igst: s.igst,
        hsnCode: s.hsnCode,
        category: s.category,
        settledAt: new Date(s.settledAt),
        period: per,
      },
    });
  }
  return settlements.length;
}

async function main() {
  // Seed deterministically with the rule-based engine so demo numbers are stable
  // and reproducible, regardless of the configured live LLM provider. Real-time
  // uploads/voice still use whatever LLM_PROVIDER is set (e.g. groq).
  process.env.LLM_PROVIDER = "mock";
  process.env.OCR_PROVIDER = "mock";

  console.log("🌱 Seeding Hisaab (deterministic mock engine)...");

  // Wipe (respecting FK order).
  await prisma.reviewTask.deleteMany();
  await prisma.agentRun.deleteMany();
  await prisma.voiceQuery.deleteMany();
  await prisma.gstReturn.deleteMany();
  await prisma.purchaseInvoice.deleteMany();
  await prisma.salesTransaction.deleteMany();
  await prisma.merchant.deleteMany();

  const cur = period(0);
  const prev = period(1);
  const prev2 = period(2);

  // ---- Merchant 1: kirana / general store (primary demo) ----
  const sharma = await prisma.merchant.create({
    data: {
      businessName: "Sharma General Store",
      ownerName: "Rajesh Sharma",
      gstin: "27AABCS1234K1Z5",
      stateCode: "27",
      stateName: "Maharashtra",
      phone: "9876543210",
      email: "rajesh@sharmastore.in",
      language: "hi",
      planTier: "free",
    },
  });

  // ---- Merchant 2: tiffin service ----
  const anand = await prisma.merchant.create({
    data: {
      businessName: "Anand Tiffins",
      ownerName: "Anand Kumar",
      gstin: "29AAPFA9012M1Z3",
      stateCode: "29",
      stateName: "Karnataka",
      phone: "9812345678",
      email: "anand@anandtiffins.in",
      language: "en",
      planTier: "pro",
    },
  });

  for (const m of [sharma, anand]) {
    for (const per of [prev2, prev, cur]) {
      const n = await syncSales(m.id, m.gstin, per);
      console.log(`  📥 ${m.businessName} ${per}: ${n} settlements`);
    }
  }

  // ---- Purchase invoices for Sharma (current period) ----
  const d = (day: number) => `${cur}-${String(day).padStart(2, "0")}`;
  const invoices: Array<Parameters<typeof invoiceText>[0]> = [
    {
      supplier: "Metro Cash & Carry Pvt Ltd",
      gstin: "27AAACM4589P1Z8",
      invNo: "MCC/2026/4471",
      date: d(3),
      hsn: "2106",
      desc: "Grocery stock - staples and packaged goods",
      taxable: 48200,
      rate: 5,
    },
    {
      supplier: "Bharti Airtel Limited",
      gstin: "27AAACB2894G1ZR".slice(0, 15),
      invNo: "AIR-9928371",
      date: d(5),
      hsn: "8517",
      desc: "Business broadband and mobile plan",
      taxable: 2400,
      rate: 18,
    },
    {
      supplier: "Godrej Consumer Products",
      gstin: "27AAACG3579H1Z2",
      invNo: "GCP/SEP/8841",
      date: d(7),
      hsn: "3401",
      desc: "Home care and personal care stock",
      taxable: 31500,
      rate: 18,
    },
    {
      supplier: "Shree Packaging Works",
      gstin: "27AAEFS6712L1Z4",
      invNo: "SPW-2210",
      date: d(9),
      hsn: "4819",
      desc: "Carry bags and packaging cartons",
      taxable: 8600,
      rate: 12,
    },
    {
      supplier: "Blue Dart Express",
      gstin: "27AAACB0442K1Z9",
      invNo: "BD-556201",
      date: d(11),
      hsn: "9968",
      desc: "Courier and logistics charges",
      taxable: 3200,
      rate: 5,
    },
    // ITC-blocked: staff lunch / food & beverage
    {
      supplier: "Sagar Restaurant",
      gstin: "27AABFS7781M1Z6",
      invNo: "SR-1187",
      date: d(12),
      hsn: "9963",
      desc: "Staff lunch and refreshments",
      taxable: 4200,
      rate: 5,
    },
    // Missing GSTIN -> flagged
    {
      supplier: "Local Hardware Shop",
      invNo: "HS-88",
      date: d(14),
      hsn: "8302",
      desc: "Shelving, racks and store fittings",
      taxable: 22000,
      rate: 18,
    },
    {
      supplier: "Reliance Retail Ltd",
      gstin: "27AAACR5055K1Z1",
      invNo: "RR/2026/77120",
      date: d(15),
      hsn: "1905",
      desc: "Bakery and biscuit stock",
      taxable: 21800,
      rate: 12,
    },
    {
      supplier: "Tally Solutions Pvt Ltd",
      gstin: "29AAACT1234Q1Z5",
      invNo: "TS-INV-4402",
      date: d(16),
      hsn: "9973",
      desc: "Accounting software annual subscription",
      taxable: 7200,
      rate: 18,
    },
    {
      supplier: "Vijay Wholesale Traders",
      gstin: "27AAFFV3321R1Z2",
      invNo: "VWT-9901",
      date: d(17),
      hsn: "2106",
      desc: "Edible oil and pulses in bulk",
      taxable: 63400,
      rate: 5,
    },
  ];

  console.log(`  🧾 Creating & processing ${invoices.length} invoices for ${sharma.businessName}...`);
  for (const inv of invoices) {
    const created = await prisma.purchaseInvoice.create({
      data: {
        merchantId: sharma.id,
        source: "sandbox",
        fileName: `${inv.invNo}.txt`,
        ocrText: invoiceText(inv),
        status: "received",
      },
    });
    const res = await processInvoice(created.id);
    console.log(`     - ${inv.supplier}: ${res.status} (conf ${res.confidence.toFixed(2)})`);
  }

  // A couple of invoices for Anand (current period) for a second live account.
  const anandInvoices: Array<Parameters<typeof invoiceText>[0]> = [
    {
      supplier: "Fresh Farms Produce",
      gstin: "29AABFF2210L1Z8",
      invNo: "FF-3321",
      date: d(4),
      hsn: "0713",
      desc: "Vegetables and pulses",
      taxable: 18900,
      rate: 5,
    },
    {
      supplier: "Anand Gas Agency",
      gstin: "29AAACA9087P1Z4",
      invNo: "AGA-771",
      date: d(6),
      hsn: "2711",
      desc: "Commercial LPG cylinders",
      taxable: 9400,
      rate: 5,
    },
  ];
  for (const inv of anandInvoices) {
    const created = await prisma.purchaseInvoice.create({
      data: {
        merchantId: anand.id,
        source: "sandbox",
        fileName: `${inv.invNo}.txt`,
        ocrText: invoiceText(inv),
        status: "received",
      },
    });
    await processInvoice(created.id);
  }

  // ---- Khata: receivables (udhaar) & payables for Sharma ----
  const dayOffset = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return d;
  };
  await prisma.ledgerEntry.createMany({
    data: [
      { merchantId: sharma.id, party: "Ramesh Yadav", phone: "9811100011", kind: "receivable", amount: 3200, note: "Monthly grocery on credit", dueDate: dayOffset(-6), status: "open" },
      { merchantId: sharma.id, party: "Sunita Devi", phone: "9811100022", kind: "receivable", amount: 1450, note: "Household supplies", dueDate: dayOffset(-2), status: "open" },
      { merchantId: sharma.id, party: "Anwar Bhai (tea stall)", phone: "9811100033", kind: "receivable", amount: 5600, note: "Bulk sugar & milk", dueDate: dayOffset(4), status: "open" },
      { merchantId: sharma.id, party: "Priya Sharma", phone: "9811100044", kind: "receivable", amount: 900, note: "Snacks", dueDate: dayOffset(9), status: "open" },
      { merchantId: sharma.id, party: "Karan General Store", phone: "9811100055", kind: "receivable", amount: 2750, note: "Wholesale resale", dueDate: dayOffset(-14), status: "open" },
      { merchantId: sharma.id, party: "Metro Cash & Carry", phone: "9899000011", kind: "payable", amount: 18200, note: "Stock invoice due", dueDate: dayOffset(3), status: "open" },
      { merchantId: sharma.id, party: "Shree Packaging Works", phone: "9899000022", kind: "payable", amount: 4300, note: "Packaging order", dueDate: dayOffset(11), status: "open" },
    ],
  });

  // ---- Generate GSTR-3B drafts ----
  for (const m of [sharma, anand]) {
    for (const per of [prev, cur]) {
      await generateReturn(m.id, per);
    }
  }

  const stats = await prisma.purchaseInvoice.groupBy({
    by: ["status"],
    where: { merchantId: sharma.id },
    _count: true,
  });
  console.log("  ✅ Invoice status breakdown:", stats.map((s) => `${s.status}=${s._count}`).join(", "));
  console.log(`\n✨ Done. Log in as ${sharma.phone} (Sharma General Store) or ${anand.phone} (Anand Tiffins).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
