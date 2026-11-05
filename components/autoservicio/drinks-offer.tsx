"use client";

import { Loader2, Minus, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { currency } from "@/lib/format";
import type { ProductRow } from "@/components/products/types";

// Se reconocen por el nombre: el resto de las bebidas (litros, porrones) queda solo en la carta.
const OFFER_SECTIONS = [
  { title: "Latas de cerveza", match: /\blat(a|ón)\b/i },
  { title: "Gaseosas", match: /coca|fanta|sprite|pepsi|manaos|aquarius/i },
];

/** Última pantalla antes de mandar el pedido. No usa el Dialog común porque ese se dibuja
 *  fuera de esta página y perdería su tema oscuro. */
export function DrinksOffer({
  drinks,
  quantities,
  total,
  needsCash,
  cashTendered,
  setCashTendered,
  isPending,
  onAdd,
  onRemove,
  onClose,
  onConfirm,
}: {
  drinks: ProductRow[];
  quantities: Record<string, number>;
  total: number;
  /** Las bebidas agregadas superan lo que dijo que iba a pagar: hay que preguntarle de nuevo. */
  needsCash: boolean;
  cashTendered: string;
  setCashTendered: (value: string) => void;
  isPending: boolean;
  onAdd: (product: ProductRow) => void;
  onRemove: (product: ProductRow) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="drinks-offer-title"
        className="flex max-h-[90vh] w-full max-w-lg flex-col gap-3 rounded-t-3xl bg-card p-4 text-foreground sm:rounded-3xl sm:p-5"
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 id="drinks-offer-title" className="text-lg font-bold">
              ¿Querés agregar bebidas?
            </h2>
            <p className="text-sm text-muted-foreground">Sumá una gaseosa o una cerveza a tu pedido.</p>
          </div>
          <Button variant="ghost" size="icon-sm" aria-label="Volver al pedido" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="flex min-h-0 flex-col gap-3 overflow-y-auto">
          {OFFER_SECTIONS.map((section) => {
            const sectionDrinks = drinks.filter((drink) => section.match.test(drink.name));
            if (sectionDrinks.length === 0) return null;
            return (
              <section key={section.title}>
                <h3 className="text-sm font-bold text-muted-foreground">{section.title}</h3>
                <ul className="flex flex-col divide-y divide-border">
                  {sectionDrinks.map((drink) => {
                    const quantity = quantities[drink.id] ?? 0;
                    return (
                      <li key={drink.id} className="flex items-center gap-3 py-2.5">
                        {drink.imageUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={drink.imageUrl} alt="" className="size-12 shrink-0 rounded-xl object-cover" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium leading-tight">{drink.name}</p>
                          <p className="text-sm font-semibold text-[#ff5a5f]">{currency.format(drink.price)}</p>
                        </div>
                        {quantity > 0 && (
                          <>
                            <Button
                              variant="outline"
                              size="icon-sm"
                              aria-label={`Quitar ${drink.name}`}
                              onClick={() => onRemove(drink)}
                            >
                              <Minus className="size-3.5" />
                            </Button>
                            <span className="w-5 text-center text-sm font-semibold tabular-nums">{quantity}</span>
                          </>
                        )}
                        <Button size="icon-sm" aria-label={`Agregar ${drink.name}`} onClick={() => onAdd(drink)}>
                          <Plus className="size-3.5" />
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>

        {needsCash && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="drinks-offer-cash">El total subió. ¿Con cuánto pagás?</Label>
            <Input
              id="drinks-offer-cash"
              type="number"
              min="0"
              inputMode="numeric"
              value={cashTendered}
              onChange={(e) => setCashTendered(e.target.value)}
            />
          </div>
        )}

        <Button
          size="lg"
          className="h-12 shrink-0 rounded-2xl text-base"
          disabled={isPending || (needsCash && Number(cashTendered) < total)}
          onClick={onConfirm}
        >
          {isPending && <Loader2 className="size-4 animate-spin" />}
          Confirmar pedido · {currency.format(total)}
        </Button>
      </div>
    </div>
  );
}
