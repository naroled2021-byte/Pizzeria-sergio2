import { FRIES_SEASONINGS } from "@/lib/chicken-promo";

// Productos en los que el cliente tiene que elegir una opción. Se reconocen por el nombre, y lo
// elegido queda en OrderItem.notes para que salga en la comanda y en cocina.

export type ProductOptions = { label: string; question: string; choices: string[] };

const FRIES_OPTIONS: ProductOptions = {
  label: "Condimento",
  question: "¿Con qué condimento?",
  choices: [...FRIES_SEASONINGS],
};

export const PRODUCT_OPTIONS: Record<string, ProductOptions> = {
  "Mitad de pollo": { label: "Salsa", question: "¿Con qué salsa?", choices: ["Chimichurri", "Criolla", "Limón"] },
  "Papas fritas chicas": FRIES_OPTIONS,
  "Papas fritas grandes": FRIES_OPTIONS,
};

export function productOptionNote(options: ProductOptions, choice: string): string {
  return `${options.label}: ${choice}`;
}
