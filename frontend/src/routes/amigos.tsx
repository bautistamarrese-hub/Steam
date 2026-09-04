import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { Award, Check, Clock, Gamepad2, Trophy, UserMinus, UserPlus, X } from "lucide-react";
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
  estadisticas,
  listarUsuarios,
  rechazarSolicitud,
  solicitudesEnviadas,
  solicitudesRecibidas,
} from "@/lib/api";
import { useSesion } from "@/lib/sesion";

export const Route = createFileRoute("/amigos")({
  head: () => ({
    meta: [
      { title: "Amigos — Steamn't" },
      { name: "description", content: "Agregá amigos y mirá sus juegos, logros y puntos." },
      { property: "og:title", content: "Amigos — Steamn't" },
      { property: "og:description", content: "Tu red de amigos en Steamn't." },
    ],
  }),
  component: Amigos,
});

function Amigos() {
  const { usuario: yo, abrirAcceso, refrescar } = useSesion();
  const queryClient = useQueryClient();
  // GET /usuarios/{id}/amigos
  const { data: amigos = [] } = useQuery({
    queryKey: ["amigos", yo?.id],
    queryFn: () => amigosDe(yo!.id),
    enabled: Boolean(yo),
  });
  const { data: usuarios = [] } = useQuery({
    queryKey: ["usuarios"],
    queryFn: listarUsuarios,
  });
  const { data: recibidas = [] } = useQuery({
    queryKey: ["solicitudes-recibidas", yo?.id],
    queryFn: () => solicitudesRecibidas(yo!.id),
    enabled: Boolean(yo),
  });
  const { data: enviadas = [] } = useQuery({
    queryKey: ["solicitudes-enviadas", yo?.id],
    queryFn: () => solicitudesEnviadas(yo!.id),
    enabled: Boolean(yo),
  });
  const otros = usuarios.filter((u) => u.id !== yo?.id && u.rol !== "superadmin");
  const estadisticasUsuarios = useQueries({
    queries: otros.map((usuario) => ({
      queryKey: ["estadisticas", usuario.id],
      queryFn: () => estadisticas(usuario.id),
    })),
  });
  const amigosIds = new Set(amigos.map((amigo) => amigo.id));

  const accion = async (fn: () => Promise<unknown>, ok: string) => {
    if (!yo) {
      abrirAcceso("Tenés que iniciar sesión para usar las funciones de amistad.");
      return;
    }
    try {
      await fn();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["amigos", yo.id] }),
        queryClient.invalidateQueries({ queryKey: ["solicitudes-recibidas", yo.id] }),
        queryClient.invalidateQueries({ queryKey: ["solicitudes-recibidas-count", yo.id] }),
        queryClient.invalidateQueries({ queryKey: ["solicitudes-enviadas", yo.id] }),
        refrescar(),
      ]);
      toast.success(ok);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Ocurrió un error");
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-bold">Comunidad</h1>
      <p className="mt-2 text-muted-foreground">
        {yo
          ? `Tenés ${amigos.length} amigo(s). Entrá a cualquier perfil para ver sus juegos y logros.`
          : "Explorá los perfiles de la comunidad. Iniciá sesión para agregar amigos."}
      </p>

      {recibidas.length > 0 && (
        <Card className="mt-8 p-5">
          <h2 className="text-lg font-semibold">Solicitudes recibidas ({recibidas.length})</h2>
          <ul className="mt-3 space-y-2">
            {recibidas.map((solicitud) => (
              <li key={solicitud.id} className="flex flex-wrap items-center gap-3">
                <AvatarGamer
                  nickname={solicitud.autor?.nickname ?? "Usuario"}
                  avatar={solicitud.autor?.avatar}
                  className="h-9 w-9"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{solicitud.autor?.nickname ?? "Usuario"}</p>
                  <p className="text-xs text-muted-foreground">
                    Te envió una solicitud · {solicitud.fecha}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => accion(() => aceptarSolicitud(solicitud.id), "Solicitud aceptada")}
                >
                  <Check className="h-4 w-4" /> Aceptar
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    accion(() => rechazarSolicitud(solicitud.id), "Solicitud rechazada")
                  }
                >
                  <X className="h-4 w-4" /> Rechazar
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {otros.map((u, index) => {
          const amigo = amigosIds.has(u.id);
          const pendiente = enviadas.find((solicitud) => solicitud.para === u.id);
          const meEnvio = recibidas.find((solicitud) => solicitud.de === u.id);
          // GET /usuarios/{id}/estadisticas
          const s = estadisticasUsuarios[index]?.data;
          return (
            <Card key={u.id} className="gap-3 p-4">
              <div className="flex items-center gap-3">
                <AvatarGamer nickname={u.nickname} avatar={u.avatar} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Link
                      to="/usuarios/$usuarioId"
                      params={{ usuarioId: String(u.id) }}
                      className="truncate font-semibold hover:text-primary"
                    >
                      {u.nickname}
                    </Link>
                    <Badge variant={u.rol === "admin" ? "default" : "secondary"}>
                      {u.rol === "admin" ? "Dev" : "Jugador"}
                    </Badge>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    Miembro desde {u.fecha_registro}
                  </p>
                </div>
                {amigo ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => accion(() => eliminarAmigo(yo!.id, u.id), "Amistad eliminada")}
                  >
                    <UserMinus className="h-4 w-4" /> Amigos
                  </Button>
                ) : meEnvio ? (
                  <Button
                    size="sm"
                    onClick={() => accion(() => aceptarSolicitud(meEnvio.id), "Solicitud aceptada")}
                  >
                    <Check className="h-4 w-4" /> Aceptar
                  </Button>
                ) : pendiente ? (
                  <Button size="sm" variant="secondary" disabled>
                    <Clock className="h-4 w-4" /> Pendiente
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() =>
                      accion(
                        () => enviarSolicitud(yo!.id, u.id),
                        `Solicitud enviada a ${u.nickname}`,
                      )
                    }
                  >
                    <UserPlus className="h-4 w-4" /> Enviar solicitud
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="rounded-md border border-border p-2">
                  <Gamepad2 className="h-4 w-4 text-primary" />
                  <p className="mt-1 font-semibold">{s?.cantidad_juegos ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Juegos</p>
                </div>
                <div className="rounded-md border border-border p-2">
                  <Trophy className="h-4 w-4 text-accent" />
                  <p className="mt-1 font-semibold">{s?.logros_desbloqueados ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Logros</p>
                </div>
                <div className="rounded-md border border-border p-2">
                  <Award className="h-4 w-4 text-primary" />
                  <p className="mt-1 font-semibold">{s?.puntos_totales ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Puntos</p>
                </div>
              </div>

              <Button variant="secondary" size="sm" asChild className="w-fit">
                <Link to="/usuarios/$usuarioId" params={{ usuarioId: String(u.id) }}>
                  Ver perfil completo
                </Link>
              </Button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
