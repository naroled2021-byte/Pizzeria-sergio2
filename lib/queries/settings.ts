import { db } from "@/lib/db";

// Hash (bcrypt) de la clave que se pide para abrir la caja. Vacío o inexistente = sin clave.
export const CASH_PIN_SETTING_KEY = "cash.openPinHash";

export async function hasCashPinConfigured() {
  const row = await db.setting.findUnique({ where: { key: CASH_PIN_SETTING_KEY } });
  return !!row?.value;
}

export const DEFAULT_THEME = {
  primaryColor: "#E31E24",
  secondaryColor: "#CFE6C8",
  accentColor: "#FBE3A1",
};

export async function getThemeSettings() {
  const rows = await db.setting.findMany({
    where: { key: { in: ["theme.primaryColor", "theme.secondaryColor", "theme.accentColor"] } },
  });
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    primaryColor: map["theme.primaryColor"] || DEFAULT_THEME.primaryColor,
    secondaryColor: map["theme.secondaryColor"] || DEFAULT_THEME.secondaryColor,
    accentColor: map["theme.accentColor"] || DEFAULT_THEME.accentColor,
  };
}

export async function getTicketSettings() {
  const rows = await db.setting.findMany({
    where: {
      key: {
        in: [
          "business.name",
          "business.address",
          "business.phone",
          "print.ticketHeader",
          "print.ticketFooter",
          "print.paperWidth",
          "print.copies",
        ],
      },
    },
  });
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    businessName: map["business.name"] || "Pizzería Sergio",
    address: map["business.address"] || "",
    phone: map["business.phone"] || "",
    ticketHeader: map["print.ticketHeader"] || "",
    ticketFooter: map["print.ticketFooter"] || "¡Gracias por tu compra!",
    paperWidth: map["print.paperWidth"] || "80mm",
    copies: Number(map["print.copies"]) || 2,
  };
}

export async function getSettingsPageData() {
  const [settings, paymentMethods, categories, promotions] = await Promise.all([
    db.setting.findMany(),
    db.paymentMethodConfig.findMany({ orderBy: { order: "asc" } }),
    db.category.findMany({ orderBy: { order: "asc" } }),
    db.promotion.findMany({ orderBy: { name: "asc" } }),
  ]);

  // La clave de caja (hasheada) nunca viaja al navegador: solo se avisa si está configurada.
  const settingsMap = Object.fromEntries(
    settings.filter((s) => s.key !== CASH_PIN_SETTING_KEY).map((s) => [s.key, s.value])
  );
  const hasCashPin = settings.some((s) => s.key === CASH_PIN_SETTING_KEY && s.value !== "");

  return { settingsMap, hasCashPin, paymentMethods, categories, promotions };
}
