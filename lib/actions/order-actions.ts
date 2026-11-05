"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth-helpers";
import { CASH_MOVEMENT_TYPE, ORDER_STATUS, ORDER_TYPE, PAYMENT_METHOD } from "@/lib/constants";
import { deductStockForSale } from "@/lib/stock-deduction";
import { formatOrderNumber } from "@/lib/format";
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

  // Una pizza mitad y mitad descuenta media receta de cada sabor.
  const halfNames = shouldDeductStock ? order.items.flatMap((i) => halvesFromNote(i.notes)) : [];
  const halfProducts = halfNames.length > 0 ? await db.product.findMany({ where: { name: { in: halfNames } } }) : [];
  const stockItems = order.items.flatMap((i) => {
    const halves = halvesFromNote(i.notes).map((name) => halfProducts.find((p) => p.name === name));
    return halves.length > 0 && halves.every(Boolean)
      ? halves.map((p) => ({ productId: p!.id, quantity: i.quantity / 2 }))
      : [{ productId: i.productId, quantity: i.quantity }];
  });

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

  const newPrices = new Map(data.items.map((i) => [i.id, i.unitPrice]));
  const items = order.items.map((i) => {
    const unitPrice = newPrices.get(i.id) ?? i.unitPrice;
    return { id: i.id, unitPrice, subtotal: unitPrice * i.quantity };
  });
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
    for (const item of items) {
      await tx.orderItem.update({ where: { id: item.id }, data: { unitPrice: item.unitPrice, subtotal: item.subtotal } });
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
          before: { type: order.type, deliveryAddress: order.deliveryAddress, total: order.total, notes: order.notes },
          after: { type: data.type, deliveryAddress: data.deliveryAddress, total, notes },
        }),
      },
    });
  });

  revalidatePath("/admin/pedidos");
  revalidatePath("/cocina");
  revalidatePath("/admin");
  revalidatePath("/admin/caja");
  revalidatePath("/admin/ventas");
  revalidatePath("/admin/reportes");
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
