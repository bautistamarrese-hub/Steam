import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Gamepad2, LogIn, LogOut, ShieldCheck, Wallet, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AvatarGamer } from "@/components/AvatarGamer";
import { cantidadSolicitudesRecibidas, formatSaldo } from "@/lib/api";
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
] as const;

const CLAVE_ULTIMO_JUEGO = "steamnt-ultimo-juego";
const CLAVE_ULTIMO_USUARIO = "steamnt-ultimo-usuario";
const CLAVE_PESTANA_ANTERIOR = "steamnt-pestana-anterior";
const CAMBIOS_MAXIMOS = 3;

type RecuerdoNavegacion = { id: string; cambiosRestantes: number };

const leerRecuerdo = (clave: string): RecuerdoNavegacion | null => {
  const guardado = sessionStorage.getItem(clave);
  if (!guardado) return null;
  try {
    const recuerdo = JSON.parse(guardado) as Partial<RecuerdoNavegacion>;
    if (typeof recuerdo.id !== "string" || typeof recuerdo.cambiosRestantes !== "number") {
      return null;
    }
    return { id: recuerdo.id, cambiosRestantes: recuerdo.cambiosRestantes };
  } catch {
    // Convierte automáticamente el formato anterior, que guardaba solamente el id.
    return { id: guardado, cambiosRestantes: CAMBIOS_MAXIMOS };
  }
};

const guardarRecuerdo = (clave: string, recuerdo: RecuerdoNavegacion | null) => {
  if (recuerdo) sessionStorage.setItem(clave, JSON.stringify(recuerdo));
  else sessionStorage.removeItem(clave);
};

const pestanaDeRuta = (ruta: string): string | null => {
  if (ruta === "/" || ruta.startsWith("/juegos/")) return "tienda";
  if (ruta === "/biblioteca" || ruta.startsWith("/jugar/")) return "biblioteca";
  if (ruta === "/wishlist") return "wishlist";
  if (ruta === "/top") return "top";
  if (ruta === "/amigos" || ruta.startsWith("/usuarios/")) return "amigos";
  if (ruta === "/perfil") return "perfil";
  if (ruta === "/desarrolladores") return "panel";
  if (ruta === "/administracion") return "administracion";
  return null;
};

const descontarCambio = (
  recuerdo: RecuerdoNavegacion | null,
  cambioDePestana: boolean,
  pestanaActual: string | null,
  pestanaDelRecuerdo: string,
): RecuerdoNavegacion | null => {
  if (!recuerdo || !cambioDePestana || pestanaActual === pestanaDelRecuerdo) return recuerdo;
  const restantes = recuerdo.cambiosRestantes - 1;
  return restantes > 0 ? { ...recuerdo, cambiosRestantes: restantes } : null;
};

