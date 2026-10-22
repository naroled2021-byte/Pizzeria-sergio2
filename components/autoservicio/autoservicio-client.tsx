"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  Banknote,
  Bike,
  CalendarClock,
  CheckCircle2,
  Clock,
  Copy,
  Loader2,
  MapPin,
  Minus,
  Phone,
  Plus,
  Share2,
  ShoppingBag,
  Store,
  Trash2,
  Wallet,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MenuAccordion } from "@/components/autoservicio/menu-accordion";
import { InstagramIcon, WhatsAppIcon } from "@/components/autoservicio/brand-icons";
import { PizzaIllustration } from "@/components/autoservicio/pizza-illustration";
import { createSelfServiceOrder, getMercadoPagoTransferInfo } from "@/lib/actions/self-service-actions";
import { currency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { BUSINESS_LINKS } from "@/lib/business-links";
import { SELF_SERVICE_DELIVERY_FEE } from "@/lib/constants";
import type { CartLine, SaleFlavor } from "@/components/sales/types";
import type { ProductRow } from "@/components/products/types";

const MENU_CATEGORY_NAMES = ["Pizzas", "Empanadas", "Parrilla", "Bebidas"];

const ORDER_TYPE_OPTIONS = [
  { value: "DELIVERY", label: "Delivery", icon: Bike },
  { value: "TAKEAWAY", label: "Retiro en local", icon: Store },
] as const;

const DELIVERY_TIMING_OPTIONS = [
  { value: "ASAP", label: "Lo antes posible", icon: Zap },
  { value: "SCHEDULED", label: "Programar", icon: CalendarClock },
] as const;

export type AutoservicioBusiness = {
  name: string;
  address: string;
  phone: string;
  coverUrl: string;
};

type MercadoPagoInfo = { alias: string; holder: string };

const whatsappUrl = `https://wa.me/${BUSINESS_LINKS.whatsappNumber}`;
const instagramUrl = `https://instagram.com/${BUSINESS_LINKS.instagramUser}`;

function mapsUrl(address: string) {
  const query = [address, BUSINESS_LINKS.mapsSuffix].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function MercadoPagoTransferBox({ info, total }: { info: MercadoPagoInfo; total: number }) {
  async function copyAlias() {
    try {
      await navigator.clipboard.writeText(info.alias);
      toast.success("Alias copiado");
    } catch {
      toast.error("No se pudo copiar, anotalo a mano");
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-sky-400/30 bg-sky-400/10 px-3 py-2.5 text-left text-xs text-sky-100">
      <p>
        Transferí <strong className="text-white">{currency.format(total)}</strong> desde Mercado Pago (o cualquier
        banco) a:
      </p>
      <div className="flex items-center justify-between gap-2 rounded-xl bg-black/30 px-3 py-2">
        <div className="min-w-0">
          <p className="truncate font-mono text-sm font-semibold text-white">{info.alias}</p>
          {info.holder && <p className="truncate text-[11px] text-sky-100/70">Titular: {info.holder}</p>}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={copyAlias}>
          <Copy className="size-3.5" />
          Copiar
        </Button>
      </div>
      <p className="text-sky-100/80">Antes de preparar tu pedido verificamos que la transferencia haya llegado.</p>
    </div>
  );
}

function ActionCircle({
  href,
  onClick,
  label,
  highlight,
  children,
}: {
  href?: string;
  onClick?: () => void;
  label: string;
  highlight?: boolean;
  children: React.ReactNode;
}) {
  const circle = (
    <>
      <span
        className={cn(
          "flex size-14 items-center justify-center rounded-full border-2 transition-colors group-hover:border-primary sm:size-16",
          highlight ? "border-primary" : "border-white/15"
        )}
      >
        {children}
      </span>
      <span className="line-clamp-2 text-center text-xs leading-tight text-muted-foreground">{label}</span>
    </>
  );
  const className = "group flex flex-col items-center gap-2";

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {circle}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {circle}
    </button>
  );
}

function ChoiceButtons<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  options: readonly { value: T; label: string; icon: React.ComponentType<{ className?: string }> }[];
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            "flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors",
            value === option.value ? "border-primary bg-primary text-white" : "bg-card hover:bg-muted"
          )}
        >
          <option.icon className="size-4" />
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function AutoservicioClient({
  products,
  flavors,
  waitMinutes,
  business,
}: {
  products: ProductRow[];
  flavors: SaleFlavor[];
  waitMinutes: number;
  business: AutoservicioBusiness;
}) {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [confirmed, setConfirmed] = useState<{
    displayNumber: string;
    total: number;
    mercadoPago: MercadoPagoInfo | null;
    scheduledTime: string | null;
  } | null>(null);

  const menuCategories = useMemo(
    () =>
      MENU_CATEGORY_NAMES.map((name) => ({
        name,
        products: products.filter((p) => p.categoryName === name),
      })).filter((c) => c.products.length > 0),
    [products]
  );
  const [orderType, setOrderType] = useState<"DELIVERY" | "TAKEAWAY">("DELIVERY");
  const [deliveryTiming, setDeliveryTiming] = useState<"ASAP" | "SCHEDULED">("ASAP");
  const [scheduledTime, setScheduledTime] = useState("");
  const isScheduled = orderType === "DELIVERY" && deliveryTiming === "SCHEDULED";
  const [addressStreet, setAddressStreet] = useState("");
  const [addressNumber, setAddressNumber] = useState("");
  const [addressReference, setAddressReference] = useState("");
  const deliveryAddress = [
    [addressStreet.trim(), addressNumber.trim()].filter(Boolean).join(" "),
    addressReference.trim(),
  ]
    .filter(Boolean)
    .join(" - ");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [observations, setObservations] = useState("");
  const [cashTendered, setCashTendered] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "MERCADOPAGO">("CASH");
  // Datos para transferir: solo llegan si el teléfono es de un cliente habilitado en Clientes.
  const [mpInfo, setMpInfo] = useState<MercadoPagoInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // La barra flotante "Ver mi pedido" se esconde cuando el formulario del pedido ya está en pantalla.
  const checkoutRef = useRef<HTMLElement>(null);
  const [checkoutVisible, setCheckoutVisible] = useState(false);
  useEffect(() => {
    const el = checkoutRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setCheckoutVisible(entry.isIntersecting), {
      threshold: 0.05,
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [confirmed]);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      const info = customerPhone.replace(/\D/g, "").length >= 6 ? await getMercadoPagoTransferInfo(customerPhone) : null;
      if (!cancelled) setMpInfo(info);
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [customerPhone]);

  const payWithMercadoPago = paymentMethod === "MERCADOPAGO" && !!mpInfo;

  const subtotal = useMemo(
    () => cart.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0),
    [cart]
  );
  const itemCount = cart.reduce((sum, line) => sum + line.quantity, 0);
  const quantities = useMemo(() => {
    const map: Record<string, number> = {};
    for (const line of cart) map[line.productId] = (map[line.productId] ?? 0) + line.quantity;
    return map;
  }, [cart]);
  const deliveryFee = orderType === "DELIVERY" ? SELF_SERVICE_DELIVERY_FEE : 0;
  const total = subtotal + deliveryFee;

  function handleAdd(product: ProductRow, flavorIds: string[]) {
    const names = flavorIds.map((id) => flavors.find((f) => f.id === id)?.name ?? "").filter(Boolean);
    setCart((prev) => {
      // Un producto sin gustos que ya está en el pedido suma cantidad en vez de otra línea.
      const existing = flavorIds.length === 0 && prev.find((l) => l.productId === product.id && l.flavorIds.length === 0);
      if (existing) {
        return prev.map((l) => (l.key === existing.key ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [
        ...prev,
        {
          key: crypto.randomUUID(),
          productId: product.id,
          productName: product.name,
          unitPrice: product.price,
          quantity: 1,
          flavorIds,
          flavorNames: names,
        },
      ];
    });
    toast.success(`${product.name} agregado al pedido`);
  }

  function updateQuantity(key: string, delta: number) {
    setCart((prev) =>
      prev
        .map((l) => (l.key === key ? { ...l, quantity: l.quantity + delta } : l))
        .filter((l) => l.quantity > 0)
    );
  }

  function removeLine(key: string) {
    setCart((prev) => prev.filter((l) => l.key !== key));
  }

  function scrollToCheckout() {
    checkoutRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function handleShare() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: business.name, text: "Pedí en Pizzería Sergio", url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copiado");
      }
    } catch {
      // El cliente cerró el diálogo de compartir: no hay nada que avisar.
    }
  }

  function resetForm() {
    setCart([]);
    setOrderType("DELIVERY");
    setAddressStreet("");
    setAddressNumber("");
    setAddressReference("");
    setCustomerName("");
    setCustomerPhone("");
    setObservations("");
    setCashTendered("");
    setPaymentMethod("CASH");
    setDeliveryTiming("ASAP");
    setScheduledTime("");
    setConfirmed(null);
    window.scrollTo({ top: 0 });
  }

  function handleConfirmOrder() {
    setError(null);
    if (cart.length === 0) {
      setError("Agregá al menos un producto a tu pedido");
      return;
    }
    if (!customerName.trim()) {
      setError("Completá tu nombre");
      return;
    }
    if (!customerPhone.trim()) {
      setError("Completá tu teléfono");
      return;
    }
    if (orderType === "DELIVERY" && !deliveryAddress.trim()) {
      setError("Completá la dirección de entrega");
      return;
    }
    if (isScheduled && !scheduledTime) {
      setError("Elegí a qué hora querés el delivery");
      return;
    }
    if (!payWithMercadoPago && (!cashTendered || Number(cashTendered) <= 0)) {
      setError("Indicá con cuánto pagás");
      return;
    }

    startTransition(async () => {
      const res = await createSelfServiceOrder({
        customerName,
        customerPhone,
        type: orderType,
        deliveryAddress,
        scheduledTime: isScheduled ? scheduledTime : "",
        observations,
        paymentMethod: payWithMercadoPago ? "MERCADOPAGO" : "CASH",
        cashTendered: payWithMercadoPago ? undefined : (Number(cashTendered) as never),
        items: cart.map((l) => ({ productId: l.productId, quantity: l.quantity, flavorIds: l.flavorIds })),
      });

      if (!res.ok) {
        setError(res.error);
        return;
      }
      setConfirmed({
        displayNumber: res.data.displayNumber,
        total: res.data.total,
        mercadoPago: payWithMercadoPago ? mpInfo : null,
        scheduledTime: isScheduled ? scheduledTime : null,
      });
      window.scrollTo({ top: 0 });
    });
  }

  const header = (
    <header>
      <div
        className="relative h-52 overflow-hidden bg-neutral-900 bg-cover bg-center sm:h-64"
        style={business.coverUrl ? { backgroundImage: `url(${business.coverUrl})` } : undefined}
      >
        {!business.coverUrl && (
          <>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_30%,rgba(227,30,36,0.55),transparent_55%),radial-gradient(circle_at_80%_75%,rgba(255,170,0,0.22),transparent_50%)]" />
            {/* Pizza dibujada de fondo: queda dentro de la portada (detrás del logo) y se
                desvanece antes del nombre, así no tapa ningún texto. */}
            <PizzaIllustration className="absolute top-[-3.5rem] left-1/2 size-[26rem] max-w-none -translate-x-1/2 opacity-90 drop-shadow-[0_20px_40px_rgba(0,0,0,0.6)] motion-safe:animate-[spin_90s_linear_infinite] sm:top-[-4rem] sm:size-[30rem]" />
          </>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <span className="absolute top-4 right-4 flex items-center gap-1.5 rounded-full bg-[#22c55e] px-3.5 py-1.5 text-sm font-bold text-white shadow-lg">
          <Bike className="size-4" />
          Delivery sin cargo
        </span>
      </div>

      <div className="relative -mt-20 flex flex-col items-center px-4 text-center">
        <div className="size-32 overflow-hidden rounded-full bg-white p-2 ring-4 ring-primary shadow-[0_0_32px_rgba(227,30,36,0.55)] sm:size-36">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo2.png" alt={business.name} className="size-full object-contain" />
        </div>
        <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">{business.name}</h1>
        <p className="mt-1 text-base text-muted-foreground sm:text-lg">{BUSINESS_LINKS.tagline}</p>
        <p className="mt-1 text-sm font-medium text-[#ff5a5f]">{BUSINESS_LINKS.slogan}</p>
      </div>
    </header>
  );

  if (confirmed) {
    return (
      <div className="flex flex-1 flex-col pb-10">
        {header}
        <div className="mx-4 mt-8 flex flex-col items-center gap-3 rounded-3xl bg-card px-5 py-8 text-center">
          <CheckCircle2 className="size-14 text-[#22c55e]" strokeWidth={1.5} />
          <h2 className="text-xl font-semibold">¡Pedido #{confirmed.displayNumber} recibido!</h2>
          <p className="text-sm text-muted-foreground">
            Total: <span className="font-semibold text-foreground">{currency.format(confirmed.total)}</span>
            <br />
            {confirmed.mercadoPago
              ? "Pagás por transferencia de Mercado Pago."
              : `Pagás en efectivo al ${orderType === "DELIVERY" ? "recibir tu pedido" : "retirarlo"}.`}{" "}
            {confirmed.scheduledTime ? (
              <>
                <br />
                Te lo llevamos a las{" "}
                <span className="font-semibold text-foreground">{confirmed.scheduledTime} hs</span>.
              </>
            ) : (
              "Te vamos a avisar cuando esté listo."
            )}
            {waitMinutes > 0 && !confirmed.scheduledTime && (
              <>
                <br />
                Demora estimada: <span className="font-semibold text-foreground">{waitMinutes} minutos</span>.
              </>
            )}
          </p>
          {confirmed.mercadoPago && <MercadoPagoTransferBox info={confirmed.mercadoPago} total={confirmed.total} />}
          <Button className="mt-2" size="lg" onClick={resetForm}>
            Hacer otro pedido
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-1 flex-col", itemCount > 0 && "pb-24")}>
      {header}

      <nav className="mt-6 grid grid-cols-4 gap-2 border-y px-3 py-5">
        <ActionCircle href={whatsappUrl} label="WhatsApp" highlight>
          <WhatsAppIcon className="size-7 text-white" />
        </ActionCircle>
        <ActionCircle href={instagramUrl} label="Instagram">
          <InstagramIcon className="size-6 text-white" />
        </ActionCircle>
        <ActionCircle href={mapsUrl(business.address)} label={business.address.split(",")[0] || "Ubicación"}>
          <MapPin className="size-6 text-white" />
        </ActionCircle>
        <ActionCircle onClick={handleShare} label="Compartir">
          <Share2 className="size-6 text-white" />
        </ActionCircle>
      </nav>

      <div className="flex flex-col gap-6 px-4 py-6">
        {waitMinutes > 0 && (
          <div className="flex items-center justify-center gap-2 rounded-full bg-primary/15 px-4 py-2 text-sm font-medium text-[#ff8a8d]">
            <Clock className="size-4 shrink-0" />
            Demora estimada: {waitMinutes} minutos
          </div>
        )}

        <MenuAccordion categories={menuCategories} flavors={flavors} quantities={quantities} onAdd={handleAdd} />

        <section ref={checkoutRef} id="tu-pedido" className="scroll-mt-4 rounded-3xl bg-card p-4 sm:p-5">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <ShoppingBag className="size-5 text-[#ff5a5f]" />
            Tu pedido
          </h2>

          <div className="mt-4 flex flex-col gap-4">
            {cart.length === 0 ? (
              <p className="rounded-2xl border border-dashed py-6 text-center text-sm text-muted-foreground">
                Tocá el <span className="font-semibold text-foreground">+</span> de lo que quieras pedir.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {cart.map((line) => (
                  <div key={line.key} className="flex items-start justify-between gap-2 rounded-2xl bg-muted px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{line.productName}</p>
                      {line.flavorNames.length > 0 && (
                        <p className="text-xs text-muted-foreground">{line.flavorNames.join(" + ")}</p>
                      )}
                      <p className="text-xs text-muted-foreground">{currency.format(line.unitPrice)} c/u</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button variant="outline" size="icon-xs" onClick={() => updateQuantity(line.key, -1)}>
                        <Minus className="size-3" />
                      </Button>
                      <span className="w-5 text-center text-sm tabular-nums">{line.quantity}</span>
                      <Button variant="outline" size="icon-xs" onClick={() => updateQuantity(line.key, 1)}>
                        <Plus className="size-3" />
                      </Button>
                      <Button variant="ghost" size="icon-xs" onClick={() => removeLine(line.key)}>
                        <Trash2 className="size-3 text-[#ff5a5f]" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label>¿Cómo lo querés?</Label>
              <ChoiceButtons value={orderType} onChange={setOrderType} options={ORDER_TYPE_OPTIONS} />
            </div>

            {orderType === "DELIVERY" && (
              <div className="flex flex-col gap-1.5">
                <Label>¿Cuándo lo querés?</Label>
                <ChoiceButtons value={deliveryTiming} onChange={setDeliveryTiming} options={DELIVERY_TIMING_OPTIONS} />
                {deliveryTiming === "SCHEDULED" && (
                  <div className="mt-1 flex items-center gap-3 rounded-xl bg-muted px-3 py-2.5">
                    <Label htmlFor="scheduledTime" className="shrink-0 text-sm">
                      Llevalo a las
                    </Label>
                    <Input
                      id="scheduledTime"
                      type="time"
                      step={900}
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      className="h-10 w-32 text-base [color-scheme:dark]"
                    />
                    <span className="text-xs text-muted-foreground">Al menos 30 min desde ahora</span>
                  </div>
                )}
              </div>
            )}

            {orderType === "DELIVERY" && (
              <div className="flex flex-col gap-1.5">
                <Label>Dirección de entrega</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Input
                    className="col-span-2"
                    value={addressStreet}
                    onChange={(e) => setAddressStreet(e.target.value)}
                    placeholder="Calle"
                    aria-label="Calle"
                  />
                  <Input
                    value={addressNumber}
                    onChange={(e) => setAddressNumber(e.target.value)}
                    placeholder="Número"
                    aria-label="Número"
                  />
                </div>
                <Input
                  value={addressReference}
                  onChange={(e) => setAddressReference(e.target.value)}
                  placeholder="Entre calle y referencia (ej: casa rejas)"
                  aria-label="Referencia"
                />
                <p className="flex items-center gap-1.5 text-xs font-medium text-[#4ade80]">
                  <Bike className="size-3.5" />
                  El delivery es sin cargo.
                </p>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="customerName">Tu nombre</Label>
              <Input
                id="customerName"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Nombre y apellido"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="customerPhone">Tu teléfono</Label>
              <Input
                id="customerPhone"
                type="tel"
                inputMode="tel"
                required
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Ej: 11 5555 1234"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="observations">Observaciones (opcional)</Label>
              <Textarea
                id="observations"
                rows={2}
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                placeholder="Ej: bien cocida, sin aceitunas, 6 de carne y 6 de jamón y queso..."
              />
            </div>

            {mpInfo && (
              <div className="flex flex-col gap-1.5">
                <Label>¿Cómo pagás?</Label>
                <ChoiceButtons
                  value={paymentMethod}
                  onChange={setPaymentMethod}
                  options={[
                    { value: "CASH", label: "Efectivo", icon: Banknote },
                    { value: "MERCADOPAGO", label: "Mercado Pago", icon: Wallet },
                  ]}
                />
              </div>
            )}

            {payWithMercadoPago && mpInfo ? (
              <MercadoPagoTransferBox info={mpInfo} total={total} />
            ) : (
              <>
                <p className="rounded-xl bg-muted px-3 py-2 text-xs text-muted-foreground">
                  Pagás en efectivo al {orderType === "DELIVERY" ? "recibir tu pedido" : "retirarlo"}.
                </p>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="cashTendered">¿Con cuánto pagás?</Label>
                  <Input
                    id="cashTendered"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    required
                    value={cashTendered}
                    onChange={(e) => setCashTendered(e.target.value)}
                    placeholder="Ej: 20000"
                  />
                </div>
              </>
            )}

            <div className="flex flex-col gap-1 border-t pt-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{currency.format(subtotal)}</span>
              </div>
              {deliveryFee > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Envío</span>
                  <span>{currency.format(deliveryFee)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-semibold">
                <span>Total</span>
                <span>{currency.format(total)}</span>
              </div>
            </div>

            {error && (
              <p className="rounded-xl bg-destructive/15 px-3 py-2 text-sm text-[#ff8a8d]">{error}</p>
            )}

            <Button size="lg" className="h-12 rounded-2xl text-base" disabled={isPending} onClick={handleConfirmOrder}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              Confirmar pedido
            </Button>
          </div>
        </section>

        <section className="flex flex-col gap-4 rounded-3xl bg-card p-4 sm:p-5">
          {business.address && (
            <a
              href={mapsUrl(business.address)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-3 text-sm hover:underline"
            >
              <MapPin className="mt-0.5 size-5 shrink-0 text-[#ff5a5f]" />
              {business.address}
            </a>
          )}
          {business.phone && (
            <p className="flex items-start gap-3 text-sm">
              <Phone className="mt-0.5 size-5 shrink-0 text-[#ff5a5f]" />
              {business.phone}
            </p>
          )}
          <p className="flex items-start gap-3 text-sm">
            <Bike className="mt-0.5 size-5 shrink-0 text-[#ff5a5f]" />
            Delivery sin cargo
          </p>

          <div className="flex flex-col gap-2.5 pt-1">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#25D366] text-base font-semibold text-white hover:brightness-105"
            >
              <WhatsAppIcon className="size-5" />
              WhatsApp
            </a>
            <a
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#f09433] via-[#dc2743] to-[#bc1888] text-base font-semibold text-white hover:brightness-105"
            >
              <InstagramIcon className="size-5" />
              Instagram
            </a>
          </div>

          <div className="pt-2 text-center">
            <p className="text-xs font-bold tracking-[0.2em] text-muted-foreground">MÉTODOS DE PAGO</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <span className="rounded-full bg-muted px-4 py-2 text-sm">💵 Efectivo</span>
              <span className="rounded-full bg-muted px-4 py-2 text-sm">💰 Mercado Pago</span>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Mercado Pago por transferencia, para clientes habilitados.
            </p>
          </div>
        </section>
      </div>

      {itemCount > 0 && !checkoutVisible && (
        <div className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-2xl px-4 pb-4">
          <button
            type="button"
            onClick={scrollToCheckout}
            className="flex h-14 w-full items-center justify-between rounded-2xl bg-primary px-5 text-white shadow-xl shadow-black/40"
          >
            <span className="flex items-center gap-2 font-semibold">
              <ShoppingBag className="size-5" />
              Ver mi pedido
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">{itemCount}</span>
            </span>
            <span className="font-bold tabular-nums">{currency.format(total)}</span>
          </button>
        </div>
      )}
    </div>
  );
}
