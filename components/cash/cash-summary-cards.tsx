import { TrendingDown, TrendingUp, Landmark, DoorOpen } from "lucide-react";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { currency, formatCompactCurrency } from "@/lib/format";
import { computeExpectedByMethod, HIDDEN_AMOUNT, sumAmounts, summarizeMovements } from "@/lib/cash-utils";
import { CASH_MOVEMENT_TYPE, PAYMENT_METHOD } from "@/lib/constants";
import type { OpenRegister, CashPaymentMethod } from "@/components/cash/types";

export function CashSummaryCards({
  register,
  paymentMethods,
  cashLimit,
  hideAmounts,
}: {
  register: OpenRegister;
  paymentMethods: CashPaymentMethod[];
  cashLimit: number | null;
  hideAmounts: boolean;
}) {
  const full = (amount: number) => (hideAmounts ? HIDDEN_AMOUNT : currency.format(amount));
  const compact = (amount: number) => (hideAmounts ? HIDDEN_AMOUNT : formatCompactCurrency(amount));
  const totals = summarizeMovements(register.movements);
  const expectedByMethod = computeExpectedByMethod(register.openingAmounts, register.movements);
  const expectedTotal = sumAmounts(expectedByMethod);
  const manualOpens = register.movements.filter((m) => m.type === CASH_MOVEMENT_TYPE.MANUAL_OPEN).length;
  const cashOnly = (expectedByMethod[PAYMENT_METHOD.CASH] ?? 0);
  const overLimit = !!cashLimit && cashOnly > cashLimit;

  const salesByMethod: Record<string, number> = {};
  for (const m of register.movements) {
    if (m.type === CASH_MOVEMENT_TYPE.SALE_CASH || m.type === CASH_MOVEMENT_TYPE.SALE_DIGITAL) {
      const key = m.paymentMethod ?? PAYMENT_METHOD.CASH;
      salesByMethod[key] = (salesByMethod[key] ?? 0) + m.amount;
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {overLimit && (
        <div className="flex items-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
          {hideAmounts
            ? "🔴 El efectivo en caja superó el límite configurado."
            : `🔴 El efectivo en caja ($${cashOnly.toLocaleString("es-AR")}) superó el límite configurado ($${cashLimit!.toLocaleString("es-AR")}).`}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="Total inicial" value={compact(sumAmounts(register.openingAmounts))} icon={Landmark} />
        <KpiCard label="Ingresos" value={compact(totals.income)} icon={TrendingUp} />
        <KpiCard label="Egresos" value={compact(totals.expense)} icon={TrendingDown} />
        <KpiCard label="Aperturas manuales" value={String(manualOpens)} icon={DoorOpen} />
      </div>

      <div className="overflow-x-auto rounded-2xl border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
              <th className="px-4 py-2 font-medium">Método</th>
              <th className="px-4 py-2 font-medium">Inicial</th>
              <th className="px-4 py-2 font-medium">Ventas del día</th>
              <th className="px-4 py-2 font-medium">Esperado</th>
            </tr>
          </thead>
          <tbody>
            {paymentMethods.map((m) => (
              <tr key={m.key} className="border-b last:border-0">
                <td className="px-4 py-2 font-medium">{m.label}</td>
                <td className="px-4 py-2 tabular-nums">{full(register.openingAmounts[m.key] ?? 0)}</td>
                <td className="px-4 py-2 tabular-nums">{full(salesByMethod[m.key] ?? 0)}</td>
                <td className="px-4 py-2 font-semibold tabular-nums">{full(expectedByMethod[m.key] ?? 0)}</td>
              </tr>
            ))}
            <tr className="bg-muted/20 font-semibold">
              <td className="px-4 py-2">Total</td>
              <td className="px-4 py-2 tabular-nums">{full(sumAmounts(register.openingAmounts))}</td>
              <td className="px-4 py-2 tabular-nums">
                {full(Object.values(salesByMethod).reduce((s, v) => s + v, 0))}
              </td>
              <td className="px-4 py-2 tabular-nums">{full(expectedTotal)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
