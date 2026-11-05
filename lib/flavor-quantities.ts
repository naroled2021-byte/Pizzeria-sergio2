// La cantidad de cada gusto se guarda repitiendo el gusto en el ítem (3 de Pollo = 3 filas).

/** Empanadas que trae un producto según su nombre o descripción ("1/2 Docena", "2 Docenas"),
 *  o null si no se vende por docena. */
export function dozenUnits(product: { name: string; description: string | null }): number | null {
  const text = `${product.name} ${product.description ?? ""}`;
  if (/(1\/2|media)\s*docena/i.test(text)) return 6;
  const match = text.match(/(\d+)?\s*docenas?/i);
  return match ? Number(match[1] ?? 1) * 12 : null;
}

/** ["Pollo", "Pollo", "Choclo"] -> ["2x Pollo", "Choclo"] */
export function groupFlavorNames(names: string[]): string[] {
  const counts = new Map<string, number>();
  for (const name of names) counts.set(name, (counts.get(name) ?? 0) + 1);
  return [...counts].map(([name, count]) => (count > 1 ? `${count}x ${name}` : name));
}
