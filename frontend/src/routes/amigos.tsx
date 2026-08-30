import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { Award, Gamepad2, Trophy, UserMinus, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  agregarAmigo,
  amigosDe,
  ApiError,
  eliminarAmigo,
  estadisticas,
  listarUsuarios,
} from "@/lib/api";
import { useSesion, useUsuario } from "@/lib/sesion";

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
  const yo = useUsuario();
  const { refrescar } = useSesion();
  const queryClient = useQueryClient();
  // GET /usuarios/{id}/amigos
  const { data: amigos = [] } = useQuery({
    queryKey: ["amigos", yo.id],
    queryFn: () => amigosDe(yo.id),
  });
  const { data: usuarios = [] } = useQuery({
    queryKey: ["usuarios"],
    queryFn: listarUsuarios,
  });
  const otros = usuarios.filter((u) => u.id !== yo.id);
  const estadisticasUsuarios = useQueries({
    queries: otros.map((usuario) => ({
      queryKey: ["estadisticas", usuario.id],
      queryFn: () => estadisticas(usuario.id),
    })),
  });
  const amigosIds = new Set(amigos.map((amigo) => amigo.id));

  const accion = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["amigos", yo.id] }),
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
        Tenés {amigos.length} amigo(s). Entrá a cualquier perfil para ver sus juegos y logros.
      </p>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {otros.map((u, index) => {
          const amigo = amigosIds.has(u.id);
          // GET /usuarios/{id}/estadisticas
          const s = estadisticasUsuarios[index]?.data;
          return (
            <Card key={u.id} className="gap-3 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-secondary font-bold">
                  {u.nickname.slice(0, 2).toUpperCase()}
                </div>
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
                    onClick={() => accion(() => eliminarAmigo(yo.id, u.id), "Amistad eliminada")}
                  >
                    <UserMinus className="h-4 w-4" /> Amigos
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() =>
                      accion(() => agregarAmigo(yo.id, u.id), `Ahora sos amigo de ${u.nickname}`)
                    }
                  >
                    <UserPlus className="h-4 w-4" /> Agregar
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
