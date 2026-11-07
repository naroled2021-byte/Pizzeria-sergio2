import { FRIES_SEASONINGS } from "@/lib/chicken-promo";

// Productos en los que el cliente tiene que elegir una opción. Se reconocen por el nombre, y lo
// elegido queda en OrderItem.notes para que salga en la comanda y en cocina.

export type ProductOptions = {
  label: string;
  question: string;
  choices: string[];
  multiple?: boolean;
  /** El precio es por este total de unidades, y se reparten entre las opciones. */
  units?: number;
};

const CHOICE_SEPARATOR = ", ";

const FRIES_OPTIONS: ProductOptions = {
  label: "Condimento",
  question: "¿Con qué condimento?",
  choices: [...FRIES_SEASONINGS],
};

const CHICKEN_OPTIONS: ProductOptions = {
  label: "Salsa",
  question: "¿Con qué salsa? Podés elegir más de una.",
  choices: ["Chimichurri", "Criolla", "Limón"],
  multiple: true,
};

const GRILL_OPTIONS: ProductOptions = {
  label: "Salsa",
  question: "¿Con qué salsa? Podés elegir más de una.",
  choices: ["Chimichurri", "Criolla"],
  multiple: true,
};

export const PRODUCT_OPTIONS: Record<string, ProductOptions> = {
  "Pollo entero": CHICKEN_OPTIONS,
  "Mitad de pollo": CHICKEN_OPTIONS,
  "Choripán x 1": GRILL_OPTIONS,
  "Choripán x 5": {
    label: "Lleva",
    question: "Elegí 5, chori o morcilla",
    choices: ["Chori con chimichurri", "Chori con criolla", "Morcilla con chimichurri", "Morcilla con criolla"],
    units: 5,
  },
  Morcilla: GRILL_OPTIONS,
  "Papas fritas chicas": FRIES_OPTIONS,
  "Papas fritas grandes": FRIES_OPTIONS,
};

/** Las opciones elegidas en el orden de la lista, así la misma elección siempre suma en la misma línea. */
export function joinChoices(options: ProductOptions, selected: string[]): string {
  return options.choices.filter((c) => selected.includes(c)).join(CHOICE_SEPARATOR);
}

/** { "Chori con criolla": 3, ... } -> "3x Chori con criolla, ...", en el orden de la lista. */
export function joinUnits(options: ProductOptions, counts: Record<string, number>): string {
  return options.choices
    .filter((c) => counts[c] > 0)
    .map((c) => `${counts[c]}x ${c}`)
    .join(CHOICE_SEPARATOR);
}

export function isValidChoice(options: ProductOptions, option: string): boolean {
  const selected = option.split(CHOICE_SEPARATOR);
  if (options.units) {
    const parts = selected.map((part) => part.match(/^([1-9]\d*)x (.+)$/));
    const total = parts.reduce((sum, match) => sum + Number(match?.[1] ?? 0), 0);
    return total === options.units && parts.every((match) => match && options.choices.includes(match[2]));
  }
  return (options.multiple || selected.length === 1) && selected.every((c) => options.choices.includes(c));
}

export function productOptionNote(options: ProductOptions, choice: string): string {
  return `${options.label}: ${choice}`;
}
