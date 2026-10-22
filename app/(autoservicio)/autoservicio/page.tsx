import { ShoppingBag } from "lucide-react";
import { getSalesPageData } from "@/lib/queries/sales";
import { db } from "@/lib/db";
import { AutoservicioClient } from "@/components/autoservicio/autoservicio-client";

export const dynamic = "force-dynamic";

const SETTING_KEYS = [
  "autoservicio.waitMinutes",
  "autoservicio.enabled",
  "autoservicio.coverUrl",
  "business.name",
  "business.address",
  "business.phone",
];

export default async function AutoservicioPage() {
  const [{ products, flavors }, autoservicioSettings] = await Promise.all([
    getSalesPageData(),
    db.setting.findMany({ where: { key: { in: SETTING_KEYS } } }),
  ]);
  const settingsMap = Object.fromEntries(autoservicioSettings.map((s) => [s.key, s.value]));
  const waitMinutes = Number(settingsMap["autoservicio.waitMinutes"]) || 0;
  const enabled = settingsMap["autoservicio.enabled"] !== "false";
  const businessName = settingsMap["business.name"] || "Pizzería Sergio";

  if (!enabled) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="flex max-w-sm flex-col items-center gap-3 text-center">
          <div className="mb-2 size-28 overflow-hidden rounded-full bg-white p-2 ring-4 ring-primary">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo2.png" alt={businessName} className="size-full object-contain" />
          </div>
          <ShoppingBag className="size-10 text-muted-foreground" strokeWidth={1.5} />
          <h1 className="text-xl font-semibold">Ahora no estamos tomando pedidos</h1>
          <p className="text-sm text-muted-foreground">
            En este momento no estamos recibiendo pedidos por acá. Podés acercarte al local o volver a
            intentar más tarde.
          </p>
        </div>
      </div>
    );
  }

  return (
    <AutoservicioClient
      waitMinutes={waitMinutes}
      business={{
        name: businessName,
        address: settingsMap["business.address"] ?? "",
        phone: settingsMap["business.phone"] ?? "",
        coverUrl: settingsMap["autoservicio.coverUrl"] ?? "",
      }}
      products={products.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        imageUrl: p.imageUrl,
        price: p.price,
        cost: p.cost,
        active: p.active,
        categoryId: p.categoryId,
        categoryName: p.category.name,
        allowsFlavors: p.allowsFlavors,
        maxFlavors: p.maxFlavors,
      }))}
      flavors={flavors.map((f) => ({ id: f.id, name: f.name, popular: f.popular, imageUrl: f.imageUrl }))}
    />
  );
}
