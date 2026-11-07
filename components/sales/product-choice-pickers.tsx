"use client";

import { useState } from "react";
import { Check, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { currency } from "@/lib/format";
import {
  ALL_SAUCES,
  BASE_DRINK_NAME,
  CHICKEN_SAUCES,
  CHICKEN_SIDES,
  FRIES,
  FRIES_SEASONINGS,
  INCLUDED_DRINKS,
  SALAD,
  SALAD_INGREDIENTS,
  chickenPromoDetail,
  otherDrinkExtra,
  type ChickenPromoChoice,
} from "@/lib/chicken-promo";
import { FlavorCounter, type FlavorCounts } from "@/components/sales/flavor-counter";
import { joinChoices, joinUnits, productOptionNote, type ProductOptions } from "@/lib/product-options";
import type { CartLine } from "@/components/sales/types";

// Las usan la carta de Autoservicio y el diálogo de Mostrador y Ventas.

type ChoiceProduct = { id: string; name: string; price: number };

/** La misma opción suma cantidad; la promo pollo y cualquier otra opción van en su propia línea. */
export function addChoiceLine(cart: CartLine[], line: CartLine): CartLine[] {
  const existing = line.option && cart.find((l) => l.productId === line.productId && l.option === line.option);
  return existing
    ? cart.map((l) => (l.key === existing.key ? { ...l, quantity: l.quantity + line.quantity } : l))
    : [...cart, line];
}

function Chip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm transition-colors",
        selected ? "border-primary bg-primary text-white" : "border-border hover:border-primary"
      )}
    >
      {selected && <Check className="size-3.5" />}
      {children}
    </button>
  );
}

function ChipGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-xs text-muted-foreground">{title}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

