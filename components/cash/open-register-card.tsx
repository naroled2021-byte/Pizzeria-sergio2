"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2, Lock, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { openCashRegister } from "@/lib/actions/cash-actions";
import { updateCashPin } from "@/lib/actions/settings-actions";
import { PAYMENT_METHOD } from "@/lib/constants";
import type { CashPaymentMethod } from "@/components/cash/types";

// El PIN se escribe oculto (puntos), solo números.
function PinInput({
  id,
  value,
  onChange,
  autoFocus,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
}) {
  return (
    <Input
      id={id}
      type="password"
      inputMode="numeric"
      autoComplete="off"
      maxLength={8}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
      className="h-11 text-center text-xl tracking-[0.5em]"
      autoFocus={autoFocus}
      required
    />
  );
}

export function OpenRegisterCard({
  paymentMethods,
  isAdmin,
  requiresPin,
}: {
  paymentMethods: CashPaymentMethod[];
  isAdmin: boolean;
  /** Hay PIN de caja creado. Sin PIN la caja no se puede abrir: el admin lo crea acá mismo. */
  requiresPin: boolean;
}) {
  const header = (
    <CardHeader className="items-center text-center gap-2">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/12 text-primary">
        <Wallet className="size-6" strokeWidth={1.75} />
      </div>
      <CardTitle>La caja está cerrada</CardTitle>
      <p className="text-sm text-muted-foreground">
        {requiresPin
          ? "Abrí la caja con el PIN para empezar a registrar movimientos."
          : "Para abrir la caja primero hay que crear el PIN de caja."}
      </p>
    </CardHeader>
  );

  return (
    <Card className="mx-auto w-full max-w-sm border-none shadow-sm">
      {header}
      <CardContent>
        {requiresPin ? (
          <OpenForm paymentMethods={paymentMethods} />
        ) : isAdmin ? (
          <CreatePinForm />
        ) : (
          <p className="flex items-start gap-2 rounded-xl bg-muted px-3 py-3 text-sm text-muted-foreground">
            <Lock className="mt-0.5 size-4 shrink-0" />
            Pedile a un administrador que cree el PIN de caja en Configuración &gt; General.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function OpenForm({ paymentMethods }: { paymentMethods: CashPaymentMethod[] }) {
  const router = useRouter();
  const [amounts, setAmounts] = useState<Record<string, string>>(() =>
    Object.fromEntries(paymentMethods.map((m) => [m.key, m.key === PAYMENT_METHOD.CASH ? "20000" : "0"]))
  );
  const [notes, setNotes] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const openingAmounts = Object.fromEntries(
        Object.entries(amounts).map(([key, value]) => [key, Number(value) || 0])
      );
      const res = await openCashRegister({ openingAmounts, notes, pin });
      if (!res.ok) {
        setError(res.error);
        setPin("");
        return;
      }
      toast.success("Caja abierta");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        {paymentMethods.map((m) => (
          <div key={m.key} className="flex flex-col gap-1.5">
            <Label htmlFor={`amount-${m.key}`}>{m.label} inicial</Label>
            <Input
              id={`amount-${m.key}`}
              type="number"
              min="0"
              step="0.01"
              value={amounts[m.key] ?? "0"}
              onChange={(e) => setAmounts((prev) => ({ ...prev, [m.key]: e.target.value }))}
              required
            />
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notes">Notas (opcional)</Label>
        <Textarea id="notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      <div className="flex flex-col gap-1.5 rounded-xl border border-dashed p-3">
        <Label htmlFor="cashPin" className="flex items-center gap-1.5">
          <KeyRound className="size-4 text-primary" />
          PIN de caja
        </Label>
        <PinInput id="cashPin" value={pin} onChange={setPin} autoFocus />
      </div>

      {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      <Button type="submit" size="lg" disabled={isPending || pin.length < 4}>
        {isPending && <Loader2 className="size-4 animate-spin" />}
        Abrir caja
      </Button>
    </form>
  );
}

function CreatePinForm() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (pin !== confirmPin) {
      setError("Los dos PIN no coinciden");
      return;
    }
    startTransition(async () => {
      const res = await updateCashPin(pin);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      toast.success("PIN de caja creado");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <p className="text-xs text-muted-foreground">
        Elegí un PIN de 4 a 8 números. Se va a pedir siempre para abrir la caja. Lo podés cambiar después en
        Configuración &gt; General.
      </p>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="newCashPin">PIN nuevo</Label>
        <PinInput id="newCashPin" value={pin} onChange={setPin} autoFocus />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="newCashPinConfirm">Repetir PIN</Label>
        <PinInput id="newCashPinConfirm" value={confirmPin} onChange={setConfirmPin} />
      </div>
      {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      <Button type="submit" size="lg" disabled={isPending || pin.length < 4}>
        {isPending && <Loader2 className="size-4 animate-spin" />}
        Crear PIN
      </Button>
    </form>
  );
}
