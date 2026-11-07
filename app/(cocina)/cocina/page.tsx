import { getKanbanOrders } from "@/lib/queries/orders";
import { ORDER_STATUS } from "@/lib/constants";
import { KitchenBoard } from "@/components/cocina/kitchen-board";
import { itemDetailNames } from "@/lib/comanda-text";
import { itemDisplayName } from "@/lib/half-and-half";

export const dynamic = "force-dynamic";

export default async function CocinaPage() {
  const orders = await getKanbanOrders();

  // Lo que hay que preparar, el más viejo primero (es el que hay que sacar antes). Autoservicio
  // entra directo en "Nuevos" sin que nadie lo pase a preparación, así que también va acá.
  const preparing = orders
    .filter((o) => o.status === ORDER_STATUS.PREPARING || o.status === ORDER_STATUS.RECEIVED)
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
          productName: itemDisplayName(it),
          quantity: it.quantity,
          flavorNames: itemDetailNames(it.product, it.flavors.map((f) => f.flavor.name), it.notes),
        })),
      }))}
    />
  );
}
