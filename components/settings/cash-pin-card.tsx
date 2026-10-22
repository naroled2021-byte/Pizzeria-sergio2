"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateCashPin } from "@/lib/actions/settings-actions";

export function CashPinCard({ hasCashPin }: { hasCashPin: boolean }) {
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
      toast.success(hasCashPin ? "PIN de caja cambiado" : "PIN de caja creado");
      setPin("");
      setConfirmPin("");
      router.refresh();
    });
  }


  return (
    <form onSubmit={handleSubmit} className="mt-8 flex max-w-lg flex-col gap-4 rounded-2xl border p-4">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <KeyRound className="size-5" />
        </div>
        <div>
          <p className="font-medium">PIN de caja</p>
          <p className="text-sm text-muted-foreground">
            Se pide siempre para abrir la caja, sea quien sea el que la abre. De 4 a 8 números, se escribe oculto.
          </p>
          <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium">
            {hasCashPin ? (
              <>
                <ShieldCheck className="size-3.5 text-emerald-600" />
                <span className="text-emerald-700 dark:text-emerald-400">PIN creado</span>
              </>
            ) : (
              <span className="text-amber-700 dark:text-amber-400">
                Sin PIN: la caja no se puede abrir hasta que lo crees.
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cashPin">{hasCashPin ? "PIN nuevo" : "PIN"}</Label>
          <Input
            id="cashPin"
            type="password"
            inputMode="numeric"
            autoComplete="new-password"
            maxLength={8}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cashPinConfirm">Repetir PIN</Label>
          <Input
            id="cashPinConfirm"
            type="password"
            inputMode="numeric"
            autoComplete="new-password"
            maxLength={8}
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
          />
        </div>
      </div>

      {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={isPending || pin.length < 4}>
          {isPending && <Loader2 className="size-4 animate-spin" />}
          {hasCashPin ? "Cambiar PIN" : "Crear PIN"}
        </Button>
      </div>
    </form>
  );
}
