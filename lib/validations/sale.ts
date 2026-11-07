import { z } from "zod";
import {
  CHICKEN_SAUCES,
  CHICKEN_SIDES,
  FRIES,
  FRIES_SEASONINGS,
  INCLUDED_DRINKS,
  SALAD,
  SALAD_INGREDIENTS,
} from "@/lib/chicken-promo";

const chickenPromoSchema = z
  .object({
    sauces: z.array(z.enum(CHICKEN_SAUCES)).min(1, "Elegí una salsa"),
    side: z.enum(CHICKEN_SIDES),
    seasoning: z.enum(FRIES_SEASONINGS).optional(),
    salad: z.array(z.enum(SALAD_INGREDIENTS)),
    drink: z.enum(INCLUDED_DRINKS).optional(),
    otherDrinkId: z.string().min(1).optional(),
  })
  .refine((data) => data.side !== FRIES || !!data.seasoning, { message: "Elegí el condimento de las papas" })
  .refine((data) => data.side !== SALAD || data.salad.length > 0, { message: "Elegí qué lleva la ensalada" })
  .refine((data) => !!data.drink !== !!data.otherDrinkId, { message: "Elegí una bebida" });

export const saleItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().min(1),
  flavorIds: z.array(z.string()).default([]),
  chickenPromo: chickenPromoSchema.optional(),
  option: z.string().max(120).optional(),
});

export const saleSchema = z
  .object({
    customerId: z.string().optional().or(z.literal("")),
    customerName: z.string().trim().max(80).optional().or(z.literal("")),
    type: z.enum(["DINE_IN", "TAKEAWAY", "DELIVERY"]),
    tableNumber: z.string().trim().max(20).optional().or(z.literal("")),
    deliveryAddress: z.string().trim().max(200).optional().or(z.literal("")),
    paymentMethod: z.string().min(1, "Elegí un método de pago"),
    discount: z.coerce.number().min(0, "No puede ser negativo").default(0),
    items: z.array(saleItemSchema).min(1, "Agregá al menos un producto"),
  })
  .refine((data) => data.type !== "DELIVERY" || !!data.deliveryAddress?.trim(), {
    message: "Indicá la dirección de entrega",
    path: ["deliveryAddress"],
  });

export type SaleInput = z.infer<typeof saleSchema>;
export type SaleItemInput = z.infer<typeof saleItemSchema>;
