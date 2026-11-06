"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { currency } from "@/lib/format";
import { ChickenPromoPicker, ProductOptionPicker } from "@/components/sales/product-choice-pickers";
import { CHICKEN_PROMO_NAME } from "@/lib/chicken-promo";
import { PRODUCT_OPTIONS } from "@/lib/product-options";
import type { CartLine } from "@/components/sales/types";
import type { ProductRow } from "@/components/products/types";

/** Producto de la carta que antes de agregarse pide elegir: la promo pollo, la mitad de pollo, las papas. */
export function ProductChoiceItem({
  product,
  drinks,
  quantity,
  onAdd,
}: {
  product: ProductRow;
  drinks: ProductRow[];
  quantity: number;
  onAdd: (line: CartLine) => void;
}) {
  const [picking, setPicking] = useState(false);

  function handleAdd(line: CartLine) {
    onAdd(line);
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
          onClick={() => setPicking((p) => !p)}
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
          {product.name === CHICKEN_PROMO_NAME ? (
            <ChickenPromoPicker product={product} drinks={drinks} onAdd={handleAdd} />
          ) : (
            <ProductOptionPicker product={product} options={PRODUCT_OPTIONS[product.name]} onAdd={handleAdd} />
          )}
        </div>
      )}
    </li>
  );
}
