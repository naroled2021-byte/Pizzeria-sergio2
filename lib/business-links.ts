// Datos públicos del local que se muestran en la página de Autoservicio (links de contacto,
// textos de la cabecera). El nombre, la dirección y los teléfonos salen de Configuración.
export const BUSINESS_LINKS = {
  tagline: "Pizzería • Delivery • Take Away",
  slogan: "¡Tu mejor opción siempre!",
  // Formato internacional sin "+" ni espacios, como lo pide wa.me.
  whatsappNumber: "5492204032172",
  whatsappLabel: "220 403-2172",
  instagramUser: "pizzeria.sergio",
  mapsSuffix: "Buenos Aires",
};

// Subtítulo y emoji de cada categoría en la carta de Autoservicio. Una categoría sin entrada
// acá se muestra igual, solo con su nombre.
export const MENU_CATEGORY_INFO: Record<string, { subtitle: string; emoji: string }> = {
  Pizzas: { subtitle: "Elegí tu pizza favorita", emoji: "🍕" },
  Empanadas: { subtitle: "Docena con los gustos que quieras", emoji: "🥟" },
  Parrilla: { subtitle: "Viernes, sábados y domingos", emoji: "🔥" },
  Bebidas: { subtitle: "Gaseosas, aguas, cervezas y vino", emoji: "🥤" },
};
