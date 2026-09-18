import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Cloud Run health check: verifies the process and DB connectivity. */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", db: "up", time: new Date().toISOString() });
  } catch (err) {
    return NextResponse.json(
      { status: "degraded", db: "down", error: (err as Error).message },
      { status: 503 },
    );
  }
}
