// La cantidad de cada gusto se guarda repitiendo el gusto en el ítem (3 de Pollo = 3 filas).

/** Empanadas que trae un producto según su nombre o descripción ("3 empanadas", "1/2 Docena", "Docena y media", "2 Docenas"),
 *  o null si no se vende por cantidad. */
export function dozenUnits(product: { name: string; description: string | null }): number | null {
  const text = `${product.name} ${product.description ?? ""}`;
  if (/docena\s+y\s+media/i.test(text)) return 18;
  if (/(1\/2|media)\s*docena/i.test(text)) return 6;
  const match = text.match(/(\d+)?\s*docenas?/i);
  if (match) return Number(match[1] ?? 1) * 12;
  const units = text.match(/(\d+)\s*empanadas/i);
  return units ? Number(units[1]) : null;
}

/** Cuántas unidades se reparten entre los gustos; 0 si el producto no lleva gustos. */
export function flavorLimit(product: {
  name: string;
  description: string | null;
  allowsFlavors: boolean;
  maxFlavors: number;
}): number {
  return product.allowsFlavors ? (dozenUnits(product) ?? product.maxFlavors) : 0;
}

/** ["Pollo", "Pollo", "Choclo"] -> ["2x Pollo", "Choclo"] */
export function groupFlavorNames(names: string[]): string[] {
  const counts = new Map<string, number>();
  for (const name of names) counts.set(name, (counts.get(name) ?? 0) + 1);
  return [...counts].map(([name, count]) => (count > 1 ? `${count}x ${name}` : name));
}
