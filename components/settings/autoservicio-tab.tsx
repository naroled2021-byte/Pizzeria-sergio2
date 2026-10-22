"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ImageUploadField } from "@/components/ui/image-upload";
import { updateAutoservicioSettings } from "@/lib/actions/settings-actions";

export function AutoservicioTab({ settingsMap }: { settingsMap: Record<string, string> }) {
  const [waitMinutes, setWaitMinutes] = useState(settingsMap["autoservicio.waitMinutes"] ?? "");
  const [enabled, setEnabled] = useState(settingsMap["autoservicio.enabled"] !== "false");
  const [mpAlias, setMpAlias] = useState(settingsMap["autoservicio.mpAlias"] ?? "");
  const [mpHolder, setMpHolder] = useState(settingsMap["autoservicio.mpHolder"] ?? "");
  const [coverUrl, setCoverUrl] = useState(settingsMap["autoservicio.coverUrl"] ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await updateAutoservicioSettings({
        waitMinutes: waitMinutes as never,
        enabled,
        mpAlias,
        mpHolder,
        coverUrl,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      toast.success("Configuración de Autoservicio actualizada");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-sm flex-col gap-4">
      <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5">
        <div>
          <p className="text-sm font-medium">Autoservicio activo</p>
          <p className="text-xs text-muted-foreground">
            Si lo apagás, la página pública de Autoservicio muestra un aviso de que está cerrado y no deja
            hacer pedidos. Mostrador y Ventas siguen funcionando igual.
          </p>
        </div>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
      </div>

      <p className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
        Se muestra en la pantalla de confirmación de Autoservicio: &quot;Tu pedido va a estar listo en
        aproximadamente X minutos&quot;. Dejalo en 0 para no mostrar ningún tiempo estimado.
      </p>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="waitMinutes">Demora estimada (minutos)</Label>
        <Input
          id="waitMinutes"
          type="number"
          min={0}
          max={180}
          value={waitMinutes}
          onChange={(e) => setWaitMinutes(e.target.value)}
          placeholder="Ej: 15"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Foto de portada</Label>
        <p className="text-xs text-muted-foreground">
          La imagen grande de arriba de la carta. Mejor si es horizontal (por ejemplo, una pizza).
        </p>
        <ImageUploadField value={coverUrl} onChange={setCoverUrl} />
      </div>

      <div className="flex flex-col gap-3 rounded-lg border px-3 py-3">
        <div>
          <p className="text-sm font-medium">Transferencia por Mercado Pago</p>
          <p className="text-xs text-muted-foreground">
            Solo la ven los clientes habilitados desde Clientes (por teléfono). Si dejás el alias vacío, la
            opción no aparece para nadie.
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="mpAlias">Alias o CVU</Label>
          <Input
            id="mpAlias"
            value={mpAlias}
            onChange={(e) => setMpAlias(e.target.value)}
            placeholder="Ej: pizzeria.sergio.mp"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="mpHolder">Titular de la cuenta</Label>
          <Input
            id="mpHolder"
            value={mpHolder}
            onChange={(e) => setMpHolder(e.target.value)}
            placeholder="Ej: Sergio Pérez"
          />
        </div>
      </div>

      {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={isPending} className="self-start">
        {isPending && <Loader2 className="size-4 animate-spin" />}
        Guardar
      </Button>
    </form>
  );
}
