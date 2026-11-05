"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Minus, Plus, Trash2 } from "lucide-react";
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
import { FlavorCounter, countsFromIds, idsFromCounts, type FlavorCounts } from "@/components/sales/flavor-counter";
import { updateOrder } from "@/lib/actions/order-actions";
import { ORDER_TYPE, ORDER_TYPE_LABEL } from "@/lib/constants";
import { groupFlavorNames } from "@/lib/flavor-quantities";
import { currency, formatOrderNumber } from "@/lib/format";
import { nameFromNotes, observationsFromNotes } from "@/lib/order-notes";
import type { KanbanOrder, OrderCatalog } from "@/components/orders/types";

type Line = {
  key: string;
  id?: string;
  productId: string;
  name: string;
  baseDetail: string[];
  quantity: number;
  price: string;
  flavorLimit: number;
  maxDistinct: number;
  counts: FlavorCounts;
  showFlavors: boolean;
};

export function EditOrderDialog({
  order,
  catalog,
  open,
  onOpenChange,
}: {
  order: KanbanOrder;
  catalog: OrderCatalog;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        {open && <EditOrderForm order={order} catalog={catalog} onOpenChange={onOpenChange} />}
      </DialogContent>
    </Dialog>
  );
}

function EditOrderForm({
  order,
  catalog,
  onOpenChange,
}: {
  order: KanbanOrder;
  catalog: OrderCatalog;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  // El formulario toma los datos al abrirse: el refresco de Pedidos cada 5 segundos no pisa lo que se está escribiendo.
  const [type, setType] = useState(order.type);
  const [customerName, setCustomerName] = useState(order.customerName ?? nameFromNotes(order.notes));
  const [customerPhone, setCustomerPhone] = useState(order.customerPhone ?? "");
  const [deliveryAddress, setDeliveryAddress] = useState(order.deliveryAddress ?? "");
  const [observations, setObservations] = useState(observationsFromNotes(order.notes));
  const [lines, setLines] = useState<Line[]>(() =>
    order.orderItems.map((it) => ({
      key: it.id,
      id: it.id,
      productId: it.productId,
      name: it.productName,
      baseDetail: it.baseDetail,
      quantity: it.quantity,
      price: String(it.unitPrice),
      flavorLimit: it.flavorLimit,
      maxDistinct: it.maxDistinct,
      counts: countsFromIds(it.flavors.map((f) => f.id)),
      showFlavors: false,
    }))
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Un gusto ya desactivado sigue apareciendo si este pedido lo lleva, para poder sacarlo.
  const flavors = [
    ...catalog.flavors,
    ...order.orderItems
      .flatMap((it) => it.flavors)
      .filter((f, i, all) => !catalog.flavors.some((c) => c.id === f.id) && all.findIndex((o) => o.id === f.id) === i),
  ];

  const subtotal = lines.reduce((sum, l) => sum + (Number(l.price) || 0) * l.quantity, 0);
  const extras = order.total - order.subtotal + order.discount;
  const total = Math.max(subtotal - Math.min(order.discount, subtotal), 0) + extras;

  function updateLine(key: string, changes: Partial<Line>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...changes } : l)));
  }

  function addProduct(productId: string) {
    const product = catalog.products.find((p) => p.id === productId);
    if (!product) return;
    setLines((prev) => [
      ...prev,
      {
        key: crypto.randomUUID(),
        productId: product.id,
        name: product.name,
        baseDetail: product.baseDetail,
        quantity: 1,
        price: String(product.price),
        flavorLimit: product.flavorLimit,
        maxDistinct: product.maxDistinct,
        counts: {},
        showFlavors: product.flavorLimit > 0,
      },
    ]);
  }

  function lineDetail(line: Line): string {
    const names = idsFromCounts(line.counts).map((id) => flavors.find((f) => f.id === id)?.name ?? "");
    return [...line.baseDetail, ...groupFlavorNames(names.filter(Boolean))].join(" + ");
  }

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
        items: lines.map((l) => ({
          id: l.id,
          productId: l.productId,
          quantity: l.quantity,
          unitPrice: l.price as never,
          flavorIds: idsFromCounts(l.counts),
        })),
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
        <DialogDescription>Los cambios ajustan la caja y el stock del pedido.</DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label>Productos</Label>
          {lines.map((line) => {
            const detail = lineDetail(line);
            const flavorTotal = Object.values(line.counts).reduce((sum, count) => sum + count, 0);
            return (
              <div key={line.key} className="flex flex-col gap-2 rounded-xl border p-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{line.name}</p>
                    {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="shrink-0"
                    aria-label={`Quitar ${line.name}`}
                    onClick={() => setLines((prev) => prev.filter((l) => l.key !== line.key))}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      disabled={line.quantity <= 1}
                      aria-label="Restar uno"
                      onClick={() => updateLine(line.key, { quantity: line.quantity - 1 })}
                    >
                      <Minus className="size-3.5" />
                    </Button>
                    <span className="w-6 text-center text-sm tabular-nums">{line.quantity}</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      aria-label="Sumar uno"
                      onClick={() => updateLine(line.key, { quantity: line.quantity + 1 })}
                    >
                      <Plus className="size-3.5" />
                    </Button>
                  </div>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    aria-label={`Precio de ${line.name}`}
                    className="w-28"
                    value={line.price}
                    onChange={(e) => updateLine(line.key, { price: e.target.value })}
                  />
                  <span className="text-xs text-muted-foreground">c/u</span>
                  {line.flavorLimit > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="ml-auto"
                      onClick={() => updateLine(line.key, { showFlavors: !line.showFlavors })}
                    >
                      {line.showFlavors ? "Ocultar gustos" : "Cambiar gustos"}
                    </Button>
                  )}
                </div>

                {line.showFlavors && (
                  <div className="rounded-lg bg-muted p-2.5">
                    <p className="mb-2 text-xs text-muted-foreground">
                      Gustos ({flavorTotal}/{line.flavorLimit})
                    </p>
                    <FlavorCounter
                      flavors={flavors}
                      counts={line.counts}
                      onChange={(counts) => updateLine(line.key, { counts })}
                      limit={line.flavorLimit}
                      maxDistinct={line.maxDistinct}
                    />
                  </div>
                )}
              </div>
            );
          })}

          <Select value="" onValueChange={(v) => v && addProduct(v)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Agregar un producto">{() => "Agregar un producto"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {catalog.products.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name} · {currency.format(p.price)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

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
          <Button type="submit" disabled={isPending || lines.length === 0}>
            {isPending && <Loader2 className="size-4 animate-spin" />}
            Guardar cambios
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
