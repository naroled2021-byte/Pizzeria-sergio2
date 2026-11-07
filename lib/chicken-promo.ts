// Promo pollo: el cliente puede elegir salsa, acompañamiento y bebida. Lo elegido queda en
// OrderItem.notes para que salga en la comanda y en cocina, junto con lo que no eligió.

export const CHICKEN_PROMO_NAME = "Promo pollo";
export const DRINKS_CATEGORY = "Bebidas";

export const ALL_SAUCES = "Con todo";
export const CHICKEN_SAUCES = ["Chimichurri", "Criolla", "Limón", ALL_SAUCES] as const;
export const FRIES = "Papas fritas";
export const SALAD = "Ensalada";
export const CHICKEN_SIDES = [FRIES, SALAD] as const;
export const FRIES_SEASONINGS = ["Sazonador de Doritos", "Sazonador de cheddar", "Sal de la casa"] as const;
export const SALAD_INGREDIENTS = ["Lechuga", "Tomate", "Cebolla", "Zanahoria", "Huevo"] as const;
export const INCLUDED_DRINKS = ["Manaos común", "Manaos cero", "Crush naranja", "Crush pomelo", "Crush lima"] as const;
/** La bebida que ya está en el precio de la promo: otra bebida paga la diferencia con esta. */
export const BASE_DRINK_NAME = "Manaos";

export type ChickenPromoChoice = {
  sauces: (typeof CHICKEN_SAUCES)[number][];
  side?: (typeof CHICKEN_SIDES)[number];
  seasoning?: (typeof FRIES_SEASONINGS)[number];
  salad: (typeof SALAD_INGREDIENTS)[number][];
  /** Una de las incluidas, o si no el producto de la otra bebida que eligió. */
  drink?: (typeof INCLUDED_DRINKS)[number];
  otherDrinkId?: string;
};

const NOTE_SEPARATOR = " | ";
export const NOT_CHOSEN = "sin elegir";

/** Una bebida más barata que la incluida no descuenta nada de la promo. */
export function otherDrinkExtra(drinkPrice: number, baseDrinkPrice: number): number {
  return Math.max(drinkPrice - baseDrinkPrice, 0);
}

function sideDetail(choice: ChickenPromoChoice): string {
  if (choice.side === SALAD) return `${SALAD}: ${choice.salad.join(", ") || NOT_CHOSEN}`;
  if (choice.side === FRIES) return `${FRIES}: ${choice.seasoning ?? NOT_CHOSEN}`;
  return `Acompañamiento: ${NOT_CHOSEN}`;
}

export function chickenPromoDetail(choice: ChickenPromoChoice, otherDrinkName?: string): string[] {
  return [
    `Salsa: ${choice.sauces.join(", ") || NOT_CHOSEN}`,
    sideDetail(choice),
    `Bebida: ${otherDrinkName ?? choice.drink ?? NOT_CHOSEN}`,
  ];
}

export function chickenPromoNote(choice: ChickenPromoChoice, otherDrinkName?: string): string {
  return chickenPromoDetail(choice, otherDrinkName).join(NOTE_SEPARATOR);
}

/** "Salsa: Criolla | Papas fritas | Bebida: Manaos cero" -> sus tres partes. */
export function detailFromNote(note: string): string[] {
  return note.split(NOTE_SEPARATOR);
}
