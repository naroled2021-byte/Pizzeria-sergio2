"use client";

import { useState } from "react";
import { ChevronDown, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { currency } from "@/lib/format";
import { dozenUnits } from "@/lib/flavor-quantities";
import { MENU_CATEGORY_INFO } from "@/lib/business-links";
import type { SaleFlavor } from "@/components/sales/types";
import type { ProductRow } from "@/components/products/types";

export type MenuCategory = { name: string; products: ProductRow[] };

export function MenuAccordion({
  categories,
  flavors,
  quantities,
  onAdd,
}: {
  categories: MenuCategory[];
  flavors: SaleFlavor[];
  /** Unidades de cada producto que ya están en el pedido, para marcarlas en la carta. */
  quantities: Record<string, number>;
  onAdd: (product: ProductRow, flavorIds: string[]) => void;
}) {
  const [openCategory, setOpenCategory] = useState<string | null>(categories[0]?.name ?? null);

  if (categories.length === 0) {
    return (
      <p className="rounded-3xl border border-dashed py-16 text-center text-sm text-muted-foreground">
        Todavía no hay productos en la carta.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {categories.map((category) => {
        const open = openCategory === category.name;
        const info = MENU_CATEGORY_INFO[category.name];
        return (
          <section key={category.name} className="overflow-hidden rounded-3xl shadow-lg shadow-black/30">
            <button
              type="button"
              onClick={() => setOpenCategory(open ? null : category.name)}
              aria-expanded={open}
              className="flex w-full items-center gap-3 bg-primary bg-[linear-gradient(135deg,rgba(255,255,255,0.1),rgba(0,0,0,0.2))] px-5 py-4 text-left text-white"
            >
              {info && <span className="text-3xl leading-none">{info.emoji}</span>}
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-bold leading-tight">{category.name}</h2>
                {info && <p className="text-sm text-white/85">{info.subtitle}</p>}
              </div>
              <ChevronDown className={cn("size-6 shrink-0 transition-transform", open && "rotate-180")} />
            </button>

            {open && (
              <ul className="divide-y divide-border bg-card">
                {category.products.map((product) => (
                  <MenuItem
                    key={product.id}
                    product={product}
                    flavors={flavors}
                    quantity={quantities[product.id] ?? 0}
                    onAdd={onAdd}
                  />
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}

function MenuItem({
  product,
  flavors,
  quantity,
  onAdd,
}: {
  product: ProductRow;
  flavors: SaleFlavor[];
  quantity: number;
  onAdd: (product: ProductRow, flavorIds: string[]) => void;
}) {
  const [picking, setPicking] = useState(false);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const max = product.allowsFlavors ? product.maxFlavors : 0;
  // Por docena hay que completar las empanadas justas; "max" sigue limitando los gustos distintos.
  const dozen = dozenUnits(product);
  const limit = dozen ?? max;
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
  const distinct = Object.keys(counts).length;
  const canConfirm = dozen ? total === dozen : total > 0;

  function handlePlus() {
    // Los productos sin gustos se suman directo; los que llevan gustos (ej. la docena de
    // empanadas) abren primero la elección.
    if (max === 0) {
      onAdd(product, []);
      return;
    }
    setPicking((p) => !p);
  }

  function changeCount(id: string, delta: number) {
    setCounts((prev) => {
      const { [id]: current = 0, ...others } = prev;
      const next = current + delta;
      return next > 0 ? { ...prev, [id]: next } : others;
    });
  }

  function confirmFlavors() {
    onAdd(product, Object.entries(counts).flatMap(([id, count]) => Array<string>(count).fill(id)));
    setCounts({});
    setPicking(false);
  }

  return (
    <li className="px-4 py-3">
      <div className="flex items-center gap-3">
        {product.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.imageUrl} alt="" className="size-16 shrink-0 rounded-2xl object-cover" />
        )}
        <div className="min-w-0 flex-1">
          <p className="font-medium leading-tight">{product.name}</p>
          {product.description && (
            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{product.description}</p>
          )}
          <p className="mt-0.5 text-sm font-semibold text-[#ff5a5f]">{currency.format(product.price)}</p>
        </div>
        <button
          type="button"
          onClick={handlePlus}
          aria-label={`Agregar ${product.name}`}
          className={cn(
            "relative flex size-11 shrink-0 items-center justify-center rounded-full text-white transition-colors",
            picking ? "bg-white/15" : "bg-primary hover:brightness-110"
          )}
        >
          <Plus className={cn("size-5 transition-transform", picking && "rotate-45")} />
          {quantity > 0 && (
            <span className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-white text-[11px] font-bold text-black">
              {quantity}
            </span>
          )}
        </button>
      </div>

      {picking && (
        <div className="mt-3 rounded-2xl bg-muted p-3">
          <p className="mb-2 text-xs text-muted-foreground">
            {dozen ? `Elegí ${dozen} empanadas` : `Elegí hasta ${limit} gusto${limit > 1 ? "s" : ""}`} ({total}/{limit}).
            {dozen && flavors.length > max && ` Hasta ${max} gustos distintos.`}
          </p>
          <div className="flex flex-col gap-2">
            {flavors.map((flavor) => {
              const count = counts[flavor.id] ?? 0;
              return (
                <div key={flavor.id} className="flex items-center gap-2">
                  <span className={cn("min-w-0 flex-1 text-sm", count > 0 && "font-semibold")}>{flavor.name}</span>
                  <button
                    type="button"
                    disabled={count === 0}
                    onClick={() => changeCount(flavor.id, -1)}
                    aria-label={`Quitar ${flavor.name}`}
                    className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border transition-colors hover:border-primary disabled:opacity-40"
                  >
                    <Minus className="size-4" />
                  </button>
                  <span className="w-6 text-center text-sm font-semibold tabular-nums">{count}</span>
                  <button
                    type="button"
                    disabled={total >= limit || (count === 0 && distinct >= max)}
                    onClick={() => changeCount(flavor.id, 1)}
                    aria-label={`Agregar ${flavor.name}`}
                    className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-white transition-colors hover:brightness-110 disabled:opacity-40"
                  >
                    <Plus className="size-4" />
                  </button>
                </div>
              );
            })}
          </div>
          <Button className="mt-3 w-full" disabled={!canConfirm} onClick={confirmFlavors}>
            Agregar al pedido · {currency.format(product.price)}
          </Button>
        </div>
      )}
    </li>
  );
}
