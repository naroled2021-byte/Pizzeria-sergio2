import { db } from "@/lib/db";
import {
  BASE_DRINK_NAME,
  CHICKEN_PROMO_NAME,
  DRINKS_CATEGORY,
  chickenPromoNote,
  otherDrinkExtra,
  type ChickenPromoChoice,
} from "@/lib/chicken-promo";
import { PRODUCT_OPTIONS, isValidChoice, productOptionNote } from "@/lib/product-options";

type ItemWithChoices = { productId: string; chickenPromo?: ChickenPromoChoice; option?: string };
type ProductForChoices = { id: string; name: string; price: number };
type ResolvedItem = { unitPrice: number; notes: string | null };

/**
 * Precio y detalle de cada ítem según lo que eligió el cliente, en el mismo orden. Se calcula acá
 * y nunca se confía en el precio de la pantalla. Todos los productos tienen que estar en "products".
 */
export async function resolveItemChoices(
  items: ItemWithChoices[],
  products: ProductForChoices[]
): Promise<{ ok: true; items: ResolvedItem[] } | { ok: false; error: string }> {
  const otherDrinkIds = items.flatMap((i) => (i.chickenPromo?.otherDrinkId ? [i.chickenPromo.otherDrinkId] : []));
  const drinks =
    otherDrinkIds.length > 0
      ? await db.product.findMany({
          where: {
            active: true,
            category: { name: DRINKS_CATEGORY },
            OR: [{ id: { in: otherDrinkIds } }, { name: BASE_DRINK_NAME }],
          },
        })
      : [];
  const baseDrink = drinks.find((d) => d.name === BASE_DRINK_NAME);

  const resolved: ResolvedItem[] = [];
  for (const item of items) {
    const product = products.find((p) => p.id === item.productId)!;
    const invalid = { ok: false as const, error: `Revisá las opciones de ${product.name}` };
    const options = PRODUCT_OPTIONS[product.name];

    if (product.name === CHICKEN_PROMO_NAME) {
      const choice = item.chickenPromo;
      if (!choice) return invalid;
      const otherDrink = choice.otherDrinkId ? drinks.find((d) => d.id === choice.otherDrinkId) : undefined;
      if (choice.otherDrinkId && (!otherDrink || !baseDrink)) return invalid;
      resolved.push({
        unitPrice: product.price + (otherDrink ? otherDrinkExtra(otherDrink.price, baseDrink!.price) : 0),
        notes: chickenPromoNote(choice, otherDrink?.name),
      });
    } else if (options) {
      if (!item.option || !isValidChoice(options, item.option)) return invalid;
      resolved.push({ unitPrice: product.price, notes: productOptionNote(options, item.option) });
    } else {
      resolved.push({ unitPrice: product.price, notes: null });
    }
  }
  return { ok: true, items: resolved };
}
