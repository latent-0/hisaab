// OCR abstraction for invoice uploads. Provider is chosen via OCR_PROVIDER.
//
//  - "mock" (default): decodes text-based uploads directly (great for the
//    provided sample .txt invoices and for pasted text). Binary files return
//    empty text, in which case Intake produces a low-confidence result that is
//    routed to human review — an honest, working flow with no keys required.
//  - "gemini": uses Gemini's multimodal model to read images/PDFs. Requires
//    GEMINI_API_KEY.

const TEXT_MIME = /^(text\/|application\/json)/;

export interface OcrResult {
  text: string;
  provider: string;
}

function looksLikeText(buf: Buffer): boolean {
  // Heuristic: mostly printable ASCII/UTF-8 in the first chunk.
  const sample = buf.subarray(0, 2048);
  let printable = 0;
  for (const byte of sample) {
    if (byte === 9 || byte === 10 || byte === 13 || (byte >= 32 && byte <= 126)) printable++;
  }
  return sample.length > 0 && printable / sample.length > 0.85;
}

async function geminiOcr(buf: Buffer, mimeType: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY not set");
  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || "gemini-2.0-flash" });
  const res = await model.generateContent([
    {
      text: "Transcribe ALL text from this invoice exactly as it appears, preserving line breaks. Output plain text only.",
    },
    { inlineData: { mimeType, data: buf.toString("base64") } },
  ]);
  return res.response.text();
}

export async function extractInvoiceText(
  buf: Buffer,
  mimeType: string,
  fileName: string,
): Promise<OcrResult> {
  const provider = (process.env.OCR_PROVIDER || "mock").toLowerCase();

  if (provider === "gemini") {
    try {
      return { text: await geminiOcr(buf, mimeType), provider: "gemini" };
    } catch (err) {
      console.warn("[ocr.gemini] falling back to mock:", (err as Error).message);
    }
  }

  // Mock / fallback path.
  if (TEXT_MIME.test(mimeType) || looksLikeText(buf) || /\.(txt|csv|md|json)$/i.test(fileName)) {
    return { text: buf.toString("utf-8"), provider: "mock" };
  }
  return {
    text: "",
    provider: "mock",
    // Binary doc, no OCR key: Intake will flag for review / manual entry.
  };
}
