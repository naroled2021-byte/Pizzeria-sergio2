export type KanbanOrder = {
  id: string;
  number: number;
  channelNumber: number;
  type: string;
  status: string;
  channel: string;
  createdAt: string;
  subtotal: number;
  discount: number;
  total: number;
  tableNumber: string | null;
  deliveryAddress: string | null;
  customerName: string | null;
  customerPhone: string | null;
  notes: string | null;
  itemsSummary: string;
  paymentMethod: string | null;
  orderItems: {
    id: string;
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    flavorNames: string[];
    // Para editar: lo fijo del ítem (qué lleva la promo, las mitades) y los gustos por separado.
    baseDetail: string[];
    flavors: { id: string; name: string }[];
    flavorLimit: number;
    maxDistinct: number;
  }[];
};

/** Lo que se puede agregar o elegir al editar un pedido. */
export type OrderCatalog = {
  products: {
    id: string;
    name: string;
    price: number;
    baseDetail: string[];
    flavorLimit: number;
    maxDistinct: number;
  }[];
  flavors: { id: string; name: string }[];
};
