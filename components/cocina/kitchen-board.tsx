"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bell,
  BellOff,
  Bike,
  CalendarClock,
  Check,
  ChefHat,
  Clock,
  Loader2,
  Maximize,
  MessageSquareText,
  Store,
  UtensilsCrossed,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatOrderNumber } from "@/lib/format";
import { playNotificationSound } from "@/lib/notification-sound";
import { ORDER_CHANNEL, ORDER_CHANNEL_LABEL, ORDER_STATUS, ORDER_TYPE } from "@/lib/constants";
import { updateOrderStatus } from "@/lib/actions/order-actions";

export type KitchenOrder = {
  id: string;
  channel: string;
  channelNumber: number;
  type: string;
  tableNumber: string | null;
  createdAt: string;
  /** Delivery programado: a qué hora lo quiere el cliente (null = lo antes posible). */
  scheduledFor: string | null;
  customerName: string | null;
  notes: string | null;
  items: { id: string; productName: string; quantity: number; flavorNames: string[] }[];
};

// Preferencia de esta pantalla, no del negocio: por eso va en localStorage.
const SOUND_SETTING_KEY = "cocina.sound";
const REFRESH_MS = 5000;

const TYPE_INFO: Record<string, { label: string; icon: typeof Bike }> = {
  [ORDER_TYPE.DELIVERY]: { label: "Delivery", icon: Bike },
  [ORDER_TYPE.TAKEAWAY]: { label: "Retira", icon: Store },
  [ORDER_TYPE.DINE_IN]: { label: "Mesa", icon: UtensilsCrossed },
};

const timeAR = new Intl.DateTimeFormat("es-AR", {
  timeZone: "America/Argentina/Buenos_Aires",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/**
 * Las notas del pedido mezclan el dato de pago ("Paga con $...", "Paga por transferencia..."),
 * el horario programado ("PROGRAMADO: ...", que acá se muestra aparte) y las observaciones del
 * cliente ("Obs: ..."). En cocina solo interesan las observaciones.
 */
function kitchenNotes(notes: string | null) {
  if (!notes) return null;
  const lines = notes
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("Paga con") && !l.startsWith("Paga por") && !l.startsWith("PROGRAMADO"))
    .map((l) => l.replace(/^Obs:\s*/, ""));
  return lines.length ? lines.join(" · ") : null;
}

function minutesSince(iso: string, now: number) {
  return Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000));
}

export function KitchenBoard({ orders }: { orders: KitchenOrder[] }) {
  const router = useRouter();
  const knownIds = useRef<Set<string> | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [soundEnabled, setSoundEnabled] = useState(() => {
    if (typeof window === "undefined") return true;
    try {
      return localStorage.getItem(SOUND_SETTING_KEY) !== "0";
    } catch {
      return true;
    }
  });

  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh();
      setNow(Date.now());
    }, REFRESH_MS);
    return () => clearInterval(interval);
  }, [router]);

  // Suena cuando entra un pedido nuevo a preparación (no en la primera carga de la pantalla).
  useEffect(() => {
    const currentIds = new Set(orders.map((o) => o.id));
    if (knownIds.current && soundEnabled && orders.some((o) => !knownIds.current!.has(o.id))) {
      playNotificationSound();
    }
    knownIds.current = currentIds;
  }, [orders, soundEnabled]);

  function toggleSound() {
    setSoundEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SOUND_SETTING_KEY, next ? "1" : "0");
      } catch {
        // noop
      }
      return next;
    });
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.().catch(() => {});
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur sm:px-6">
        <Button variant="ghost" size="icon" nativeButton={false} render={<Link href="/admin/pedidos" />} aria-label="Volver al panel">
          <ArrowLeft className="size-5" />
        </Button>
        <div className="size-10 shrink-0 overflow-hidden rounded-full bg-white p-0.5 ring-2 ring-primary">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo2.png" alt="" className="size-full object-contain" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="flex items-center gap-2 text-xl font-bold leading-tight sm:text-2xl">
            Cocina
            <span className="rounded-full bg-primary px-2.5 py-0.5 text-sm font-semibold text-white tabular-nums">
              {orders.length}
            </span>
          </h1>
          <p className="text-xs text-muted-foreground sm:text-sm">En preparación · se actualiza solo</p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={toggleSound}>
          {soundEnabled ? <Bell className="size-4" /> : <BellOff className="size-4" />}
          <span className="hidden sm:inline">{soundEnabled ? "Sonido activado" : "Sonido silenciado"}</span>
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={toggleFullscreen}>
          <Maximize className="size-4" />
          <span className="hidden sm:inline">Pantalla completa</span>
        </Button>
      </header>

      {orders.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-20 text-center text-muted-foreground">
          <ChefHat className="size-16" strokeWidth={1.25} />
          <p className="text-xl font-medium text-foreground">No hay pedidos en preparación</p>
          <p className="text-sm">Cuando un pedido pase a &quot;En preparación&quot; en Pedidos, aparece acá.</p>
        </div>
      ) : (
        <main className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:p-6 xl:grid-cols-3 2xl:grid-cols-4">
          {orders.map((order) => (
            <KitchenTicket key={order.id} order={order} now={now} />
          ))}
        </main>
      )}
    </div>
  );
}

