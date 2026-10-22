import { z } from "zod";
import { saleItemSchema } from "@/lib/validations/sale";

export const selfServiceOrderSchema = z
  .object({
    customerName: z.string().trim().min(2, "Ingresá tu nombre").max(80),
    customerPhone: z.string().trim().min(6, "Ingresá tu teléfono").max(20),
    type: z.enum(["TAKEAWAY", "DELIVERY"]),
    deliveryAddress: z.string().trim().max(200).optional().or(z.literal("")),
    // Hora "HH:mm" (Argentina) para delivery programado; vacío = lo antes posible.
    scheduledTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Elegí un horario válido")
      .optional()
      .or(z.literal("")),
    paymentMethod: z.enum(["CASH", "MERCADOPAGO"]).default("CASH"),
    cashTendered: z.coerce.number().positive("Indicá con cuánto pagás").optional(),
    observations: z.string().trim().max(300).optional().or(z.literal("")),
    items: z.array(saleItemSchema).min(1, "Agregá al menos un producto"),
  })
  .refine((data) => data.type !== "DELIVERY" || !!data.deliveryAddress?.trim(), {
    message: "Indicá la dirección de entrega",
    path: ["deliveryAddress"],
  })
  .refine((data) => data.paymentMethod !== "CASH" || !!data.cashTendered, {
    message: "Indicá con cuánto pagás",
    path: ["cashTendered"],
  });

export type SelfServiceOrderInput = z.infer<typeof selfServiceOrderSchema>;