export function ChickenPromoPicker({
  product,
  drinks,
  onAdd,
}: {
  product: ChoiceProduct;
  drinks: ChoiceProduct[];
  onAdd: (line: CartLine) => void;
}) {
  const [sauces, setSauces] = useState<ChickenPromoChoice["sauces"]>([]);
  const [side, setSide] = useState<ChickenPromoChoice["side"]>();
  const [seasoning, setSeasoning] = useState<ChickenPromoChoice["seasoning"]>();
  const [salad, setSalad] = useState<ChickenPromoChoice["salad"]>([]);
  const [drink, setDrink] = useState<ChickenPromoChoice["drink"]>();
  const [otherDrink, setOtherDrink] = useState<ChoiceProduct | null>(null);
  const [showOtherDrinks, setShowOtherDrinks] = useState(false);

  const baseDrink = drinks.find((d) => d.name === BASE_DRINK_NAME);
  const unitPrice = product.price + (otherDrink && baseDrink ? otherDrinkExtra(otherDrink.price, baseDrink.price) : 0);

  // "Con todo" ya incluye las demás, así que no se combina con ellas.
  function toggleSauce(sauce: ChickenPromoChoice["sauces"][number]) {
    setSauces((prev) => {
      if (prev.includes(sauce)) return prev.filter((s) => s !== sauce);
      if (sauce === ALL_SAUCES) return [sauce];
      return CHICKEN_SAUCES.filter((s) => s !== ALL_SAUCES && (s === sauce || prev.includes(s)));
    });
  }

  function toggleIngredient(ingredient: ChickenPromoChoice["salad"][number]) {
    setSalad((prev) => (prev.includes(ingredient) ? prev.filter((i) => i !== ingredient) : [...prev, ingredient]));
  }

  function confirm() {
    const choice: ChickenPromoChoice = {
      sauces,
      side,
      seasoning: side === FRIES ? seasoning : undefined,
      salad: side === SALAD ? salad : [],
      drink,
      otherDrinkId: otherDrink?.id,
    };
    onAdd({
      key: crypto.randomUUID(),
      productId: product.id,
      productName: product.name,
      unitPrice,
      quantity: 1,
      flavorIds: [],
      flavorNames: chickenPromoDetail(choice, otherDrink?.name),
      chickenPromo: choice,
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">Podés dejar opciones sin marcar.</p>
      <ChipGroup title="¿Con qué salsa? Podés elegir más de una.">
        {CHICKEN_SAUCES.map((option) => (
          <Chip key={option} selected={sauces.includes(option)} onClick={() => toggleSauce(option)}>
            {option}
          </Chip>
        ))}
      </ChipGroup>

      <ChipGroup title="¿Con qué lo acompañás?">
        {CHICKEN_SIDES.map((option) => (
          <Chip key={option} selected={side === option} onClick={() => setSide(side === option ? undefined : option)}>
            {option}
          </Chip>
        ))}
      </ChipGroup>

      {side === FRIES && (
        <ChipGroup title="¿Con qué condimento?">
          {FRIES_SEASONINGS.map((option) => (
            <Chip key={option} selected={seasoning === option} onClick={() => setSeasoning(seasoning === option ? undefined : option)}>
              {option}
            </Chip>
          ))}
        </ChipGroup>
      )}

      {side === SALAD && (
        <ChipGroup title="¿Qué lleva la ensalada?">
          {SALAD_INGREDIENTS.map((option) => (
            <Chip key={option} selected={salad.includes(option)} onClick={() => toggleIngredient(option)}>
              {option}
            </Chip>
          ))}
        </ChipGroup>
      )}

      <ChipGroup title="¿Qué bebida?">
        {INCLUDED_DRINKS.map((option) => (
          <Chip
            key={option}
            selected={drink === option}
            onClick={() => {
              setDrink(drink === option ? undefined : option);
              setOtherDrink(null);
            }}
          >
            {option}
          </Chip>
        ))}
        {baseDrink && (
          <Chip selected={showOtherDrinks} onClick={() => setShowOtherDrinks((s) => !s)}>
            Otra bebida
          </Chip>
        )}
      </ChipGroup>

      {baseDrink && showOtherDrinks && (
        <ChipGroup title="Otra bebida: pagás la diferencia.">
          {drinks
            .filter((d) => d.id !== baseDrink.id)
            .map((option) => {
              const extra = otherDrinkExtra(option.price, baseDrink.price);
              return (
                <Chip
                  key={option.id}
                  selected={otherDrink?.id === option.id}
                  onClick={() => {
                    setOtherDrink(otherDrink?.id === option.id ? null : option);
                    setDrink(undefined);
                  }}
                >
                  {option.name} · {extra > 0 ? `+${currency.format(extra)}` : "sin cargo"}
                </Chip>
              );
            })}
        </ChipGroup>
      )}

      <Button className="w-full" onClick={confirm}>
        Agregar al pedido · {currency.format(unitPrice)}
      </Button>
    </div>
  );
}

type OptionPickerProps = {
  product: ChoiceProduct;
  options: ProductOptions;
  onAdd: (line: CartLine) => void;
};

export function ProductOptionPicker(props: OptionPickerProps) {
  return props.options.units ? <UnitsPicker {...props} units={props.options.units} /> : <ChoicePicker {...props} />;
}

/** Productos con precio por un total fijo de unidades: se reparten entre las opciones. */
function UnitsPicker({ product, options, units, onAdd }: OptionPickerProps & { units: number }) {
  const [counts, setCounts] = useState<FlavorCounts>({});
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);

  function confirm() {
    const choice = joinUnits(options, counts);
    onAdd({
      key: crypto.randomUUID(),
      productId: product.id,
      productName: product.name,
      unitPrice: product.price,
      quantity: 1,
      flavorIds: [],
      flavorNames: [productOptionNote(options, choice)],
      option: choice,
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">
        {options.question} ({total}/{units}).
      </p>
      <FlavorCounter
        flavors={options.choices.map((c) => ({ id: c, name: c }))}
        counts={counts}
        onChange={setCounts}
        limit={units}
        maxDistinct={options.choices.length}
      />
      <Button className="w-full" disabled={total !== units} onClick={confirm}>
        Agregar al pedido · {currency.format(product.price)}
      </Button>
    </div>
  );
}

function ChoicePicker({ product, options, onAdd }: OptionPickerProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);

  function toggle(option: string) {
    setSelected((prev) => {
      if (!options.multiple) return [option];
      return prev.includes(option) ? prev.filter((o) => o !== option) : [...prev, option];
    });
  }

  function confirm() {
    const choice = joinChoices(options, selected);
    onAdd({
      key: crypto.randomUUID(),
      productId: product.id,
      productName: product.name,
      unitPrice: product.price,
      quantity,
      flavorIds: [],
      flavorNames: [productOptionNote(options, choice)],
      option: choice,
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <ChipGroup title={options.question}>
        {options.choices.map((option) => (
          <Chip key={option} selected={selected.includes(option)} onClick={() => toggle(option)}>
            {option}
          </Chip>
        ))}
      </ChipGroup>
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1 text-xs text-muted-foreground">¿Cuántos?</span>
        <button
          type="button"
          disabled={quantity === 1}
          onClick={() => setQuantity((q) => q - 1)}
          aria-label="Quitar uno"
          className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border transition-colors hover:border-primary disabled:opacity-40"
        >
          <Minus className="size-4" />
        </button>
        <span className="w-6 text-center text-sm font-semibold tabular-nums">{quantity}</span>
        <button
          type="button"
          onClick={() => setQuantity((q) => q + 1)}
          aria-label="Agregar uno"
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-white transition-colors hover:brightness-110"
        >
          <Plus className="size-4" />
        </button>
      </div>
      <Button className="w-full" disabled={selected.length === 0} onClick={confirm}>
        Agregar al pedido · {currency.format(product.price * quantity)}
      </Button>
    </div>
  );
}
