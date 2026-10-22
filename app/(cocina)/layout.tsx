import { requirePermission } from "@/lib/auth-helpers";
import { DARK_SCREEN_THEME } from "@/lib/dark-screen-theme";

// Pantalla de Cocina: fuera del panel (sin sidebar), pensada para quedar abierta en una
// pantalla/TV de la cocina.
export default async function CocinaLayout({ children }: { children: React.ReactNode }) {
  await requirePermission("orders.manage");

  return (
    <div className="dark flex min-h-screen flex-col bg-background text-foreground" style={DARK_SCREEN_THEME}>
      {children}
    </div>
  );
}
