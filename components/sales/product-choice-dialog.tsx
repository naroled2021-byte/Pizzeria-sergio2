"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChickenPromoPicker, ProductOptionPicker } from "@/components/sales/product-choice-pickers";
import { CHICKEN_PROMO_NAME, DRINKS_CATEGORY } from "@/lib/chicken-promo";
import { PRODUCT_OPTIONS } from "@/lib/product-options";
import type { CartLine, SaleProduct } from "@/components/sales/types";

export function hasProductChoices(product: { name: string }): boolean {
  return product.name === CHICKEN_PROMO_NAME || !!PRODUCT_OPTIONS[product.name];
}

export function ProductChoiceDialog({
  product,
  products,
  onCancel,
  onAdd,
}: {
  product: SaleProduct | null;
  products: SaleProduct[];
  onCancel: () => void;
  onAdd: (line: CartLine) => void;
}) {
  return (
    <Dialog open={!!product} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        {product && (
          <>
            <DialogHeader>
              <DialogTitle>{product.name}</DialogTitle>
            </DialogHeader>
            {product.name === CHICKEN_PROMO_NAME ? (
              <ChickenPromoPicker
                product={product}
                drinks={products.filter((p) => p.categoryName === DRINKS_CATEGORY)}
                onAdd={onAdd}
              />
            ) : (
              <ProductOptionPicker product={product} options={PRODUCT_OPTIONS[product.name]} onAdd={onAdd} />
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
