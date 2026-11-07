"use client";

import { useTheme } from "next-themes";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { categoricalPalette, chartChrome } from "@/lib/chart-colors";
import { useMounted } from "@/lib/use-mounted";

const currency = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

export function PaymentMethodsChart({ data }: { data: { label: string; amount: number }[] }) {
  const { resolvedTheme } = useTheme();
  const mounted = useMounted();
  const mode = mounted && resolvedTheme === "dark" ? "dark" : "light";
  const palette = categoricalPalette[mode];
  const chrome = chartChrome[mode];

  if (data.length === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
        Sin pagos registrados todavía.
      </div>
    );
  }

  const total = data.reduce((sum, entry) => sum + entry.amount, 0);

  return (
    <div className="flex flex-col gap-3">
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            dataKey="amount"
            nameKey="label"
            innerRadius={48}
            outerRadius={75}
            paddingAngle={2}
            stroke={chrome.surface}
            strokeWidth={2}
            label={({ percent }) => `${Math.round((percent ?? 0) * 100)}%`}
            labelLine={false}
          >
            {data.map((entry, i) => (
              <Cell key={entry.label} fill={palette[i % palette.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => currency.format(Number(value))}
            contentStyle={{
              background: chrome.surface,
              border: "1px solid var(--border)",
              borderRadius: 12,
              fontSize: 12,
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <ul className="flex flex-col gap-1.5 text-xs">
        {data.map((entry, i) => (
          <li key={entry.label} className="flex items-center gap-2">
            <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: palette[i % palette.length] }} />
            <span className="min-w-0 flex-1 text-muted-foreground">{entry.label}</span>
            <span className="font-medium tabular-nums">
              {currency.format(entry.amount)} · {total > 0 ? Math.round((entry.amount / total) * 100) : 0}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
