"use client";

import { useState } from "react";
import { Check, ChevronDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { currency } from "@/lib/format";
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
  const [selected, setSelected] = useState<string[]>([]);
  const max = product.allowsFlavors ? product.maxFlavors : 0;

  function handlePlus() {
    // Los productos sin gustos se suman directo; los que llevan gustos (ej. la docena de
    // empanadas) abren primero la elección.
    if (max === 0) {
      onAdd(product, []);
      return;
    }
    setPicking((p) => !p);
  }

  function toggleFlavor(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : prev.length >= max ? prev : [...prev, id]
    );
  }

  function confirmFlavors() {
    onAdd(product, selected);
    setSelected([]);
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
            Elegí hasta {max} gusto{max > 1 ? "s" : ""} ({selected.length}/{max}). Si querés cantidades de cada
            uno, contanos en Observaciones.
          </p>
          <div className="flex flex-wrap gap-2">
            {flavors.map((flavor) => {
              const isSelected = selected.includes(flavor.id);
              return (
                <button
                  key={flavor.id}
                  type="button"
                  onClick={() => toggleFlavor(flavor.id)}
                  className={cn(
                    "flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm transition-colors",
                    isSelected ? "border-primary bg-primary text-white" : "border-border hover:border-primary"
                  )}
                >
                  {isSelected && <Check className="size-3.5" />}
                  {flavor.name}
                </button>
              );
            })}
          </div>
          <Button className="mt-3 w-full" disabled={selected.length === 0} onClick={confirmFlavors}>
            Agregar al pedido · {currency.format(product.price)}
          </Button>
        </div>
      )}
    </li>
  );
}
