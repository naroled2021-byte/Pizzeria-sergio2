import { DARK_SCREEN_THEME } from "@/lib/dark-screen-theme";

export function AutoservicioShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="dark flex min-h-screen flex-col bg-background text-foreground" style={DARK_SCREEN_THEME}>
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col">{children}</main>
    </div>
  );
}
