import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { setSession } from "@/lib/session";

/**
 * Seamless hand-off from the Paytm-style shell (/v2) into the live Hisaab app.
 * For the demo we sign the viewer in as the primary merchant so the integration
 * feels like tapping a feature inside Paytm — no separate login screen.
 */
export async function GET(req: Request) {
  const merchant = await prisma.merchant.findFirst({ orderBy: { createdAt: "asc" } });
  if (merchant) await setSession(merchant.id);

  // Behind Render's proxy, req.url reflects the container's internal
  // address (e.g. http://localhost:10000), not the public domain. Build the
  // redirect from the forwarded proxy headers instead, so the merchant lands
  // back on hisaab-s8f4.onrender.com/dashboard rather than localhost.
  const url = new URL(req.url);
  const proto = req.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? url.host;
  return NextResponse.redirect(`${proto}://${host}/dashboard`);
}
