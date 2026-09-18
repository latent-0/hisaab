import { ArrowRight, Calculator, FileText, GitCompareArrows, ScanLine, Tags } from "lucide-react";
import { cn } from "@/lib/utils";

const STAGES = [
  { key: "intake", label: "Intake", icon: ScanLine, desc: "Reads the invoice" },
  { key: "classify", label: "Classify", icon: Tags, desc: "Category & ITC" },
  { key: "crosscheck", label: "Cross-Check", icon: GitCompareArrows, desc: "Matches GSTR-2B" },
  { key: "calculate", label: "Calculate", icon: Calculator, desc: "Nets liability" },
  { key: "generate", label: "Generate", icon: FileText, desc: "Drafts GSTR-3B" },
] as const;

export function PipelineDiagram({
  active,
  compact = false,
}: {
  active?: Record<string, "ok" | "review" | "error" | undefined>;
  compact?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-stretch gap-2">
      {STAGES.map((s, i) => {
        const Icon = s.icon;
        const state = active?.[s.key];
        const tone =
          state === "review"
            ? "border-warning/40 bg-warning/5"
            : state === "error"
              ? "border-danger/40 bg-danger/5"
              : state === "ok"
                ? "border-success/40 bg-success/5"
                : "border-surface-border bg-surface";
        const iconTone =
          state === "review"
            ? "text-[#a9760a]"
            : state === "error"
              ? "text-danger"
              : state === "ok"
                ? "text-success"
                : "text-brand-600";
        return (
          <div key={s.key} className="flex items-center gap-2">
            <div className={cn("flex-1 rounded-xl border px-3 py-2.5", tone, compact ? "min-w-[92px]" : "min-w-[120px]")}>
              <div className="flex items-center gap-2">
                <Icon className={cn("h-4 w-4", iconTone)} />
                <span className="text-sm font-semibold text-ink">{s.label}</span>
              </div>
              {!compact && <p className="mt-0.5 text-[11px] text-ink-muted">{s.desc}</p>}
            </div>
            {i < STAGES.length - 1 && <ArrowRight className="h-4 w-4 shrink-0 text-ink-muted" />}
          </div>
        );
      })}
    </div>
  );
}
