import crypto from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

// File storage for uploaded invoices. Local disk by default (public/uploads),
// with a seam for Google Cloud Storage in production (FILE_STORE=gcs).
// The GCS branch is intentionally lazy so the dependency is optional.

export interface StoredFile {
  url: string; // public URL / path used by the app
  key: string; // storage key
}

export async function storeInvoiceFile(
  buf: Buffer,
  fileName: string,
  mimeType: string,
): Promise<StoredFile> {
  const store = (process.env.FILE_STORE || "local").toLowerCase();
  const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}-${safe}`;

  if (store === "gcs" && process.env.GCS_BUCKET) {
    try {
      // Optional dependency; only used when explicitly configured.
      const { Storage } = await import("@google-cloud/storage" as string);
      const storage = new Storage();
      const bucket = storage.bucket(process.env.GCS_BUCKET);
      const file = bucket.file(`invoices/${key}`);
      await file.save(buf, { contentType: mimeType });
      return { url: `https://storage.googleapis.com/${process.env.GCS_BUCKET}/invoices/${key}`, key };
    } catch (err) {
      console.warn("[storage.gcs] falling back to local disk:", (err as Error).message);
    }
  }

  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, key), buf);
  return { url: `/uploads/${key}`, key };
}
