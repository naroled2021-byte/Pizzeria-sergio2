// Las notas de un pedido son líneas con formato fijo: Pedidos, Cocina y el ticket las leen así.

/** "Paga con $20.000 (vuelto $5.000)" */
export function cashPaymentNote(cashTendered: number, total: number): string {
  const change = cashTendered - total;
  return `Paga con $${cashTendered.toLocaleString("es-AR")}${change >= 0 ? ` (vuelto $${change.toLocaleString("es-AR")})` : ""}`;
}

function lineValue(notes: string | null, prefix: string): string {
  const line = notes?.split("\n").find((l) => l.startsWith(prefix));
  return line ? line.slice(prefix.length).trim() : "";
}

export function nameFromNotes(notes: string | null): string {
  return lineValue(notes, "Nombre:");
}

export function observationsFromNotes(notes: string | null): string {
  return lineValue(notes, "Obs:");
}

/** Reemplaza el nombre y las observaciones, y recalcula el vuelto con el total nuevo. El resto
 *  de las líneas (programado, pago por Mercado Pago) queda como estaba. */
export function rebuildNotes(
  notes: string | null,
  { name, observations, total }: { name: string; observations: string; total: number }
): string | null {
  const kept = (notes ?? "")
    .split("\n")
    .filter((l) => l && !l.startsWith("Nombre:") && !l.startsWith("Obs:"))
    .map((l) => {
      const tendered = l.match(/^Paga con \$([\d.,]+)/)?.[1];
      return tendered ? cashPaymentNote(Number(tendered.replace(/\./g, "").replace(",", ".")), total) : l;
    });
  const lines = [name && `Nombre: ${name}`, ...kept, observations && `Obs: ${observations}`].filter(Boolean);
  return lines.length > 0 ? lines.join("\n") : null;
}
