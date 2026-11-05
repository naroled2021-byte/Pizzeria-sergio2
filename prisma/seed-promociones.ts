// Carga las promociones de la carta sin tocar nada más de la base (a diferencia de seed.ts,
// que la borra). Se puede correr varias veces: actualiza por nombre, no duplica.
// Uso: npm run db:seed-promos
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

// Los gustos se eligen al pedir, igual que en la docena de empanadas.
const MEDIA_DOCENA = 6;
const DOCENA = 8;

const PROMOCIONES: { description: string; price: number; maxFlavors?: number }[] = [
  { description: "3 Mozzarellas", price: 32000 },
  { description: "2 Jamón y morrón", price: 26000 },
  { description: "1 Mozzarella + 1 Jamón y morrón", price: 24000 },
  { description: "1 Fugazzeta + 2 Jamón + 1 Mozzarella", price: 46000 },
  { description: "1 Jamón y morrón + 1 Mozzarella + 1 Huevo + 1 Napolitana", price: 46000 },
  { description: "2 Mozzarellas + 1/2 Docena de empanadas", price: 29000, maxFlavors: MEDIA_DOCENA },
  { description: "1 Jamón y morrón + 1 Docena de empanadas", price: 30000, maxFlavors: DOCENA },
  { description: "1 Mozzarella + 1 Jamón y morrón + 1 Docena de empanadas", price: 40000, maxFlavors: DOCENA },
  { description: "2 Docenas de empanadas", price: 34000, maxFlavors: DOCENA },
  { description: "1 Mozzarella + 1/2 Docena de empanadas", price: 18500, maxFlavors: MEDIA_DOCENA },
];

async function main() {
  const category = await db.category.upsert({
    where: { name: "Promociones" },
    update: {},
    create: { name: "Promociones", order: -1 },
  });

  for (const [i, promo] of PROMOCIONES.entries()) {
    const name = `Promoción ${i + 1}`;
    const data = {
      description: promo.description,
      price: promo.price,
      allowsFlavors: !!promo.maxFlavors,
      maxFlavors: promo.maxFlavors ?? 0,
      showInCounter: true,
      order: i,
    };
    const existing = await db.product.findFirst({ where: { name, categoryId: category.id } });
    if (existing) await db.product.update({ where: { id: existing.id }, data });
    else await db.product.create({ data: { ...data, name, categoryId: category.id } });
    console.log(`${name} · $${promo.price} · ${promo.description}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
