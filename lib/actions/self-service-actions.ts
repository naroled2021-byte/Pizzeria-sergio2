"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { selfServiceOrderSchema, type SelfServiceOrderInput } from "@/lib/validations/self-service";
import {
  ORDER_STATUS,
  ORDER_CHANNEL,
  PAYMENT_METHOD,
  CASH_MOVEMENT_TYPE,
  NOTIFICATION_TYPE,
  SELF_SERVICE_DELIVERY_FEE,
} from "@/lib/constants";
import { formatOrderNumber } from "@/lib/format";
import { dateKeyAR, startOfDayAR } from "@/lib/date-ar";

type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

type MercadoPagoTransferInfo = { alias: string; holder: string };

// Margen mínimo para programar un delivery: el tiempo de preparar y llevar el pedido.
const MIN_SCHEDULE_MINUTES = 30;

/**
 * Convierte la hora "HH:mm" elegida por el cliente (hora Argentina) en el instante real.
 * Es para hoy; si la hora ya pasó y es de madrugada (antes de las 6), se entiende que es la
 * misma noche pasada la medianoche (ej. a las 23:00 programar para las 00:30).
 */
function resolveScheduledFor(time: string, now: Date): Date {
  const [hours, minutes] = time.split(":").map(Number);
  let scheduled = new Date(startOfDayAR(now).getTime() + (hours * 60 + minutes) * 60_000);
  if (scheduled.getTime() <= now.getTime() && hours < 6) {
    scheduled = new Date(scheduled.getTime() + 24 * 60 * 60_000);
  }
  return scheduled;
}

/** Compara teléfonos solo por sus dígitos, para que "351 555-1234" y "3515551234" sean el mismo. */
function phoneDigits(phone: string) {
  return phone.replace(/\D/g, "");
}

/**
 * Cliente habilitado para pagar por transferencia de Mercado Pago (se habilita a mano desde
 * Clientes), o null. Sin alias configurado nadie puede usar la opción.
 */
async function findMercadoPagoCustomer(phone: string) {
  const digits = phoneDigits(phone);
  if (digits.length < 6) return null;

  const aliasSetting = await db.setting.findUnique({ where: { key: "autoservicio.mpAlias" } });
  if (!aliasSetting?.value.trim()) return null;

  const candidates = await db.customer.findMany({ where: { allowsMercadoPago: true, phone: { not: null } } });
  return candidates.find((c) => phoneDigits(c.phone!) === digits) ?? null;
}

/**
 * Lo consulta la página pública de Autoservicio al escribir el teléfono: si el cliente está
 * habilitado devuelve los datos para transferir; si no, null (no se revela nada más del cliente).
 */
export async function getMercadoPagoTransferInfo(phone: string): Promise<MercadoPagoTransferInfo | null> {
  const customer = await findMercadoPagoCustomer(phone);
  if (!customer) return null;

  const rows = await db.setting.findMany({
    where: { key: { in: ["autoservicio.mpAlias", "autoservicio.mpHolder"] } },
  });
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return { alias: map["autoservicio.mpAlias"] ?? "", holder: map["autoservicio.mpHolder"] ?? "" };
}

/**
 * Pedido público, sin login: lo arma el cliente desde /autoservicio. A diferencia de
 * createSale, no hay sesión de staff — no hay servedById, y el pago es en efectivo salvo que
 * el teléfono sea de un cliente habilitado para transferir por Mercado Pago (se verifica acá,
 * nunca se confía en el método de pago mandado por el cliente). El cliente se busca/crea
 * por teléfono (más confiable que el nombre para identificar al mismo cliente).
 */
