"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth-helpers";
import { CASH_MOVEMENT_TYPE, INVENTORY_MOVEMENT_TYPE, ORDER_STATUS, ORDER_TYPE, PAYMENT_METHOD } from "@/lib/constants";
import { deductStockForSale } from "@/lib/stock-deduction";
import { formatOrderNumber } from "@/lib/format";
import { flavorLimit } from "@/lib/flavor-quantities";
import { halvesFromNote } from "@/lib/half-and-half";
import { rebuildNotes } from "@/lib/order-notes";
import { updateOrderSchema, type UpdateOrderInput } from "@/lib/validations/order";

type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

const movableStatuses = [
  ORDER_STATUS.RECEIVED,
  ORDER_STATUS.CONFIRMED,
  ORDER_STATUS.PREPARING,
  ORDER_STATUS.READY,
  ORDER_STATUS.DELIVERED,
] as const;

/** Lo que hay que descontar de stock: una pizza mitad y mitad descuenta media receta de cada sabor. */
async function stockItemsFor(items: { productId: string; quantity: number; notes: string | null }[]) {
  const halfNames = items.flatMap((i) => halvesFromNote(i.notes));
  const halfProducts = halfNames.length > 0 ? await db.product.findMany({ where: { name: { in: halfNames } } }) : [];
  return items.flatMap((i) => {
    const halves = halvesFromNote(i.notes).map((name) => halfProducts.find((p) => p.name === name));
    return halves.length > 0 && halves.every(Boolean)
      ? halves.map((p) => ({ productId: p!.id, quantity: i.quantity / 2 }))
      : [{ productId: i.productId, quantity: i.quantity }];
  });
}

export async function updateOrderStatus(orderId: string, status: string): Promise<ActionResult> {
  const session = await requirePermission("orders.manage");

  if (!movableStatuses.includes(status as (typeof movableStatuses)[number])) {
    return { ok: false, error: "Estado inválido" };
  }

  const order = await db.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order) return { ok: false, error: "Pedido no encontrado" };
  if (order.status === ORDER_STATUS.CANCELLED) {
    return { ok: false, error: "Este pedido está cancelado" };
  }

  // El stock de Autoservicio se descuenta recién acá, no al crear el pedido — así un pedido
  // que queda en "Nuevos" sin confirmar nunca llega a afectar el stock. Mostrador/Ventas se
  // crea directo en "En preparación" y ya descontó al crearse, así que esto nunca se dispara
  // para esos (la condición exige que ANTES estuviera en "Nuevos").
  const shouldDeductStock =
    (status === ORDER_STATUS.PREPARING || status === ORDER_STATUS.DELIVERED) && order.status === ORDER_STATUS.RECEIVED;

  const stockItems = shouldDeductStock ? await stockItemsFor(order.items) : [];

  await db.$transaction(async (tx) => {
    await tx.order.update({ where: { id: orderId }, data: { status } });
    if (shouldDeductStock) {
      await deductStockForSale(
        tx,
        stockItems,
        formatOrderNumber(order.channel, order.channelNumber),
        order.id,
        session.user.id
      );
    }
  });

  await db.auditLog.create({
    data: {
      userId: session.user.id,
      action: "order.status_change",
      entity: "Order",
      entityId: orderId,
      metadata: JSON.stringify({ number: order.number, from: order.status, to: status }),
    },
  });

  revalidatePath("/admin/pedidos");
  revalidatePath("/cocina");
  revalidatePath("/admin");
  return { ok: true, data: undefined };
}

