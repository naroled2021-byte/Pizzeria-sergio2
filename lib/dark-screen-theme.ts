import type { CSSProperties } from "react";

// Pantallas de pantalla completa (Autoservicio, Cocina): siempre en modo oscuro, con grises
// neutros (no los marrones del panel) para que el rojo de la marca resalte, sin importar el
// tema elegido en el panel. Se aplica junto con la clase "dark" en el contenedor.
export const DARK_SCREEN_THEME = {
  "--background": "#121212",
  "--foreground": "#f5f5f5",
  "--card": "#1c1c1e",
  "--card-foreground": "#f5f5f5",
  "--popover": "#1c1c1e",
  "--popover-foreground": "#f5f5f5",
  "--primary-foreground": "#ffffff",
  "--muted": "#26262a",
  "--muted-foreground": "#a1a1aa",
  "--border": "rgba(255, 255, 255, 0.1)",
  "--input": "rgba(255, 255, 255, 0.16)",
} as CSSProperties;
