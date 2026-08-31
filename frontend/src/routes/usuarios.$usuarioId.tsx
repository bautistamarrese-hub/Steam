import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Award,
  Check,
  Clock,
  Coins,
  Gamepad2,
  Trophy,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react";
import { AvatarGamer } from "@/components/AvatarGamer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  aceptarSolicitud,
  amigosDe,
  ApiError,
  eliminarAmigo,
  enviarSolicitud,
  formatPrecio,
  perfilPublico,
  solicitudesEnviadas,
  solicitudesRecibidas,
} from "@/lib/api";
import { useSesion, useUsuario } from "@/lib/sesion";

export const Route = createFileRoute("/usuarios/$usuarioId")({
  head: () => ({
    meta: [
      { title: "Perfil de jugador — Steamn't" },
      {
        name: "description",
        content: "Mirá los juegos, logros y estadísticas de cualquier jugador de Steamn't.",
      },
      { property: "og:title", content: "Perfil de jugador — Steamn't" },
      { property: "og:description", content: "Juegos, logros y amigos de este jugador." },
    ],
  }),
  component: PerfilUsuario,
});

function PerfilUsuario() {
  const { usuarioId } = Route.useParams();
  const yo = useUsuario();
  const { refrescar } = useSesion();
  const queryClient = useQueryClient();
  // GET /usuarios/{id}/perfil
  const id = Number(usuarioId);
  const {
    data: perfil,
    isError,
    isPending,
  } = useQuery({
    queryKey: ["perfil-publico", id],
    queryFn: () => perfilPublico(id),
    retry: false,
    throwOnError: false,
  });
  const { data: misAmigos = [] } = useQuery({
    queryKey: ["amigos", yo.id],
    queryFn: () => amigosDe(yo.id),
  });
  const { data: recibidas = [] } = useQuery({
    queryKey: ["solicitudes-recibidas", yo.id],
    queryFn: () => solicitudesRecibidas(yo.id),
  });
  const { data: enviadas = [] } = useQuery({
    queryKey: ["solicitudes-enviadas", yo.id],
    queryFn: () => solicitudesEnviadas(yo.id),
  });

  if (isPending) {
    return <p className="px-4 py-24 text-center text-muted-foreground">Cargando perfil...</p>;
  }

  if (isError || !perfil) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="text-2xl font-bold">Usuario no encontrado</h1>
        <Button asChild className="mt-6">
          <Link to="/amigos">Volver a la comunidad</Link>
        </Button>
      </div>
    );
  }

  const { usuario, stats, juegos, logros, amigos } = perfil;
  const esYo = usuario.id === yo.id;
  const amigo = misAmigos.some((item) => item.id === usuario.id);
  const pendiente = enviadas.find((solicitud) => solicitud.para === usuario.id);
  const meEnvio = recibidas.find((solicitud) => solicitud.de === usuario.id);

  const accion = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["amigos", yo.id] }),
        queryClient.invalidateQueries({ queryKey: ["solicitudes-recibidas", yo.id] }),
        queryClient.invalidateQueries({ queryKey: ["solicitudes-enviadas", yo.id] }),
        queryClient.invalidateQueries({ queryKey: ["perfil-publico", id] }),
        refrescar(),
      ]);
      toast.success(ok);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Ocurrió un error");
    }
  };

  const cards = [
    { icon: Gamepad2, label: "Juegos", value: stats.cantidad_juegos },
    { icon: Trophy, label: "Logros", value: stats.logros_desbloqueados },
    { icon: Award, label: "Puntos", value: stats.puntos_totales },
    { icon: Users, label: "Amigos", value: stats.cantidad_amigos },
    { icon: Coins, label: "Gastado", value: formatPrecio(stats.total_gastado) },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-wrap items-center gap-4">
        <AvatarGamer nickname={usuario.nickname} className="h-16 w-16" />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold">{usuario.nickname}</h1>
            <Badge variant={usuario.rol === "admin" ? "default" : "secondary"}>
              {usuario.rol === "admin" ? "Desarrollador" : "Jugador"}
            </Badge>
          </div>
          <p className="text-muted-foreground">Miembro desde {usuario.fecha_registro}</p>
        </div>
        {!esYo &&
          (amigo ? (
            <Button
              variant="secondary"
              onClick={() => accion(() => eliminarAmigo(yo.id, usuario.id), "Amistad eliminada")}
            >
              <UserMinus className="h-4 w-4" /> Amigos
            </Button>
          ) : meEnvio ? (
            <Button
              onClick={() => accion(() => aceptarSolicitud(meEnvio.id), "Solicitud aceptada")}
            >
              <Check className="h-4 w-4" /> Aceptar solicitud
            </Button>
          ) : pendiente ? (
            <Button variant="secondary" disabled>
              <Clock className="h-4 w-4" /> Solicitud pendiente
            </Button>
          ) : (
            <Button
              onClick={() =>
                accion(
                  () => enviarSolicitud(yo.id, usuario.id),
                  `Solicitud enviada a ${usuario.nickname}`,
                )
              }
            >
              <UserPlus className="h-4 w-4" /> Enviar solicitud
            </Button>
          ))}
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map((c) => (
          <Card key={c.label} className="gap-2 p-4">
            <c.icon className="h-5 w-5 text-primary" />
            <p className="text-2xl font-bold">{c.value}</p>
            <p className="text-xs text-muted-foreground">{c.label}</p>
          </Card>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="text-lg font-semibold">Juegos ({juegos.length})</h2>
          <div className="mt-3 space-y-2">
            {juegos.map((item) => (
              <Link
                key={item.juego.id}
                to="/juegos/$juegoId"
                params={{ juegoId: String(item.juego.id) }}
                className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:border-primary"
              >
                <img
                  src={item.juego.imagen}
                  alt={`Portada de ${item.juego.titulo}`}
                  loading="lazy"
                  className="h-12 w-20 rounded object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{item.juego.titulo}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.juego.genero} · comprado el {item.fecha}
                  </p>
                </div>
              </Link>
            ))}
            {juegos.length === 0 && (
              <p className="text-sm text-muted-foreground">Todavía no tiene juegos.</p>
            )}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Logros ({logros.length})</h2>
          <div className="mt-3 space-y-2">
            {logros.map((l) => (
              <Card key={l.logro.id} className="flex flex-row items-center gap-3 p-3">
                <Trophy className="h-5 w-5 shrink-0 text-accent" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{l.logro.nombre}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {l.juego.titulo} · {l.fecha}
                  </p>
                </div>
                <Badge variant="secondary">{l.logro.puntos} pts</Badge>
              </Card>
            ))}
            {logros.length === 0 && (
              <p className="text-sm text-muted-foreground">Todavía no desbloqueó logros.</p>
            )}
          </div>

          <h2 className="mt-6 text-lg font-semibold">Amigos ({amigos.length})</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {amigos.map((a) => (
              <Link
                key={a.id}
                to="/usuarios/$usuarioId"
                params={{ usuarioId: String(a.id) }}
                className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-sm hover:border-primary"
              >
                <AvatarGamer nickname={a.nickname} className="h-6 w-6" />
                {a.nickname}
              </Link>
            ))}
            {amigos.length === 0 && (
              <p className="text-sm text-muted-foreground">Todavía no tiene amigos.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