export async function createSelfServiceOrder(
  input: SelfServiceOrderInput
): Promise<ActionResult<{ number: number; displayNumber: string; total: number }>> {
  const parsed = selfServiceOrderSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const data = parsed.data;

  // Defensa en profundidad: la página ya oculta el formulario cuando está apagado, pero
  // esto evita que alguien mande el pedido llamando la action directamente.
  const enabledSetting = await db.setting.findUnique({ where: { key: "autoservicio.enabled" } });
  if (enabledSetting?.value === "false") {
    return { ok: false, error: "El Autoservicio está cerrado en este momento" };
  }

  const productIds = data.items.map((i) => i.productId);
  const products = await db.product.findMany({ where: { id: { in: productIds }, active: true } });
  const productMap = new Map(products.map((p) => [p.id, p]));

  for (const item of data.items) {
    if (!productMap.has(item.productId)) return { ok: false, error: "Hay un producto inválido en el pedido" };
  }

  const subtotal = data.items.reduce((sum, item) => {
    const product = productMap.get(item.productId)!;
    return sum + product.price * item.quantity;
  }, 0);
  const deliveryFee = data.type === "DELIVERY" ? SELF_SERVICE_DELIVERY_FEE : 0;
  const total = subtotal + deliveryFee;

  // Nunca se confía en que el cliente diga que puede pagar con Mercado Pago: se vuelve a
  // chequear acá que el teléfono sea de un cliente habilitado.
  const isMercadoPago = data.paymentMethod === "MERCADOPAGO";
  const mpCustomer = isMercadoPago ? await findMercadoPagoCustomer(data.customerPhone) : null;
  if (isMercadoPago && !mpCustomer) {
    return { ok: false, error: "El pago con Mercado Pago no está habilitado para este teléfono" };
  }

  let paymentNote: string;
  if (isMercadoPago) {
    paymentNote = "Paga por transferencia Mercado Pago — verificar que llegó";
  } else {
    const cashTendered = data.cashTendered!;
    const change = cashTendered - total;
    paymentNote = `Paga con $${cashTendered.toLocaleString("es-AR")}${change >= 0 ? ` (vuelto $${change.toLocaleString("es-AR")})` : ""}`;
  }
  // Solo el delivery se puede programar. Se valida acá (no solo en la página) que la hora
  // deje margen para preparar y llevar el pedido.
  const now = new Date();
  let scheduledFor: Date | null = null;
  if (data.type === "DELIVERY" && data.scheduledTime) {
    scheduledFor = resolveScheduledFor(data.scheduledTime, now);
    if (scheduledFor.getTime() - now.getTime() < MIN_SCHEDULE_MINUTES * 60_000) {
      return {
        ok: false,
        error: `Elegí un horario al menos ${MIN_SCHEDULE_MINUTES} minutos más tarde que ahora`,
      };
    }
  }

  // La línea del programado va primera en las notas: así sale arriba en Pedidos y en el
  // ticket impreso, que ya muestran las notas del pedido.
  const notes = [
    scheduledFor && `PROGRAMADO: ${data.scheduledTime} hs`,
    paymentNote,
    data.observations?.trim() && `Obs: ${data.observations.trim()}`,
  ]
    .filter(Boolean)
    .join("\n");
  const dayKey = dateKeyAR(now);

  const result = await db.$transaction(async (tx) => {
    let customer = mpCustomer ?? (await tx.customer.findFirst({ where: { phone: data.customerPhone } }));
    if (customer) {
      customer = await tx.customer.update({
        where: { id: customer.id },
        data: {
          name: data.customerName,
          phone: data.customerPhone,
          totalSpent: { increment: total },
          lastPurchaseAt: new Date(),
          points: { increment: Math.floor(total / 100) },
        },
      });
    } else {
      customer = await tx.customer.create({
        data: {
          name: data.customerName,
          phone: data.customerPhone,
          totalSpent: total,
          lastPurchaseAt: new Date(),
          points: Math.floor(total / 100),
        },
      });
    }

    const [max, maxChannel] = await Promise.all([
      tx.order.aggregate({ _max: { number: true } }),
      tx.order.aggregate({ where: { channel: ORDER_CHANNEL.SELF_SERVICE, dayKey }, _max: { channelNumber: true } }),
    ]);
    const number = (max._max.number ?? 1040) + 1;
    const channelNumber = (maxChannel._max.channelNumber ?? 0) + 1;

    const order = await tx.order.create({
      data: {
        number,
        channelNumber,
        dayKey,
        type: data.type,
        status: ORDER_STATUS.RECEIVED,
        channel: ORDER_CHANNEL.SELF_SERVICE,
        customerId: customer.id,
        servedById: null,
        deliveryAddress: data.type === "DELIVERY" ? data.deliveryAddress || null : null,
        scheduledFor,
        subtotal,
        discount: 0,
        total,
        notes,
        items: {
          create: data.items.map((item) => {
            const product = productMap.get(item.productId)!;
            return {
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: product.price,
              subtotal: product.price * item.quantity,
              format: product.allowsFlavors ? product.name : null,
              flavors: item.flavorIds.length
                ? { create: item.flavorIds.map((flavorId) => ({ flavorId })) }
                : undefined,
            };
          }),
        },
      },
    });

    await tx.payment.create({
      data: { orderId: order.id, method: isMercadoPago ? PAYMENT_METHOD.MERCADOPAGO : PAYMENT_METHOD.CASH, amount: total },
    });

    // El stock se descuenta recién cuando alguien del local pasa el pedido a "En
    // preparación" (ver updateOrderStatus), no acá — así un pedido que nunca se confirma no
    // llega a afectar el stock.

    const openRegister = await tx.cashRegister.findFirst({ where: { status: "OPEN" } });
    if (openRegister) {
      // El envío no entra a la caja del local (queda con el repartidor) — el efectivo
      // esperado de Caja solo debe reflejar el valor de los productos, no el total del
      // pedido (que sí incluye el envío, para el ticket y lo que paga el cliente).
      await tx.cashMovement.create({
        data: {
          cashRegisterId: openRegister.id,
          type: isMercadoPago ? CASH_MOVEMENT_TYPE.SALE_DIGITAL : CASH_MOVEMENT_TYPE.SALE_CASH,
          amount: subtotal,
          paymentMethod: isMercadoPago ? PAYMENT_METHOD.MERCADOPAGO : PAYMENT_METHOD.CASH,
          description: `Venta pedido #${formatOrderNumber(order.channel, order.channelNumber)} (autoservicio)`,
          userId: null,
          orderId: order.id,
        },
      });
    }

    await tx.auditLog.create({
      data: {
        userId: null,
        action: "order.self_service_create",
        entity: "Order",
        entityId: order.id,
        metadata: JSON.stringify({ number: order.number, total }),
      },
    });

    await tx.notification.create({
      data: {
        type: NOTIFICATION_TYPE.NEW_ORDER,
        title: "Pedido de autoservicio",
        message: `Pedido #${formatOrderNumber(order.channel, order.channelNumber)} por $${total.toLocaleString("es-AR")}`,
        link: "/admin/pedidos",
      },
    });

    return order;
  }, { timeout: 15000 });

  revalidatePath("/admin/pedidos");
  revalidatePath("/admin");
  return {
    ok: true,
    data: { number: result.number, displayNumber: formatOrderNumber(result.channel, result.channelNumber), total },
  };
}
