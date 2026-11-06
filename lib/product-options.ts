import { FRIES_SEASONINGS } from "@/lib/chicken-promo";

// Productos en los que el cliente tiene que elegir una opción. Se reconocen por el nombre, y lo
// elegido queda en OrderItem.notes para que salga en la comanda y en cocina.

export type ProductOptions = { label: string; question: string; choices: string[]; multiple?: boolean };

const CHOICE_SEPARATOR = ", ";

const FRIES_OPTIONS: ProductOptions = {
  label: "Condimento",
  question: "¿Con qué condimento?",
  choices: [...FRIES_SEASONINGS],
};

export const PRODUCT_OPTIONS: Record<string, ProductOptions> = {
  "Mitad de pollo": {
    label: "Salsa",
    question: "¿Con qué salsa? Podés elegir más de una.",
    choices: ["Chimichurri", "Criolla", "Limón"],
    multiple: true,
  },
  "Papas fritas chicas": FRIES_OPTIONS,
  "Papas fritas grandes": FRIES_OPTIONS,
};

/** Las opciones elegidas en el orden de la lista, así la misma elección siempre suma en la misma línea. */
export function joinChoices(options: ProductOptions, selected: string[]): string {
  return options.choices.filter((c) => selected.includes(c)).join(CHOICE_SEPARATOR);
}

export function isValidChoice(options: ProductOptions, option: string): boolean {
  const selected = option.split(CHOICE_SEPARATOR);
  return (options.multiple || selected.length === 1) && selected.every((c) => options.choices.includes(c));
}

export function productOptionNote(options: ProductOptions, choice: string): string {
  return `${options.label}: ${choice}`;
}
