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
  return NextResponse.redirect(new URL("/dashboard", req.url));
}
