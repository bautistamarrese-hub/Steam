import { Link } from "@tanstack/react-router";
import { Gamepad2, LogOut, Wallet, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatPrecio } from "@/lib/api";
import { useSesion } from "@/lib/sesion";

const LINKS_CLIENTE = [
  { to: "/", label: "Tienda" },
  { to: "/biblioteca", label: "Biblioteca" },
  { to: "/wishlist", label: "Wishlist" },
  { to: "/top", label: "Top" },
  { to: "/amigos", label: "Amigos" },
  { to: "/perfil", label: "Perfil" },
] as const;

const LINKS_ADMIN = [
  { to: "/", label: "Tienda" },
  { to: "/desarrolladores", label: "Panel dev" },
  { to: "/top", label: "Top" },
  { to: "/amigos", label: "Comunidad" },
  { to: "/perfil", label: "Perfil" },
] as const;

export function SiteHeader() {
  const { usuario, esAdmin, logout } = useSesion();
  if (!usuario) return null;
  const links = esAdmin ? LINKS_ADMIN : LINKS_CLIENTE;

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-sidebar/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4">
        <Link to="/" className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <Gamepad2 className="h-6 w-6 text-primary" />
          <span>Steamn&apos;t</span>
        </Link>
        <nav className="hidden flex-1 items-center gap-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              activeOptions={{ exact: l.to === "/" }}
              className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              activeProps={{ className: "bg-secondary text-foreground" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3 md:ml-0">
          {esAdmin ? (
            <Badge variant="secondary" className="gap-1">
              <Wrench className="h-3.5 w-3.5" /> Desarrollador
            </Badge>
          ) : (
            <Link
              to="/perfil"
              className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-sm"
            >
              <Wallet className="h-4 w-4 text-accent" />
              <span className="font-semibold">{formatPrecio(usuario.saldo)}</span>
            </Link>
          )}
          <span className="hidden text-sm text-muted-foreground sm:inline">{usuario.nickname}</span>
          <button
            onClick={logout}
            aria-label="Cerrar sesión"
            className="rounded-md border border-border p-2 text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
      <nav className="flex gap-1 overflow-x-auto border-t border-border px-4 py-2 md:hidden">
        {links.map((l) => (
          <Link
            key={l.to}
            to={l.to}
            activeOptions={{ exact: l.to === "/" }}
            className="whitespace-nowrap rounded-md px-3 py-1 text-sm text-muted-foreground"
            activeProps={{ className: "bg-secondary text-foreground" }}
          >
            {l.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
