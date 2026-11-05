"use client";

import { useRef } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ean13Modules } from "@/lib/barcode";

const QUIET_ZONE = 9;
const BAR_HEIGHT = 50;

export function BarcodeLabel({ code, name }: { code: string; name: string }) {
  const labelRef = useRef<HTMLDivElement>(null);
  const modules = ean13Modules(code);

  function handlePrint() {
    const win = window.open("", "_blank", "width=400,height=300");
    if (!win || !labelRef.current) return;
    const title = document.createElement("title");
    title.textContent = `Etiqueta ${code}`;
    win.document.head.append(title);
    win.document.body.style.cssText = "margin:0;font-family:Arial,sans-serif;text-align:center;color:#000";
    if (name.trim()) {
      const heading = win.document.createElement("p");
      heading.style.cssText = "margin:0 0 2px;font-size:11px";
      heading.textContent = name.trim();
      win.document.body.append(heading);
    }
    win.document.body.append(win.document.importNode(labelRef.current, true));
    win.print();
    win.close();
  }

  return (
    <div className="flex items-center gap-3">
      <div ref={labelRef} style={{ width: "40mm", background: "#fff", color: "#000", textAlign: "center" }}>
        <svg
          viewBox={`0 0 ${modules.length + QUIET_ZONE * 2} ${BAR_HEIGHT}`}
          width="100%"
          shapeRendering="crispEdges"
          role="img"
          aria-label={`Código de barras ${code}`}
          style={{ display: "block" }}
        >
          {[...modules].map((bit, i) =>
            bit === "1" ? <rect key={i} x={i + QUIET_ZONE} y={0} width={1} height={BAR_HEIGHT} fill="#000" /> : null
          )}
        </svg>
        <span style={{ fontSize: "11px", letterSpacing: "1px" }}>{code}</span>
      </div>
      <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={handlePrint}>
        <Printer className="size-4" />
        Imprimir etiqueta
      </Button>
    </div>
  );
}
