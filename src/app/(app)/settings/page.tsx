import { Bot, Brain, Cloud, Crown, Database, Mic, ScanLine } from "lucide-react";
import { getCurrentMerchant } from "@/lib/session";
import { ActionButton } from "@/components/ActionButton";
import { Badge, Card } from "@/components/ui";
import { SettingsForm } from "./SettingsForm";

export default async function SettingsPage() {
  const merchant = (await getCurrentMerchant())!;

  const llmProvider = process.env.LLM_PROVIDER || "mock";
  const llmModel =
    llmProvider === "groq"
      ? process.env.GROQ_MODEL
      : llmProvider === "gemini"
        ? process.env.GEMINI_MODEL
        : llmProvider === "anthropic"
          ? process.env.ANTHROPIC_MODEL
          : null;

  const integrations = [
    {
      icon: Bot,
      name: "LLM provider (agents)",
      value: llmProvider,
      detail: llmModel ? `Model: ${llmModel}` : "Deterministic rule-based engine, no API key needed.",
    },
    {
      icon: Brain,
      name: "Knowledge memory",
      value: process.env.COGNEE_API_KEY ? "cognee" : "off",
      detail: process.env.COGNEE_API_KEY
        ? "Cognee knowledge graph, ask your books on Analytics."
        : "Set COGNEE_API_KEY to enable graph memory.",
    },
    {
      icon: Mic,
      name: "Voice (Indic ASR/TTS)",
      value: process.env.VOICE_PROVIDER || "mock",
      detail:
        (process.env.VOICE_PROVIDER || "mock") === "sarvam"
          ? "Sarvam AI for Indic speech."
          : "Browser speech + on-device fallback.",
    },
    {
      icon: ScanLine,
      name: "Invoice OCR",
      value: process.env.OCR_PROVIDER || "mock",
      detail:
        (process.env.OCR_PROVIDER || "mock") === "gemini"
          ? "Gemini multimodal reads PDFs/images."
          : "Reads text uploads; binary docs route to review.",
    },
    {
      icon: Database,
      name: "Paytm settlements",
      value: "sandbox",
      detail: "Deterministic sandbox adapter (swap in Paytm API).",
    },
    {
      icon: Cloud,
      name: "GSTR-2B source",
      value: "sandbox",
      detail: "Simulated supplier filings (swap in GSTN API).",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[1.9rem] font-light tracking-tight text-ink">Settings</h1>
        <p className="mt-1 text-sm text-ink-muted">Manage your business profile and integrations.</p>
      </div>

      <Card>
        <h2 className="mb-4 text-sm font-semibold text-ink">Business profile</h2>
        <div className="mb-4 flex flex-wrap gap-x-8 gap-y-2 rounded-xl bg-surface-muted px-4 py-3 text-sm">
          <div><span className="text-ink-muted">GSTIN:</span> <span className="font-medium text-ink">{merchant.gstin}</span></div>
          <div><span className="text-ink-muted">State:</span> <span className="font-medium text-ink">{merchant.stateName}</span></div>
          <div><span className="text-ink-muted">Phone:</span> <span className="font-medium text-ink">{merchant.phone}</span></div>
        </div>
        <SettingsForm
          merchant={{
            businessName: merchant.businessName,
            ownerName: merchant.ownerName,
            email: merchant.email,
            language: merchant.language,
          }}
        />
      </Card>

      {/* Plan */}
      <Card className="border-brand-200 bg-gradient-to-br from-brand-50/60 to-surface">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-white">
              <Crown className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-ink">
                  {merchant.planTier === "pro" ? "Hisaab Pro" : "Hisaab Free"}
                </h2>
                <Badge tone={merchant.planTier === "pro" ? "blue" : "gray"}>{merchant.planTier}</Badge>
              </div>
              <p className="mt-1 max-w-md text-sm text-ink-muted">
                {merchant.planTier === "pro"
                  ? "CA-reviewed filing, priority support, and multi-GSTIN, on top of the free copilot."
                  : "The copilot is free forever. Upgrade to Pro for CA-reviewed filing and priority support."}
              </p>
            </div>
          </div>
          {merchant.planTier !== "pro" ? (
            <ActionButton url="/api/merchant" method="PATCH" body={{ planTier: "pro" }} variant="primary">
              <Crown className="h-4 w-4" /> Upgrade to Pro
            </ActionButton>
          ) : (
            <ActionButton url="/api/merchant" method="PATCH" body={{ planTier: "free" }} variant="ghost">
              Switch to Free
            </ActionButton>
          )}
        </div>
      </Card>

      {/* Integrations */}
      <Card>
        <h2 className="mb-4 text-sm font-semibold text-ink">Integrations & data sources</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {integrations.map((it) => {
            const Icon = it.icon;
            return (
              <div key={it.name} className="flex items-start gap-3 rounded-xl border border-surface-border p-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-muted text-ink-soft">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-ink">{it.name}</p>
                    <Badge tone={["mock", "sandbox", "off"].includes(it.value) ? "gray" : "green"}>{it.value}</Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-ink-muted">{it.detail}</p>
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-4 text-xs text-ink-muted">
          Configure providers via environment variables (see <code className="rounded bg-surface-muted px-1">.env.example</code>).
          Everything runs with zero keys using the mock/sandbox defaults.
        </p>
      </Card>
    </div>
  );
}
