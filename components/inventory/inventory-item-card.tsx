"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BellRing, Loader2, Pencil, Plus, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adjustStock, updateMinStock } from "@/lib/actions/inventory-actions";
import { getStockStatus, STOCK_STATUS_LABEL, STOCK_STATUS_COLOR, INVENTORY_ITEM_TYPE_LABEL } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { InventoryItemRow } from "@/components/inventory/types";

function formatQty(n: number) {
  return n.toLocaleString("es-AR", { maximumFractionDigits: 2 });
}

/**
 * Una fila de Stock pensada para cargar rápido: sumar lo que entró y cambiar la alerta
 * mínima sin abrir ningún diálogo. Para salidas, mermas o recuentos sigue estando "Ajustar".
 */
export function InventoryItemCard({
  item,
  onEdit,
  onAdjust,
}: {
  item: InventoryItemRow;
  onEdit: (item: InventoryItemRow) => void;
  onAdjust: (item: InventoryItemRow) => void;
}) {
  const router = useRouter();
  const [addQty, setAddQty] = useState("");
  const [minStock, setMinStock] = useState(String(item.minStock));
  const [isAdding, startAdding] = useTransition();
  const [isSavingMin, startSavingMin] = useTransition();
  const stockStatus = getStockStatus(item.currentStock, item.minStock);
  const needsRestock = stockStatus !== "NORMAL";

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const quantity = Number(addQty.replace(",", "."));
    if (!quantity || quantity <= 0) {
      toast.error("Escribí cuánto entró");
      return;
    }
    startAdding(async () => {
      const res = await adjustStock(item.id, { type: "IN", quantity, reason: "Carga rápida" });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`${item.name}: +${formatQty(quantity)} ${item.unit} → ${formatQty(res.data.currentStock)} ${item.unit}`);
      setAddQty("");
      router.refresh();
    });
  }

  function saveMinStock() {
    const value = Number(minStock.replace(",", "."));
    if (minStock.trim() === "" || Number.isNaN(value) || value < 0) {
      setMinStock(String(item.minStock));
      return;
    }
    if (value === item.minStock) return;
    startSavingMin(async () => {
      const res = await updateMinStock(item.id, value);
      if (!res.ok) {
        toast.error(res.error);
        setMinStock(String(item.minStock));
        return;
      }
      toast.success(`Alerta de ${item.name}: avisa con menos de ${formatQty(value)} ${item.unit}`);
      router.refresh();
    });
  }

  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-3 rounded-2xl border bg-card p-3 shadow-sm lg:grid-cols-[minmax(0,1fr)_16rem_17.5rem_9.5rem] lg:items-center lg:gap-5 lg:px-4",
        !item.active && "opacity-60"
      )}
      style={needsRestock ? { borderLeft: `4px solid ${STOCK_STATUS_COLOR[stockStatus]}` } : undefined}
    >
      {/* Nombre y estado */}
      <div className="flex min-w-0 items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium leading-tight">{item.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {INVENTORY_ITEM_TYPE_LABEL[item.type] ?? item.type}
            {!item.active && " · Inactivo"}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <p className="text-lg font-semibold leading-none tabular-nums">
            {formatQty(item.currentStock)} <span className="text-sm font-normal text-muted-foreground">{item.unit}</span>
          </p>
          <Badge
            variant="outline"
            className="gap-1 border-none text-[10px]"
            style={{ backgroundColor: `${STOCK_STATUS_COLOR[stockStatus]}22`, color: STOCK_STATUS_COLOR[stockStatus] }}
          >
            <span className="size-1.5 rounded-full" style={{ backgroundColor: STOCK_STATUS_COLOR[stockStatus] }} />
            {STOCK_STATUS_LABEL[stockStatus]}
          </Badge>
        </div>
      </div>

      {/* Carga rápida */}
      <form onSubmit={handleAdd} className="flex items-center gap-2">
        <Input
          type="number"
          inputMode="decimal"
          min="0"
          step="any"
          value={addQty}
          onChange={(e) => setAddQty(e.target.value)}
          placeholder={`Entró (${item.unit})`}
          aria-label={`Cantidad que entró de ${item.name}`}
          className="h-9 w-full"
        />
        <Button type="submit" size="sm" className="h-9 shrink-0 gap-1" disabled={isAdding || !addQty}>
          {isAdding ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          Sumar
        </Button>
      </form>

      {/* Alerta mínima editable */}
      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        <BellRing className="size-4 shrink-0" />
        <span className="whitespace-nowrap">Avisar con menos de</span>
        <Input
          type="number"
          inputMode="decimal"
          min="0"
          step="any"
          value={minStock}
          onChange={(e) => setMinStock(e.target.value)}
          onBlur={saveMinStock}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          aria-label={`Alerta mínima de ${item.name}`}
          className="h-9 w-20 text-sm text-foreground"
        />
        <span className="whitespace-nowrap">{item.unit}</span>
        {isSavingMin && <Loader2 className="size-3.5 animate-spin" />}
      </label>

      {/* Acciones */}
      <div className="flex items-center justify-end gap-1">
        <Button variant="outline" size="sm" onClick={() => onAdjust(item)} className="gap-1">
          <SlidersHorizontal className="size-3.5" />
          Ajustar
        </Button>
        {item.isFlavor ? (
          <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/admin/sabores" />}>
            Sabores
          </Button>
        ) : (
          <Button variant="ghost" size="icon-sm" onClick={() => onEdit(item)} aria-label="Editar ítem">
            <Pencil className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