function KitchenTicket({ order, now }: { order: KitchenOrder; now: number }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const minutes = minutesSince(order.createdAt, now);

  // "Listo": pasa el pedido a "Listo para entregar" (sale de la cocina).
  function markReady() {
    startTransition(async () => {
      const res = await updateOrderStatus(order.id, ORDER_STATUS.READY);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`Pedido #${formatOrderNumber(order.channel, order.channelNumber)} listo`);
      router.refresh();
    });
  }
  const type = TYPE_INFO[order.type];
  const notes = kitchenNotes(order.notes);
  const isSelfService = order.channel === ORDER_CHANNEL.SELF_SERVICE;
  // Colores de demora: normal, se está atrasando (+20 min) y atrasado (+30 min).
  const delayClass =
    minutes >= 30
      ? "bg-red-500/20 text-red-300 ring-red-500/50"
      : minutes >= 20
        ? "bg-amber-500/20 text-amber-200 ring-amber-500/50"
        : "bg-white/10 text-foreground ring-white/10";

  return (
    <article
      className={cn(
        "flex flex-col overflow-hidden rounded-3xl bg-card shadow-lg shadow-black/30 ring-1",
        minutes >= 30 ? "ring-red-500/60" : "ring-white/5"
      )}
    >
      <div className={cn("flex items-start justify-between gap-3 px-5 pt-4 pb-3", isSelfService ? "bg-orange-500/10" : "bg-blue-500/10")}>
        <div className="min-w-0">
          <p className="text-4xl font-bold leading-none tabular-nums">
            #{formatOrderNumber(order.channel, order.channelNumber)}
          </p>
          <p className={cn("mt-2 text-xs font-semibold uppercase tracking-wide", isSelfService ? "text-orange-300" : "text-blue-300")}>
            {ORDER_CHANNEL_LABEL[order.channel] ?? order.channel}
          </p>
        </div>
        <span
          className={cn("flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-base font-bold tabular-nums ring-1", delayClass)}
          suppressHydrationWarning
        >
          <Clock className="size-4" />
          {minutes} min
        </span>
      </div>

      {order.scheduledFor && (
        <div className="mx-4 mt-3 flex items-center gap-2 rounded-2xl bg-violet-500/20 px-3 py-2 text-violet-100 ring-1 ring-violet-400/40">
          <CalendarClock className="size-5 shrink-0 text-violet-300" />
          <span className="text-sm font-medium">Programado · para las</span>
          <span className="text-xl font-bold tabular-nums">{timeAR.format(new Date(order.scheduledFor))}</span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 px-5 pt-3 text-sm">
        {type && (
          <span className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 font-medium">
            <type.icon className="size-4" />
            {type.label}
            {order.type === ORDER_TYPE.DINE_IN && order.tableNumber && ` ${order.tableNumber}`}
          </span>
        )}
        {order.customerName && <span className="truncate text-muted-foreground">{order.customerName}</span>}
      </div>

      <ul className="flex flex-1 flex-col gap-2.5 px-5 py-4">
        {order.items.map((item) => (
          <li key={item.id} className="flex gap-3">
            <span className="min-w-9 text-2xl font-bold leading-tight text-[#ff5a5f] tabular-nums">{item.quantity}×</span>
            <div className="min-w-0">
              <p className="text-xl font-semibold leading-tight">{item.productName}</p>
              {item.flavorNames.length > 0 && (
                <p className="mt-0.5 text-base text-muted-foreground">{item.flavorNames.join(" · ")}</p>
              )}
            </div>
          </li>
        ))}
      </ul>

      {notes && (
        <p className="mx-4 mb-4 flex items-start gap-2 rounded-2xl bg-amber-400/15 px-3 py-2.5 text-base text-amber-100">
          <MessageSquareText className="mt-0.5 size-5 shrink-0 text-amber-300" />
          {notes}
        </p>
      )}

      <div className="mt-auto flex items-center gap-3 border-t border-white/5 px-4 py-3">
        <Button
          size="lg"
          className="ml-auto h-12 gap-2 rounded-2xl bg-[#22c55e] px-6 text-lg font-bold text-white hover:bg-[#16a34a]"
          disabled={isPending}
          onClick={markReady}
        >
          {isPending ? <Loader2 className="size-5 animate-spin" /> : <Check className="size-5" />}
          Listo
        </Button>
      </div>
    </article>
  );
}
