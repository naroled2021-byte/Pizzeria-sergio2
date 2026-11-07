"use client";

import { Input } from "@/components/ui/input";

/** "20,000", "20.000" o "20000" guardan "20000", y se ve como "20.000" igual que los precios. */
export function parseCashDigits(text: string): string {
  return text.replace(/\D/g, "").replace(/^0+/, "");
}

export function CashInput({
  id,
  value,
  onValueChange,
  required,
  placeholder,
}: {
  id: string;
  /** Solo dígitos, listo para Number(). */
  value: string;
  onValueChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <Input
      id={id}
      type="text"
      inputMode="numeric"
      required={required}
      value={value && Number(value).toLocaleString("es-AR")}
      onChange={(e) => onValueChange(parseCashDigits(e.target.value))}
      placeholder={placeholder}
    />
  );
}
