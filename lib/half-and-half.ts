// Pizza mitad y mitad: el ítem se guarda con la pizza más cara (de ahí sale el precio) y las
// dos mitades quedan en OrderItem.notes, que no se usa para otra cosa.

export const HALF_AND_HALF_NAME = "Mitad y mitad";
export const HALF_AND_HALF_CATEGORY = "Pizzas";

export function halfAndHalfNote(firstName: string, secondName: string): string {
  return `1/2 ${firstName} + 1/2 ${secondName}`;
}

/** "1/2 Napolitana + 1/2 Palmitos" -> ["Napolitana", "Palmitos"]; [] si el ítem no es mitad y mitad. */
export function halvesFromNote(notes: string | null): string[] {
  return notes?.startsWith("1/2 ") ? notes.slice(4).split(" + 1/2 ") : [];
}

export function itemDisplayName(item: { notes: string | null; product: { name: string } }): string {
  return halvesFromNote(item.notes).length > 0 ? HALF_AND_HALF_NAME : item.product.name;
}