export async function updateOrder(input: UpdateOrderInput): Promise<ActionResult> {
  const session = await requirePermission("orders.manage");
  const parsed = updateOrderSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const data = parsed.data;

  const order = await db.order.findUnique({
    where: { id: data.id },
    include: {
      items: true,
      customer: true,
      cashMovements: {
        where: { type: { in: [CASH_MOVEMENT_TYPE.SALE_CASH, CASH_MOVEMENT_TYPE.SALE_DIGITAL] } },
        include: { cashRegister: true },
      },
    },
  });
  if (!order) return { ok: false, error: "Pedido no encontrado" };
  if (order.status === ORDER_STATUS.CANCELLED) {
    return { ok: false, error: "Este pedido está cancelado" };
  }

  const products = await db.product.findMany({ where: { id: { in: data.items.map((i) => i.productId) } } });
  const productMap = new Map(products.map((p) => [p.id, p]));
  const existingItems = new Map(order.items.map((i) => [i.id, i]));

  for (const item of data.items) {
    const product = productMap.get(item.productId);
    const existing = item.id ? existingItems.get(item.id) : null;
    if (!product || (item.id ? existing?.productId !== item.productId : !product.active)) {
      return { ok: false, error: "Hay un producto inválido en el pedido" };
    }
    if (product.allowsFlavors && item.flavorIds.length > flavorLimit(product)) {
      return { ok: false, error: `${product.name} lleva hasta ${flavorLimit(product)} gustos` };
    }
  }
  const flavorIds = [...new Set(data.items.flatMap((i) => i.flavorIds))];
  if ((await db.flavor.count({ where: { id: { in: flavorIds } } })) !== flavorIds.length) {
    return { ok: false, error: "Hay un gusto inválido en el pedido" };
  }

  const items = data.items.map((i) => ({
    ...i,
    product: productMap.get(i.productId)!,
    notes: i.id ? existingItems.get(i.id)!.notes : null,
    subtotal: i.unitPrice * i.quantity,
  }));
  const subtotal = items.reduce((sum, i) => sum + i.subtotal, 0);
  const discount = Math.min(order.discount, subtotal);
  // El envío no entra a la caja del local: lo que había por encima de los productos se mantiene.
  const extras = order.total - order.subtotal + order.discount;
  const cashTotal = Math.max(subtotal - discount, 0);
  const total = cashTotal + extras;

  // Cambiar el monto de una caja ya cerrada descuadraría su cierre.
  if (total !== order.total && order.cashMovements.some((m) => m.cashRegister.status === "CLOSED")) {
    return { ok: false, error: "Este pedido está en una caja cerrada: no se le puede cambiar el precio" };
  }

  // Los gustos no mueven stock: solo cuentan los productos y sus cantidades.
  const stockKey = (list: { productId: string; quantity: number; notes: string | null }[]) =>
    list.map((i) => `${i.productId}|${i.notes}|${i.quantity}`).sort().join();
  const stockChanged = stockKey(order.items) !== stockKey(items);
  const newStockItems = stockChanged ? await stockItemsFor(items) : [];
  const displayNumber = formatOrderNumber(order.channel, order.channelNumber);
  const keptIds = new Set(items.flatMap((i) => (i.id ? [i.id] : [])));

  const notes = rebuildNotes(order.notes, {
    // Si tiene cliente, el nombre se guarda en el cliente y no en las notas.
    name: order.customerId ? "" : data.customerName,
    observations: data.observations,
    total,
  });

  await db.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: order.id },
      data: {
        type: data.type,
        tableNumber: data.type === ORDER_TYPE.DINE_IN ? order.tableNumber : null,
        deliveryAddress: data.type === ORDER_TYPE.DELIVERY ? data.deliveryAddress : null,
        subtotal,
        discount,
        total,
        notes,
      },
    });
    await tx.orderItem.deleteMany({ where: { orderId: order.id, id: { notIn: [...keptIds] } } });
    for (const item of items) {
      const prices = { quantity: item.quantity, unitPrice: item.unitPrice, subtotal: item.subtotal };
      const flavors = { create: item.flavorIds.map((flavorId) => ({ flavorId })) };
      if (item.id) {
        await tx.orderItem.update({
          where: { id: item.id },
          data: { ...prices, ...(item.product.allowsFlavors && { flavors: { deleteMany: {}, ...flavors } }) },
        });
      } else {
        await tx.orderItem.create({
          data: {
            ...prices,
            orderId: order.id,
            productId: item.productId,
            format: item.product.allowsFlavors ? item.product.name : null,
            flavors,
          },
        });
      }
    }

    if (stockChanged) {
      // Devuelve lo que descontó el pedido y descuenta de nuevo con los productos actuales. Los
      // movimientos viejos se desvinculan del pedido para que cancelSale no los devuelva otra vez.
      const saleMovements = await tx.inventoryMovement.findMany({
        where: { orderId: order.id, type: INVENTORY_MOVEMENT_TYPE.SALE },
      });
      for (const m of saleMovements) {
        await tx.inventoryItem.update({
          where: { id: m.inventoryItemId },
          data: { currentStock: { increment: m.quantity } },
        });
        await tx.inventoryMovement.create({
          data: {
            inventoryItemId: m.inventoryItemId,
            type: INVENTORY_MOVEMENT_TYPE.ADJUSTMENT,
            quantity: m.quantity,
            reason: `Devolución por edición de pedido #${displayNumber}`,
            userId: session.user.id,
            orderId: order.id,
          },
        });
        await tx.inventoryMovement.update({ where: { id: m.id }, data: { orderId: null } });
      }
      // Un pedido en "Nuevos" todavía no descontó: lo hará al salir de ahí.
      if (order.status !== ORDER_STATUS.RECEIVED) {
        await deductStockForSale(tx, newStockItems, displayNumber, order.id, session.user.id);
      }
    }

    await tx.payment.updateMany({ where: { orderId: order.id }, data: { amount: total } });
    await tx.cashMovement.updateMany({
      where: { id: { in: order.cashMovements.map((m) => m.id) } },
      data: { amount: cashTotal },
    });
    if (order.customer) {
      await tx.customer.update({
        where: { id: order.customer.id },
        data: {
          name: data.customerName || order.customer.name,
          phone: data.customerPhone || order.customer.phone,
          totalSpent: { increment: total - order.total },
          points: { increment: Math.floor(total / 100) - Math.floor(order.total / 100) },
        },
      });
    }
    await tx.auditLog.create({
      data: {
        userId: session.user.id,
        action: "order.update",
        entity: "Order",
        entityId: order.id,
        metadata: JSON.stringify({
          number: order.number,
          before: {
            type: order.type,
            deliveryAddress: order.deliveryAddress,
            total: order.total,
            notes: order.notes,
            items: order.items.map((i) => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice })),
          },
          after: {
            type: data.type,
            deliveryAddress: data.deliveryAddress,
            total,
            notes,
            items: items.map((i) => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice })),
          },
        }),
      },
    });
  }, { timeout: 15000 });

  revalidatePath("/admin/pedidos");
  revalidatePath("/cocina");
  revalidatePath("/admin");
  revalidatePath("/admin/caja");
  revalidatePath("/admin/ventas");
  revalidatePath("/admin/reportes");
  revalidatePath("/admin/stock");
  return { ok: true, data: undefined };
}

export async function updateOrderPaymentMethod(orderId: string, method: string): Promise<ActionResult> {
  const session = await requirePermission("orders.manage");

  if (!Object.values(PAYMENT_METHOD).includes(method as (typeof PAYMENT_METHOD)[keyof typeof PAYMENT_METHOD])) {
    return { ok: false, error: "Método de pago inválido" };
  }

  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order) return { ok: false, error: "Pedido no encontrado" };

  await db.payment.updateMany({ where: { orderId }, data: { method } });

  await db.auditLog.create({
    data: {
      userId: session.user.id,
      action: "order.payment_method_change",
      entity: "Order",
      entityId: orderId,
      metadata: JSON.stringify({ number: order.number, method }),
    },
  });

  revalidatePath("/admin/pedidos");
  return { ok: true, data: undefined };
}

export async function logOrderReprint(orderId: string): Promise<ActionResult> {
  const session = await requirePermission("orders.manage");

  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order) return { ok: false, error: "Pedido no encontrado" };

  await db.auditLog.create({
    data: {
      userId: session.user.id,
      action: "order.reprint",
      entity: "Order",
      entityId: orderId,
      metadata: JSON.stringify({ number: order.number }),
    },
  });

  return { ok: true, data: undefined };
}
