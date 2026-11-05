import { requirePermission } from "@/lib/auth-helpers";
import { getKanbanOrders } from "@/lib/queries/orders";
import { getTicketSettings } from "@/lib/queries/settings";
import { KanbanBoard } from "@/components/orders/kanban-board";
import { itemDetailNames } from "@/lib/comanda-text";
import { itemDisplayName } from "@/lib/half-and-half";

export default async function PedidosPage() {
  await requirePermission("orders.manage");

  const [orders, ticketSettings] = await Promise.all([getKanbanOrders(), getTicketSettings()]);

  return (
    <div className="flex flex-col gap-6 pb-8">
      <div>
        <h1 className="text-2xl font-semibold">Pedidos</h1>
        <p className="text-sm text-muted-foreground">Seguimiento en vivo de los pedidos</p>
      </div>

      <KanbanBoard
        ticketSettings={ticketSettings}
        orders={orders.map((o) => ({
          id: o.id,
          number: o.number,
          channelNumber: o.channelNumber,
          type: o.type,
          status: o.status,
          channel: o.channel,
          createdAt: o.createdAt.toISOString(),
          subtotal: o.subtotal,
          discount: o.discount,
          total: o.total,
          tableNumber: o.tableNumber,
          deliveryAddress: o.deliveryAddress,
          customerName: o.customer?.name ?? null,
          customerPhone: o.customer?.phone ?? null,
          notes: o.notes,
          paymentMethod: o.payments[0]?.method ?? null,
          orderItems: o.items.map((it) => ({
            id: it.id,
            productName: itemDisplayName(it),
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            flavorNames: itemDetailNames(it.product, it.flavors.map((f) => f.flavor.name), it.notes),
          })),
          itemsSummary: o.items
            .map((it) => {
              const flavorNames = itemDetailNames(it.product, it.flavors.map((f) => f.flavor.name), it.notes);
              return `${it.quantity}x ${itemDisplayName(it)}${flavorNames.length ? ` (${flavorNames.join(", ")})` : ""}`;
            })
            .join(" · "),
        }))}
      />
    </div>
  );
}