export function SiteHeader() {
  const { usuario, esAdmin, esSuperAdmin, abrirAcceso, logout } = useSesion();
  const navigate = useNavigate();
  const rutaActual = useRouterState({ select: (state) => state.location.pathname });
  const [ultimoJuegoId, setUltimoJuegoId] = useState<string | null>(null);
  const [ultimoUsuarioId, setUltimoUsuarioId] = useState<string | null>(null);
  const links = esSuperAdmin ? LINKS_SUPERADMIN : esAdmin ? LINKS_ADMIN : LINKS_CLIENTE;
  const { data: solicitudesPendientes = 0 } = useQuery({
    queryKey: ["solicitudes-recibidas-count", usuario?.id],
    queryFn: () => cantidadSolicitudesRecibidas(usuario!.id),
    enabled: Boolean(usuario && !esSuperAdmin),
    refetchInterval: 15_000,
  });
  const contadorSolicitudes = solicitudesPendientes > 9 ? "+9" : String(solicitudesPendientes);

  useEffect(() => {
    const pestanaActual = pestanaDeRuta(rutaActual);
    const pestanaAnterior = sessionStorage.getItem(CLAVE_PESTANA_ANTERIOR);
    const cambioDePestana = Boolean(
      pestanaActual && pestanaAnterior && pestanaActual !== pestanaAnterior,
    );
    const juegoActual = /^\/juegos\/(\d+)$/.exec(rutaActual)?.[1];
    let recuerdoJuego = leerRecuerdo(CLAVE_ULTIMO_JUEGO);
    if (rutaActual === "/") {
      recuerdoJuego = null;
    } else if (juegoActual) {
      recuerdoJuego = { id: juegoActual, cambiosRestantes: CAMBIOS_MAXIMOS };
    } else {
      recuerdoJuego = descontarCambio(recuerdoJuego, cambioDePestana, pestanaActual, "tienda");
    }
    guardarRecuerdo(CLAVE_ULTIMO_JUEGO, recuerdoJuego);
    setUltimoJuegoId(recuerdoJuego?.id ?? null);

    const usuarioActual = /^\/usuarios\/(\d+)$/.exec(rutaActual)?.[1];
    let recuerdoUsuario = leerRecuerdo(CLAVE_ULTIMO_USUARIO);
    if (rutaActual === "/amigos") {
      recuerdoUsuario = null;
    } else if (usuarioActual) {
      recuerdoUsuario = { id: usuarioActual, cambiosRestantes: CAMBIOS_MAXIMOS };
    } else {
      recuerdoUsuario = descontarCambio(recuerdoUsuario, cambioDePestana, pestanaActual, "amigos");
    }
    guardarRecuerdo(CLAVE_ULTIMO_USUARIO, recuerdoUsuario);
    setUltimoUsuarioId(recuerdoUsuario?.id ?? null);

    if (pestanaActual) sessionStorage.setItem(CLAVE_PESTANA_ANTERIOR, pestanaActual);
  }, [rutaActual]);

  const contenidoEnlace = (link: { to: string; label: string }) => (
    <>
      {link.label}
      {link.to === "/amigos" && solicitudesPendientes > 0 && (
        <span
          className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-destructive-foreground"
          aria-label={`${solicitudesPendientes} solicitudes de amistad pendientes`}
          title={`${solicitudesPendientes} solicitudes de amistad pendientes`}
        >
          {contadorSolicitudes}
        </span>
      )}
    </>
  );
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
          {links.map((l) => {
            const clases =
              "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground";
            if (
              l.to === "/" &&
              ultimoJuegoId &&
              rutaActual !== "/" &&
              !rutaActual.startsWith("/juegos/")
            ) {
              return (
                <Link
                  key={l.to}
                  to="/juegos/$juegoId"
                  params={{ juegoId: ultimoJuegoId }}
                  className={clases}
                  activeProps={{ className: "bg-secondary text-foreground" }}
                >
                  {contenidoEnlace(l)}
                </Link>
              );
            }
            if (
              l.to === "/amigos" &&
              ultimoUsuarioId &&
              rutaActual !== "/amigos" &&
              !rutaActual.startsWith("/usuarios/")
            ) {
              return (
                <Link
                  key={l.to}
                  to="/usuarios/$usuarioId"
                  params={{ usuarioId: ultimoUsuarioId }}
                  className={clases}
                  activeProps={{ className: "bg-secondary text-foreground" }}
                >
                  {contenidoEnlace(l)}
                </Link>
              );
            }
            return (
              <Link
                key={l.to}
                to={l.to}
                activeOptions={{ exact: l.to === "/" }}
                onClick={(event) => interceptarPrivado(event, l.requiereSesion)}
                className={clases}
                activeProps={{ className: "bg-secondary text-foreground" }}
              >
                {contenidoEnlace(l)}
              </Link>
            );
          })}
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
              {!esSuperAdmin && (
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
                </>
              )}
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
        {links.map((l) => {
          const clases =
            "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1 text-sm text-muted-foreground";
          if (
            l.to === "/" &&
            ultimoJuegoId &&
            rutaActual !== "/" &&
            !rutaActual.startsWith("/juegos/")
          ) {
            return (
              <Link
                key={l.to}
                to="/juegos/$juegoId"
                params={{ juegoId: ultimoJuegoId }}
                className={clases}
                activeProps={{ className: "bg-secondary text-foreground" }}
              >
                {contenidoEnlace(l)}
              </Link>
            );
          }
          if (
            l.to === "/amigos" &&
            ultimoUsuarioId &&
            rutaActual !== "/amigos" &&
            !rutaActual.startsWith("/usuarios/")
          ) {
            return (
              <Link
                key={l.to}
                to="/usuarios/$usuarioId"
                params={{ usuarioId: ultimoUsuarioId }}
                className={clases}
                activeProps={{ className: "bg-secondary text-foreground" }}
              >
                {contenidoEnlace(l)}
              </Link>
            );
          }
          return (
            <Link
              key={l.to}
              to={l.to}
              activeOptions={{ exact: l.to === "/" }}
              onClick={(event) => interceptarPrivado(event, l.requiereSesion)}
              className={clases}
              activeProps={{ className: "bg-secondary text-foreground" }}
            >
              {contenidoEnlace(l)}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
