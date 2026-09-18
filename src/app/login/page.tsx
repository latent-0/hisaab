import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCurrentMerchant } from "@/lib/session";
import { LoginPicker } from "./LoginPicker";

export default async function LoginPage() {
  if (await getCurrentMerchant()) redirect("/dashboard");

  const merchants = await prisma.merchant.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, businessName: true, ownerName: true, gstin: true, stateName: true, phone: true, planTier: true },
  });

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left: brand panel */}
      <div className="relative hidden overflow-hidden bg-ink p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -bottom-32 -left-20 h-[420px] w-[420px] rounded-full bg-brand-500/30 blur-[120px]" />
        <Link href="/" className="relative flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 font-bold">ह</div>
          <span className="text-lg font-semibold">Hisaab</span>
        </Link>
        <div className="relative">
          <h1 className="max-w-md text-4xl font-bold leading-tight tracking-tight">
            Your GST, sorted automatically.
          </h1>
          <p className="mt-4 max-w-md text-white/60">
            Sign in to see reconciled sales, unclaimed input tax credit, and a GSTR-3B draft that&apos;s
            ready to review.
          </p>
        </div>
        <p className="relative text-sm text-white/40">Merchant Growth AI · Built for India</p>
      </div>

      {/* Right: login */}
      <div className="flex items-center justify-center bg-surface-muted p-6">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 font-bold text-white">ह</div>
              <span className="text-lg font-semibold">Hisaab</span>
            </Link>
          </div>
          <h2 className="text-[1.9rem] font-light tracking-tight text-ink">Sign in</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Choose a demo merchant, or enter a registered phone number.
          </p>
          <div className="mt-6">
            <LoginPicker merchants={merchants} />
          </div>
          <p className="mt-6 text-center text-xs text-ink-muted">
            This is a hackathon build. Paytm sales are provided by a sandbox adapter.{" "}
            <Link href="/" className="inline-flex items-center gap-1 font-medium text-brand-600">
              Back to home <ArrowRight className="h-3 w-3" />
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
