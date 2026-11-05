"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { updateOrder } from "@/lib/actions/order-actions";
import { ORDER_TYPE, ORDER_TYPE_LABEL } from "@/lib/constants";
import { currency, formatOrderNumber } from "@/lib/format";
import { nameFromNotes, observationsFromNotes } from "@/lib/order-notes";
import type { KanbanOrder } from "@/components/orders/types";

export function EditOrderDialog({
  order,
  open,
  onOpenChange,
}: {
  order: KanbanOrder;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        {open && <EditOrderForm order={order} onOpenChange={onOpenChange} />}
      </DialogContent>
    </Dialog>
  );
}

function EditOrderForm({ order, onOpenChange }: { order: KanbanOrder; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  // El formulario toma los datos al abrirse: el refresco de Pedidos cada 5 segundos no pisa lo que se está escribiendo.
  const [type, setType] = useState(order.type);
  const [customerName, setCustomerName] = useState(order.customerName ?? nameFromNotes(order.notes));
  const [customerPhone, setCustomerPhone] = useState(order.customerPhone ?? "");
  const [deliveryAddress, setDeliveryAddress] = useState(order.deliveryAddress ?? "");
  const [observations, setObservations] = useState(observationsFromNotes(order.notes));
  const [prices, setPrices] = useState<Record<string, string>>(
    Object.fromEntries(order.orderItems.map((it) => [it.id, String(it.unitPrice)]))
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const subtotal = order.orderItems.reduce((sum, it) => sum + (Number(prices[it.id]) || 0) * it.quantity, 0);
  const extras = order.total - order.subtotal + order.discount;
  const total = Math.max(subtotal - Math.min(order.discount, subtotal), 0) + extras;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await updateOrder({
        id: order.id,
        type: type as never,
        customerName,
        customerPhone,
        deliveryAddress,
        observations,
        items: order.orderItems.map((it) => ({ id: it.id, unitPrice: prices[it.id] as never })),
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      toast.success(`Pedido #${formatOrderNumber(order.channel, order.channelNumber)} actualizado`);
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Editar pedido #{formatOrderNumber(order.channel, order.channelNumber)}</DialogTitle>
        <DialogDescription>Los cambios de precio también ajustan la caja del pedido.</DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label>Precio por unidad</Label>
          {order.orderItems.map((it) => (
            <div key={it.id} className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">
                  {it.quantity}x {it.productName}
                </p>
                {it.flavorNames.length > 0 && (
                  <p className="truncate text-xs text-muted-foreground">{it.flavorNames.join(" + ")}</p>
                )}
              </div>
              <Input
                type="number"
                min="0"
                step="0.01"
                required
                aria-label={`Precio de ${it.productName}`}
                className="w-28 shrink-0"
                value={prices[it.id]}
                onChange={(e) => setPrices((prev) => ({ ...prev, [it.id]: e.target.value }))}
              />
            </div>
          ))}
          <div className="flex justify-between border-t pt-2 text-sm font-semibold">
            <span>Total</span>
            <span className="tabular-nums">{currency.format(total)}</span>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Tipo de pedido</Label>
          <Select value={type} onValueChange={(v) => v && setType(v)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Tipo">{(value: string) => ORDER_TYPE_LABEL[value] ?? value}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {Object.values(ORDER_TYPE).map((t) => (
                <SelectItem key={t} value={t}>
                  {ORDER_TYPE_LABEL[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {type === ORDER_TYPE.DELIVERY && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-address">Dirección</Label>
            <Input
              id="edit-address"
              required
              maxLength={200}
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
            />
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit-name">Nombre del cliente</Label>
          <Input id="edit-name" maxLength={80} value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
        </div>

        {order.customerName && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-phone">Teléfono</Label>
            <Input id="edit-phone" maxLength={20} value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit-observations">Observaciones</Label>
          <Textarea
            id="edit-observations"
            rows={2}
            maxLength={300}
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
          />
        </div>

        {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="size-4 animate-spin" />}
            Guardar cambios
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
