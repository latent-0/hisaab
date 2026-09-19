import { redirect } from "next/navigation";
import { getCurrentMerchant } from "@/lib/session";
import { prisma } from "@/lib/db";
import { Sidebar } from "@/components/Sidebar";
import { VoiceWidget } from "@/components/VoiceWidget";
import { sarvamConfigured } from "@/lib/sarvam";
import { elevenLabsConfigured } from "@/lib/elevenlabs";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const merchant = await getCurrentMerchant();
  if (!merchant) redirect("/login");

  const openReviews = await prisma.reviewTask.count({
    where: { merchantId: merchant.id, status: "open" },
  });

  const merchants = await prisma.merchant.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, businessName: true, gstin: true },
  });

  return (
    <div className="flex min-h-screen bg-surface-muted">
      <Sidebar
        merchant={{
          id: merchant.id,
          businessName: merchant.businessName,
          ownerName: merchant.ownerName,
          gstin: merchant.gstin,
          planTier: merchant.planTier,
        }}
        merchants={merchants}
        openReviews={openReviews}
      />
      <main className="flex-1 lg:pl-64">
        <div className="mx-auto max-w-6xl px-5 py-8 lg:px-8">{children}</div>
      </main>
      <VoiceWidget
        language={merchant.language}
        useSarvamStt={sarvamConfigured()}
        voiceProvider={elevenLabsConfigured() ? "elevenlabs" : sarvamConfigured() ? "sarvam" : "browser"}
      />
    </div>
  );
}
