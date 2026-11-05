"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export type FlavorCounts = Record<string, number>;

export function countsFromIds(ids: string[]): FlavorCounts {
  const counts: FlavorCounts = {};
  for (const id of ids) counts[id] = (counts[id] ?? 0) + 1;
  return counts;
}

export function idsFromCounts(counts: FlavorCounts): string[] {
  return Object.entries(counts).flatMap(([id, count]) => Array<string>(count).fill(id));
}

/** Filas con − y + para elegir cuántas unidades lleva cada gusto. */
export function FlavorCounter({
  flavors,
  counts,
  onChange,
  limit,
  maxDistinct,
}: {
  flavors: { id: string; name: string }[];
  counts: FlavorCounts;
  onChange: (counts: FlavorCounts) => void;
  /** Unidades en total (ej. 12 en una docena). */
  limit: number;
  /** Gustos distintos como máximo. */
  maxDistinct: number;
}) {
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
  const distinct = Object.keys(counts).length;

  function changeCount(id: string, delta: number) {
    const { [id]: current = 0, ...others } = counts;
    const next = current + delta;
    onChange(next > 0 ? { ...counts, [id]: next } : others);
  }

  return (
    <div className="flex flex-col gap-2">
      {flavors.map((flavor) => {
        const count = counts[flavor.id] ?? 0;
        return (
          <div key={flavor.id} className="flex items-center gap-2">
            <span className={cn("min-w-0 flex-1 text-sm", count > 0 && "font-semibold")}>{flavor.name}</span>
            <button
              type="button"
              disabled={count === 0}
              onClick={() => changeCount(flavor.id, -1)}
              aria-label={`Quitar ${flavor.name}`}
              className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border transition-colors hover:border-primary disabled:opacity-40"
            >
              <Minus className="size-4" />
            </button>
            <span className="w-6 text-center text-sm font-semibold tabular-nums">{count}</span>
            <button
              type="button"
              disabled={total >= limit || (count === 0 && distinct >= maxDistinct)}
              onClick={() => changeCount(flavor.id, 1)}
              aria-label={`Agregar ${flavor.name}`}
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-white transition-colors hover:brightness-110 disabled:opacity-40"
            >
              <Plus className="size-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
