import { z } from "zod";

export const updateOrderSchema = z
  .object({
    id: z.string().min(1),
    type: z.enum(["DINE_IN", "TAKEAWAY", "DELIVERY"]),
    deliveryAddress: z.string().trim().max(200, "La dirección es muy larga"),
    customerName: z.string().trim().max(80, "El nombre es muy largo"),
    customerPhone: z.string().trim().max(20, "El teléfono es muy largo"),
    observations: z.string().trim().max(300, "Las observaciones son muy largas"),
    items: z
      .array(
        z.object({
          // Sin id es un producto que se agrega al pedido.
          id: z.string().min(1).optional(),
          productId: z.string().min(1),
          quantity: z.coerce.number().int().min(1, "La cantidad tiene que ser al menos 1"),
          unitPrice: z.coerce.number().min(0, "El precio no puede ser negativo"),
          flavorIds: z.array(z.string()),
        })
      )
      .min(1, "El pedido tiene que tener al menos un producto"),
  })
  .refine((data) => data.type !== "DELIVERY" || !!data.deliveryAddress, {
    message: "Indicá la dirección de entrega",
    path: ["deliveryAddress"],
  });

export type UpdateOrderInput = z.infer<typeof updateOrderSchema>;
