// Promo pollo: el cliente elige salsa, acompañamiento y bebida. Lo elegido queda en
// OrderItem.notes para que salga en la comanda y en cocina.

export const CHICKEN_PROMO_NAME = "Promo pollo";
export const DRINKS_CATEGORY = "Bebidas";

export const CHICKEN_SAUCES = ["Chimichurri", "Criolla", "Limón", "Con todo"] as const;
export const FRIES = "Papas fritas";
export const SALAD = "Ensalada";
export const CHICKEN_SIDES = [FRIES, SALAD] as const;
export const FRIES_SEASONINGS = ["Sazonador de Doritos", "Sazonador de cheddar", "Sal de la casa"] as const;
export const SALAD_INGREDIENTS = ["Lechuga", "Tomate", "Cebolla", "Zanahoria", "Huevo"] as const;
export const INCLUDED_DRINKS = ["Manaos común", "Manaos cero", "Crush naranja", "Crush pomelo", "Crush lima"] as const;
/** La bebida que ya está en el precio de la promo: otra bebida paga la diferencia con esta. */
export const BASE_DRINK_NAME = "Manaos";

export type ChickenPromoChoice = {
  sauce: (typeof CHICKEN_SAUCES)[number];
  side: (typeof CHICKEN_SIDES)[number];
  seasoning?: (typeof FRIES_SEASONINGS)[number];
  salad: (typeof SALAD_INGREDIENTS)[number][];
  /** Una de las incluidas, o si no el producto de la otra bebida que eligió. */
  drink?: (typeof INCLUDED_DRINKS)[number];
  otherDrinkId?: string;
};

const NOTE_SEPARATOR = " | ";

/** Una bebida más barata que la incluida no descuenta nada de la promo. */
export function otherDrinkExtra(drinkPrice: number, baseDrinkPrice: number): number {
  return Math.max(drinkPrice - baseDrinkPrice, 0);
}

export function chickenPromoDetail(choice: ChickenPromoChoice, otherDrinkName?: string): string[] {
  return [
    `Salsa: ${choice.sauce}`,
    choice.side === SALAD ? `${SALAD}: ${choice.salad.join(", ")}` : `${FRIES}: ${choice.seasoning}`,
    `Bebida: ${otherDrinkName ?? choice.drink}`,
  ];
}

export function chickenPromoNote(choice: ChickenPromoChoice, otherDrinkName?: string): string {
  return chickenPromoDetail(choice, otherDrinkName).join(NOTE_SEPARATOR);
}

/** "Salsa: Criolla | Papas fritas | Bebida: Manaos cero" -> sus tres partes. */
export function detailFromNote(note: string): string[] {
  return note.split(NOTE_SEPARATOR);
}
