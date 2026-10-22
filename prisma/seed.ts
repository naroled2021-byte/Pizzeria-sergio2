import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import {
  ROLES,
  ORDER_TYPE,
  ORDER_STATUS,
  ORDER_CHANNEL,
  PAYMENT_METHOD,
  INVENTORY_ITEM_TYPE,
  CASH_MOVEMENT_TYPE,
  PRODUCTION_STATUS,
  PROMOTION_TYPE,
  NOTIFICATION_TYPE,
} from "../lib/constants";

const db = new PrismaClient();

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function pickMany<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function daysAgo(n: number, hour = 12, minute = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, minute, 0, 0);
  return d;
}

async function main() {
  console.log("Limpiando base de datos...");
  await db.$transaction([
    db.auditLog.deleteMany(),
    db.notification.deleteMany(),
    db.cashMovement.deleteMany(),
    db.cashRegister.deleteMany(),
    db.payment.deleteMany(),
    db.orderItemFlavor.deleteMany(),
    db.orderItem.deleteMany(),
    db.order.deleteMany(),
    db.coupon.deleteMany(),
    db.promotionProduct.deleteMany(),
    db.promotion.deleteMany(),
    db.productionItem.deleteMany(),
    db.production.deleteMany(),
    db.recipeItem.deleteMany(),
    db.recipe.deleteMany(),
    db.inventoryMovement.deleteMany(),
    db.customer.deleteMany(),
    db.product.deleteMany(),
    db.category.deleteMany(),
    db.flavor.deleteMany(),
    db.inventoryItem.deleteMany(),
    db.supplier.deleteMany(),
    db.paymentMethodConfig.deleteMany(),
    db.setting.deleteMany(),
    db.user.deleteMany(),
    db.role.deleteMany(),
    db.permission.deleteMany(),
  ]);

  // ---------- Roles y permisos ----------
  console.log("Creando roles y permisos...");
  const permissionKeys = [
    "dashboard.view",
    "sales.create",
    "orders.manage",
    "products.manage",
    "inventory.manage",
    "production.manage",
    "cash.manage",
    "customers.manage",
    "employees.manage",
    "reports.view",
    "settings.manage",
    "audit.view",
  ];
  const permissions = await Promise.all(
    permissionKeys.map((key) => db.permission.create({ data: { key } }))
  );
  const permByKey = Object.fromEntries(permissions.map((p) => [p.key, p]));

  const roleDefs: Record<string, string[]> = {
    [ROLES.ADMIN]: permissionKeys,
    [ROLES.MANAGER]: [
      "dashboard.view",
      "sales.create",
      "orders.manage",
      "products.manage",
      "inventory.manage",
      "production.manage",
      "cash.manage",
      "customers.manage",
      "reports.view",
    ],
    [ROLES.SELLER]: ["dashboard.view", "sales.create", "orders.manage", "customers.manage"],
    [ROLES.PRODUCTION]: ["dashboard.view", "production.manage", "inventory.manage", "orders.manage"],
    [ROLES.CASHIER]: ["dashboard.view", "sales.create", "cash.manage"],
  };

  const roles: Record<string, { id: string }> = {};
  for (const [name, keys] of Object.entries(roleDefs)) {
    roles[name] = await db.role.create({
      data: {
        name,
        permissions: { connect: keys.map((k) => ({ id: permByKey[k].id })) },
      },
    });
  }

  // ---------- Usuarios ----------
  console.log("Creando usuarios...");
  const passwordHash = await bcrypt.hash("pizzeria123", 10);
  const userDefs = [
    { name: "Ana Administradora", email: "admin@pizzeriasergio.com", role: ROLES.ADMIN },
    { name: "Marcos Encargado", email: "encargado@pizzeriasergio.com", role: ROLES.MANAGER },
    { name: "Sofía Vendedora", email: "vendedor@pizzeriasergio.com", role: ROLES.SELLER },
    { name: "Lucas Producción", email: "produccion@pizzeriasergio.com", role: ROLES.PRODUCTION },
    { name: "Julia Caja", email: "caja@pizzeriasergio.com", role: ROLES.CASHIER },
  ];
  const users: Record<string, { id: string; name: string }> = {};
  for (const u of userDefs) {
    users[u.role] = await db.user.create({
      data: {
        name: u.name,
        email: u.email,
        passwordHash,
        roleId: roles[u.role].id,
        lastLoginAt: daysAgo(randInt(0, 3)),
      },
    });
  }

  // ---------- Categorías ----------
  console.log("Creando categorías...");
  const categoryNames = [
    "Pizzas",
    "Empanadas",
    "Parrilla",
    "Bebidas",
    "Otros",
  ];
  const categories: Record<string, { id: string }> = {};
  for (let i = 0; i < categoryNames.length; i++) {
    categories[categoryNames[i]] = await db.category.create({
      data: { name: categoryNames[i], order: i },
    });
  }

  // ---------- Sabores ----------
  // Gustos de empanada (se eligen al vender la docena). El stock en kg es el del relleno.
  console.log("Creando sabores...");
  const flavorDefs: { name: string; category: string; popular?: boolean }[] = [
    { name: "Carne", category: "clasica", popular: true },
    { name: "Carne picante", category: "especial" },
    { name: "Choclo", category: "vegetariana" },
    { name: "Cebolla y queso", category: "vegetariana" },
    { name: "Jamón y queso", category: "clasica", popular: true },
    { name: "Pollo", category: "clasica" },
    { name: "Roquefort", category: "especial" },
    { name: "Verdura", category: "vegetariana" },
  ];

  const flavors: { id: string; name: string }[] = [];
  for (const f of flavorDefs) {
    const stock = randInt(2, 15);
    const min = 8;
    const inv = await db.inventoryItem.create({
      data: {
        name: `Sabor: ${f.name}`,
        type: INVENTORY_ITEM_TYPE.FLAVOR,
        unit: "kg",
        currentStock: stock,
        minStock: min,
        maxStock: 20,
        cost: randInt(1800, 3200),
      },
    });
    const flavor = await db.flavor.create({
      data: {
        name: f.name,
        category: f.category,
        popular: !!f.popular,
        inventoryItemId: inv.id,
      },
    });
    flavors.push(flavor);
  }

  // ---------- Insumos, envases, toppings, bebidas ----------
  console.log("Creando insumos e inventario general...");
  const supplier1 = await db.supplier.create({
    data: { name: "Distribuidora de Lácteos y Fiambres SRL", contactName: "Pablo Ríos", phone: "11-4444-1111" },
  });
  const supplier2 = await db.supplier.create({
    data: { name: "Cajas y Envases del Sur", contactName: "Carla Gómez", phone: "11-4444-2222" },
  });

  const otherInventory = [
    { name: "Harina 000", type: INVENTORY_ITEM_TYPE.INGREDIENT, unit: "kg", stock: 40, min: 50, supplier: supplier1 },
    { name: "Muzzarella en barra", type: INVENTORY_ITEM_TYPE.INGREDIENT, unit: "kg", stock: 18, min: 20, supplier: supplier1 },
    { name: "Salsa de tomate", type: INVENTORY_ITEM_TYPE.INGREDIENT, unit: "l", stock: 25, min: 15, supplier: supplier1 },
    { name: "Levadura", type: INVENTORY_ITEM_TYPE.INGREDIENT, unit: "kg", stock: 3, min: 2, supplier: supplier1 },
    { name: "Cajas de pizza grande", type: INVENTORY_ITEM_TYPE.PACKAGING, unit: "unidad", stock: 120, min: 100, supplier: supplier2 },
    { name: "Bandejas de empanadas", type: INVENTORY_ITEM_TYPE.PACKAGING, unit: "unidad", stock: 80, min: 60, supplier: supplier2 },
    { name: "Tapas de empanada", type: INVENTORY_ITEM_TYPE.INGREDIENT, unit: "docena", stock: 30, min: 20, supplier: supplier1 },
    { name: "Jamón cocido", type: INVENTORY_ITEM_TYPE.INGREDIENT, unit: "kg", stock: 5, min: 3, supplier: supplier1 },
    { name: "Jamón crudo", type: INVENTORY_ITEM_TYPE.INGREDIENT, unit: "kg", stock: 2, min: 2, supplier: supplier1 },
    { name: "Provolone", type: INVENTORY_ITEM_TYPE.INGREDIENT, unit: "kg", stock: 3, min: 2, supplier: supplier1 },
    { name: "Roquefort", type: INVENTORY_ITEM_TYPE.INGREDIENT, unit: "kg", stock: 2, min: 2, supplier: supplier1 },
    { name: "Aceitunas", type: INVENTORY_ITEM_TYPE.INGREDIENT, unit: "kg", stock: 4, min: 3, supplier: supplier1 },
    { name: "Morrones en conserva", type: INVENTORY_ITEM_TYPE.INGREDIENT, unit: "kg", stock: 2, min: 3, supplier: supplier1 },
    { name: "Huevos", type: INVENTORY_ITEM_TYPE.INGREDIENT, unit: "docena", stock: 10, min: 6, supplier: supplier1 },
    { name: "Chorizos", type: INVENTORY_ITEM_TYPE.INGREDIENT, unit: "unidad", stock: 40, min: 30, supplier: supplier1 },
    { name: "Pan para choripán", type: INVENTORY_ITEM_TYPE.INGREDIENT, unit: "unidad", stock: 40, min: 30 },
    { name: "Servilletas", type: INVENTORY_ITEM_TYPE.SUPPLY, unit: "paquete", stock: 15, min: 10 },
    { name: "Papel aluminio", type: INVENTORY_ITEM_TYPE.SUPPLY, unit: "unidad", stock: 12, min: 10 },
  ];
  for (const item of otherInventory) {
    await db.inventoryItem.create({
      data: {
        name: item.name,
        type: item.type,
        unit: item.unit,
        currentStock: item.stock,
        minStock: item.min,
        maxStock: item.min * 2,
        cost: randInt(50, 500),
        supplierId: item.supplier?.id,
      },
    });
  }

  // ---------- Productos ----------
  console.log("Creando productos...");
  // Carta de Pizzería Sergio. Los que figuran sin precio en la carta se crean inactivos
  // (precio 0) para que se les cargue el precio desde Productos antes de activarlos.
  const productDefs: {
    name: string;
    category: string;
    price: number;
    allowsFlavors?: boolean;
    maxFlavors?: number;
    active?: boolean;
  }[] = [
    { name: "Calabresa", category: "Pizzas", price: 13000 },
    { name: "Caribeña", category: "Pizzas", price: 14000 },
    { name: "Champignones", category: "Pizzas", price: 13000 },
    { name: "Crudo y rúcula", category: "Pizzas", price: 16000 },
    { name: "Cuatro quesos", category: "Pizzas", price: 16000 },
    { name: "Fugazzeta", category: "Pizzas", price: 13000 },
    { name: "Gol de Messi", category: "Pizzas", price: 16000 },
    { name: "Jamón y huevo", category: "Pizzas", price: 14000 },
    { name: "Jamón y morrón", category: "Pizzas", price: 14000 },
    { name: "Jamón y tomate", category: "Pizzas", price: 14000 },
    { name: "Mozzarella", category: "Pizzas", price: 11000 },
    { name: "Mozzarella con jamón", category: "Pizzas", price: 13000 },
    { name: "Mozzarella doble", category: "Pizzas", price: 16000 },
    { name: "Mozzarella pay", category: "Pizzas", price: 13000 },
    { name: "Mozzarella y anchoas", category: "Pizzas", price: 14000 },
    { name: "Mozzarella y choclo", category: "Pizzas", price: 13000 },
    { name: "Mozzarella y huevo", category: "Pizzas", price: 13000 },
    { name: "Mozzarella y morrón", category: "Pizzas", price: 13000 },
    { name: "Mozzarella, choclo y huevo", category: "Pizzas", price: 14000 },
    { name: "Mozzarella, tomate y huevo", category: "Pizzas", price: 14000 },
    { name: "Napolitana", category: "Pizzas", price: 13000 },
    { name: "Palmitos", category: "Pizzas", price: 16000 },
    { name: "Pizza de la casa", category: "Pizzas", price: 16000 },
    { name: "Pizza Sergio", category: "Pizzas", price: 16000 },
    { name: "Provolone con jamón", category: "Pizzas", price: 16000 },
    { name: "Pepperoni", category: "Pizzas", price: 13000 },
    { name: "Roquefort", category: "Pizzas", price: 13000 },
    { name: "Súper napo", category: "Pizzas", price: 14000 },
    { name: "Fugazzeta con jamón", category: "Pizzas", price: 0, active: false },
    { name: "Docena de empanadas", category: "Empanadas", price: 18000, allowsFlavors: true, maxFlavors: 8 },
    { name: "Choripán x 1", category: "Parrilla", price: 4000 },
    { name: "Choripán x 5", category: "Parrilla", price: 18000 },
    { name: "Pollo + ensalada o fritas + jugo", category: "Parrilla", price: 0, active: false },
    { name: "Coca-Cola 1.5L", category: "Bebidas", price: 4500 },
    { name: "Coca-Cola Zero 1.5L", category: "Bebidas", price: 4500 },
    { name: "Sprite 1.5L", category: "Bebidas", price: 4200 },
    { name: "Fanta 1.5L", category: "Bebidas", price: 4200 },
    { name: "Coca-Cola 500ml", category: "Bebidas", price: 2500 },
    { name: "Sprite 500ml", category: "Bebidas", price: 2300 },
    { name: "Agua mineral 500ml", category: "Bebidas", price: 1800 },
    { name: "Agua con gas 500ml", category: "Bebidas", price: 1800 },
    { name: "Agua saborizada 500ml", category: "Bebidas", price: 2200 },
    { name: "Jugo de naranja 1L", category: "Bebidas", price: 3500 },
    { name: "Cerveza Quilmes 1L", category: "Bebidas", price: 5000 },
    { name: "Cerveza Stella Artois 1L", category: "Bebidas", price: 6500 },
    { name: "Cerveza lata 473ml", category: "Bebidas", price: 3000 },
    { name: "Vino tinto 750ml", category: "Bebidas", price: 7000 },
  ];
  const products: { id: string; name: string; price: number; allowsFlavors: boolean }[] = [];
  for (let i = 0; i < productDefs.length; i++) {
    const p = productDefs[i];
    const prod = await db.product.create({
      data: {
        name: p.name,
        categoryId: categories[p.category].id,
        price: p.price,
        cost: Math.round(p.price * 0.4),
        active: p.active ?? true,
        allowsFlavors: !!p.allowsFlavors,
        maxFlavors: p.maxFlavors ?? 0,
        showInCounter: true,
        order: i,
      },
    });
    // Los pedidos demo solo usan productos activos.
    if (prod.active) products.push(prod);
  }

  // ---------- Clientes ----------
  console.log("Creando clientes...");
  const customerNames = [
    "Martina López",
    "Juan Pérez",
    "Camila Fernández",
    "Diego Sosa",
    "Valentina Ruiz",
    "Nicolás Torres",
    "Florencia Díaz",
    "Tomás Romero",
    "Agustina Molina",
    "Franco Acosta",
  ];
  const customers: { id: string; name: string }[] = [];
  for (const name of customerNames) {
    const c = await db.customer.create({
      data: {
        name,
        phone: `11-${randInt(4000, 4999)}-${randInt(1000, 9999)}`,
        email: `${name.toLowerCase().replace(/\s+/g, ".")}@mail.com`,
        points: randInt(0, 500),
        lastPurchaseAt: daysAgo(randInt(0, 20)),
      },
    });
    customers.push(c);
  }

  // ---------- Métodos de pago ----------
  console.log("Configurando métodos de pago...");
  const paymentMethods = [
    { key: PAYMENT_METHOD.CASH, label: "Efectivo" },
    { key: PAYMENT_METHOD.CARD, label: "Tarjeta" },
    { key: PAYMENT_METHOD.TRANSFER, label: "Transferencia" },
    { key: PAYMENT_METHOD.QR, label: "QR" },
    { key: PAYMENT_METHOD.MERCADOPAGO, label: "Mercado Pago" },
    { key: PAYMENT_METHOD.OTHER, label: "Otro", enabled: false },
  ];
  for (let i = 0; i < paymentMethods.length; i++) {
    const m = paymentMethods[i];
    await db.paymentMethodConfig.create({
      data: { key: m.key, label: m.label, enabled: m.enabled ?? true, order: i },
    });
  }

  // ---------- Configuración general ----------
  console.log("Creando configuración...");
  const settings: [string, string, string][] = [
    ["business.name", "Pizzería Sergio", "general"],
    ["business.currency", "ARS", "general"],
    ["business.taxRate", "21", "general"],
    ["business.address", "Filiberto 1496, esq. Quequén, Merlo", "general"],
    ["business.phone", "489-4218 / 489-8019 - WhatsApp 2204032172", "general"],
    ["print.ticketFooter", "¡Tu mejor opción siempre! - Delivery sin cargo - IG @pizzeria.sergio", "print"],
    ["theme.primaryColor", "#E31E24", "appearance"],
    ["theme.secondaryColor", "#CFE6C8", "appearance"],
    ["theme.accentColor", "#FBE3A1", "appearance"],
  ];
  for (const [key, value, group] of settings) {
    await db.setting.create({ data: { key, value, group } });
  }

  // ---------- Caja ----------
  console.log("Abriendo caja...");
  const cashRegister = await db.cashRegister.create({
    data: {
      number: 1,
      openedById: users[ROLES.CASHIER].id,
      openingAmount: 20000,
      status: "OPEN",
    },
  });

  // ---------- Pedidos, pagos y movimientos de caja ----------
  console.log("Creando pedidos demo...");
  let orderNumber = 1041;
  let counterChannelNumber = 0;
  let selfServiceChannelNumber = 0;
  const customerStats = new Map<string, { totalSpent: number; lastPurchaseAt: Date }>();
  const statusesPast = [ORDER_STATUS.DELIVERED, ORDER_STATUS.DELIVERED, ORDER_STATUS.DELIVERED, ORDER_STATUS.CANCELLED];
  const statusesToday = [ORDER_STATUS.RECEIVED, ORDER_STATUS.PREPARING, ORDER_STATUS.READY, ORDER_STATUS.DELIVERED];
  const orderTypes = [ORDER_TYPE.DINE_IN, ORDER_TYPE.TAKEAWAY, ORDER_TYPE.DELIVERY];
  const paymentMethodValues = [PAYMENT_METHOD.CASH, PAYMENT_METHOD.CARD, PAYMENT_METHOD.TRANSFER, PAYMENT_METHOD.QR, PAYMENT_METHOD.MERCADOPAGO];

  for (let i = 0; i < 20; i++) {
    const isToday = i >= 15; // últimos 5 pedidos son de hoy
    const dayOffset = isToday ? 0 : randInt(1, 13);
    const status = isToday ? pick(statusesToday) : pick(statusesPast);
    const type = pick(orderTypes);
    const customer = Math.random() > 0.3 ? pick(customers) : null;
    const seller = pick(Object.values(users));

    const itemCount = randInt(1, 3);
    const chosenProducts = pickMany(products, itemCount);
    let subtotal = 0;
    const itemsData: {
      productId: string;
      quantity: number;
      unitPrice: number;
      subtotal: number;
      format: string | null;
      flavorIds: string[];
    }[] = [];

    for (const prod of chosenProducts) {
      const qty = randInt(1, 2);
      const lineSubtotal = prod.price * qty;
      subtotal += lineSubtotal;
      itemsData.push({
        productId: prod.id,
        quantity: qty,
        unitPrice: prod.price,
        subtotal: lineSubtotal,
        format: prod.allowsFlavors ? prod.name : null,
        flavorIds: prod.allowsFlavors ? pickMany(flavors, randInt(1, 2)).map((f) => f.id) : [],
      });
    }

    const discount = Math.random() > 0.8 ? Math.round(subtotal * 0.1) : 0;
    const total = subtotal - discount;
    const createdAt = daysAgo(dayOffset, randInt(10, 21), randInt(0, 59));
    const channel = Math.random() > 0.7 ? ORDER_CHANNEL.SELF_SERVICE : ORDER_CHANNEL.COUNTER;
    const channelNumber =
      channel === ORDER_CHANNEL.SELF_SERVICE ? ++selfServiceChannelNumber : ++counterChannelNumber;

    const order = await db.order.create({
      data: {
        number: orderNumber++,
        channelNumber,
        type,
        status,
        channel,
        customerId: customer?.id,
        servedById: seller.id,
        subtotal,
        discount,
        total,
        createdAt,
        updatedAt: createdAt,
        items: {
          create: itemsData.map((it) => ({
            productId: it.productId,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            subtotal: it.subtotal,
            format: it.format,
            flavors: it.flavorIds.length
              ? { create: it.flavorIds.map((flavorId) => ({ flavorId })) }
              : undefined,
          })),
        },
      },
    });

    if (status !== ORDER_STATUS.CANCELLED) {
      const method = pick(paymentMethodValues);
      await db.payment.create({
        data: { orderId: order.id, method, amount: total, createdAt },
      });

      if (isToday) {
        await db.cashMovement.create({
          data: {
            cashRegisterId: cashRegister.id,
            type: method === PAYMENT_METHOD.CASH ? CASH_MOVEMENT_TYPE.SALE_CASH : CASH_MOVEMENT_TYPE.SALE_DIGITAL,
            amount: total,
            description: `Venta pedido #${order.number}`,
            userId: seller.id,
            orderId: order.id,
            createdAt,
          },
        });
      }

      if (customer) {
        const prev = customerStats.get(customer.id);
        customerStats.set(customer.id, {
          totalSpent: (prev?.totalSpent ?? 0) + total,
          lastPurchaseAt: prev && prev.lastPurchaseAt > createdAt ? prev.lastPurchaseAt : createdAt,
        });
      }
    }
  }

  for (const [customerId, stats] of customerStats) {
    await db.customer.update({
      where: { id: customerId },
      data: { totalSpent: stats.totalSpent, lastPurchaseAt: stats.lastPurchaseAt },
    });
  }

  await db.cashMovement.create({
    data: {
      cashRegisterId: cashRegister.id,
      type: CASH_MOVEMENT_TYPE.EXPENSE,
      amount: 3500,
      description: "Compra de servilletas y cajas de pizza",
      userId: users[ROLES.CASHIER].id,
    },
  });
  await db.cashMovement.create({
    data: {
      cashRegisterId: cashRegister.id,
      type: CASH_MOVEMENT_TYPE.INCOME,
      amount: 5000,
      description: "Reposición de caja chica",
      userId: users[ROLES.CASHIER].id,
    },
  });

  // ---------- Producción ----------
  console.log("Registrando producción...");
  const production = await db.production.create({
    data: {
      status: PRODUCTION_STATUS.IN_PROGRESS,
      createdById: users[ROLES.PRODUCTION].id,
      notes: "Producción según sugerencia de stock crítico",
    },
  });
  const criticalFlavors = pickMany(flavors, 5);
  for (const f of criticalFlavors) {
    await db.productionItem.create({
      data: {
        productionId: production.id,
        flavorId: f.id,
        quantityPlanned: randInt(5, 10),
        quantityProduced: randInt(0, 5),
        waste: randInt(0, 1),
      },
    });
  }

  // ---------- Promociones ----------
  console.log("Creando promociones...");
  const promo1 = await db.promotion.create({
    data: {
      name: "Miércoles 2x1 en Mozzarella",
      type: PROMOTION_TYPE.TWO_FOR_ONE,
      daysOfWeek: "WED",
      active: true,
    },
  });
  await db.promotionProduct.create({
    data: { promotionId: promo1.id, productId: products.find((p) => p.name === "Mozzarella")!.id },
  });

  await db.promotion.create({
    data: {
      name: "10% off en compras mayores a $10.000",
      type: PROMOTION_TYPE.PERCENTAGE_DISCOUNT,
      value: 10,
      active: true,
    },
  });

  const promoLoyalty = await db.promotion.create({
    data: {
      name: "Clientes frecuentes: 15% off",
      type: PROMOTION_TYPE.LOYALTY,
      value: 15,
      active: true,
    },
  });
  await db.coupon.create({
    data: {
      code: "BIENVENIDA10",
      promotionId: promoLoyalty.id,
      discountType: "PERCENTAGE",
      discountValue: 10,
      usageLimit: 100,
      active: true,
    },
  });

  // ---------- Notificaciones ----------
  console.log("Creando notificaciones...");
  await db.notification.create({
    data: {
      type: NOTIFICATION_TYPE.LOW_STOCK,
      title: "Stock crítico",
      message: "Varios sabores de empanada están por debajo del stock mínimo.",
      link: "/admin/inventario",
      userId: users[ROLES.ADMIN].id,
    },
  });
  await db.notification.create({
    data: {
      type: NOTIFICATION_TYPE.NEW_ORDER,
      title: "Nuevo pedido",
      message: `Pedido #${orderNumber - 1} recibido.`,
      link: "/admin/pedidos",
      userId: users[ROLES.SELLER].id,
    },
  });

  console.log("Seed completado con éxito.");
  console.log("\nUsuarios demo (contraseña: pizzeria123):");
  for (const u of userDefs) console.log(`  ${u.role.padEnd(14)} ${u.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
