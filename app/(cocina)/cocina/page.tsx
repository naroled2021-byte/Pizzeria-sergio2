import { getKanbanOrders } from "@/lib/queries/orders";
import { ORDER_STATUS } from "@/lib/constants";
import { KitchenBoard } from "@/components/cocina/kitchen-board";

export const dynamic = "force-dynamic";

export default async function CocinaPage() {
  const orders = await getKanbanOrders();

  // Solo lo que está en preparación, el más viejo primero (es el que hay que sacar antes).
  const preparing = orders
    .filter((o) => o.status === ORDER_STATUS.PREPARING)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  return (
    <KitchenBoard
      orders={preparing.map((o) => ({
        id: o.id,
        channel: o.channel,
        channelNumber: o.channelNumber,
        type: o.type,
        tableNumber: o.tableNumber,
        createdAt: o.createdAt.toISOString(),
        scheduledFor: o.scheduledFor?.toISOString() ?? null,
        customerName: o.customer?.name ?? null,
        notes: o.notes,
        items: o.items.map((it) => ({
          id: it.id,
          productName: it.product.name,
          quantity: it.quantity,
          flavorNames: it.flavors.map((f) => f.flavor.name),
        })),
      }))}
    />
  );
}
