import { Link, useNavigate } from "@tanstack/react-router";
import { Gamepad2, LogIn, LogOut, ShieldCheck, Wallet, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AvatarGamer } from "@/components/AvatarGamer";
import { formatSaldo } from "@/lib/api";
import { useSesion } from "@/lib/sesion";

const LINKS_CLIENTE = [
  { to: "/", label: "Tienda", requiereSesion: false },
  { to: "/biblioteca", label: "Biblioteca", requiereSesion: true },
  { to: "/wishlist", label: "Wishlist", requiereSesion: true },
  { to: "/top", label: "Top", requiereSesion: false },
  { to: "/amigos", label: "Amigos", requiereSesion: false },
  { to: "/perfil", label: "Perfil", requiereSesion: true },
] as const;

const LINKS_ADMIN = [
  { to: "/", label: "Tienda", requiereSesion: false },
  { to: "/biblioteca", label: "Biblioteca", requiereSesion: true },
  { to: "/wishlist", label: "Wishlist", requiereSesion: true },
  { to: "/desarrolladores", label: "Panel", requiereSesion: true },
  { to: "/top", label: "Top", requiereSesion: false },
  { to: "/amigos", label: "Amigos", requiereSesion: false },
  { to: "/perfil", label: "Perfil", requiereSesion: true },
] as const;

const LINKS_SUPERADMIN = [
  { to: "/", label: "Tienda", requiereSesion: false },
  { to: "/administracion", label: "Administración", requiereSesion: true },
  { to: "/top", label: "Top", requiereSesion: false },
  { to: "/amigos", label: "Amigos", requiereSesion: false },
  { to: "/perfil", label: "Perfil", requiereSesion: true },
] as const;

export function SiteHeader() {
  const { usuario, esAdmin, esSuperAdmin, abrirAcceso, logout } = useSesion();
  const navigate = useNavigate();
  const links = esSuperAdmin ? LINKS_SUPERADMIN : esAdmin ? LINKS_ADMIN : LINKS_CLIENTE;
  const cerrarSesion = () => {
    logout();
    void navigate({ to: "/", replace: true });
  };
  const interceptarPrivado = (
    event: React.MouseEvent<HTMLAnchorElement>,
    requiereSesion: boolean,
  ) => {
    if (usuario || !requiereSesion) return;
    event.preventDefault();
    abrirAcceso("Iniciá sesión o creá una cuenta para acceder a esta sección.");
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-sidebar/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:gap-4">
        <Link to="/" className="flex shrink-0 items-center gap-2 text-lg font-bold tracking-tight">
          <Gamepad2 className="h-6 w-6 text-primary" />
          <span className="hidden sm:inline">Steamn&apos;t</span>
        </Link>
        <nav aria-label="Navegación principal" className="hidden flex-1 items-center gap-1 xl:flex">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              activeOptions={{ exact: l.to === "/" }}
              onClick={(event) => interceptarPrivado(event, l.requiereSesion)}
              className="whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              activeProps={{ className: "bg-secondary text-foreground" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3 xl:ml-0">
          {esAdmin && (
            <Badge variant="secondary" className="hidden gap-1 lg:flex">
              <Wrench className="h-3.5 w-3.5" /> Desarrollador
            </Badge>
          )}
          {esSuperAdmin && (
            <Badge variant="secondary" className="hidden gap-1 lg:flex">
              <ShieldCheck className="h-3.5 w-3.5" /> Administrador
            </Badge>
          )}
          {usuario ? (
            <>
              <Link
                to="/perfil"
                hash="billetera"
                className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-sm"
              >
                <Wallet className="h-4 w-4 text-accent" />
                <span className="font-semibold">Saldo: {formatSaldo(usuario.saldo)}</span>
              </Link>
              <Link to="/perfil" className="flex items-center gap-2">
                <AvatarGamer
                  nickname={usuario.nickname}
                  avatar={usuario.avatar}
                  className="h-8 w-8"
                />
                <span className="hidden text-sm text-muted-foreground 2xl:inline">
                  {usuario.nickname}
                </span>
              </Link>
              <button
                onClick={cerrarSesion}
                aria-label="Cerrar sesión"
                className="rounded-md border border-border p-2 text-muted-foreground hover:text-foreground"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          ) : (
            <Button
              size="sm"
              className="gap-2"
              onClick={() => abrirAcceso("Iniciá sesión o creá una cuenta para continuar.")}
            >
              <LogIn className="h-4 w-4" />
              Iniciar sesión
            </Button>
          )}
        </div>
      </div>
      <nav
        aria-label="Navegación principal"
        className="flex flex-wrap justify-center gap-1 border-t border-border px-3 py-2 xl:hidden"
      >
        {links.map((l) => (
          <Link
            key={l.to}
            to={l.to}
            activeOptions={{ exact: l.to === "/" }}
            onClick={(event) => interceptarPrivado(event, l.requiereSesion)}
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
