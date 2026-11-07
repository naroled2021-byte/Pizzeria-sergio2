"use client";

import { useTheme } from "next-themes";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { singleSeriesColor, chartChrome } from "@/lib/chart-colors";
import { useMounted } from "@/lib/use-mounted";

const currency = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

export function SalesByDayChart({ data }: { data: { label: string; total: number }[] }) {
  const { resolvedTheme } = useTheme();
  const mounted = useMounted();
  const mode = mounted && resolvedTheme === "dark" ? "dark" : "light";
  const color = singleSeriesColor[mode];
  const chrome = chartChrome[mode];

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={chrome.grid} strokeDasharray="0" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={{ stroke: chrome.axis }}
          tick={{ fill: chrome.axis, fontSize: 12 }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fill: chrome.axis, fontSize: 12 }}
          tickFormatter={(v) => currency.format(v)}
          width={84}
        />
        <Tooltip
          cursor={{ fill: "color-mix(in oklch, var(--foreground) 6%, transparent)" }}
          formatter={(value) => currency.format(Number(value))}
          contentStyle={{
            background: chrome.surface,
            border: "1px solid var(--border)",
            borderRadius: 12,
            fontSize: 12,
          }}
        />
        <Bar dataKey="total" name="Ventas" fill={color} radius={[4, 4, 0, 0]} maxBarSize={40} />
      </BarChart>
    </ResponsiveContainer>
  );
}
