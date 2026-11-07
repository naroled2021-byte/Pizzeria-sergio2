import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function KpiCard({
  label,
  value,
  icon: Icon,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  hint?: string;
  tone?: "default" | "warning" | "critical";
}) {
  return (
    <Card className="border-none shadow-sm">
      <CardContent className="flex items-start justify-between gap-3 px-5 py-4">
        <div className="flex flex-col gap-1 min-w-0">
          <span className="text-xs text-muted-foreground">{label}</span>
          <span className="text-xl md:text-2xl font-semibold tabular-nums leading-tight truncate">
            {value}
          </span>
          {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
        </div>
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-2xl",
            tone === "critical" && "bg-destructive text-white",
            tone === "warning" && "bg-[#f59e0b] text-white",
            tone === "default" && "bg-primary text-white"
          )}
        >
          <Icon className="size-5" strokeWidth={1.75} />
        </div>
      </CardContent>
    </Card>
  );
}
