import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Lock, ThumbsDown, ThumbsUp, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  agregarAWishlist,
  ApiError,
  comprarJuego,
  crearLogro,
  desbloquearLogro,
  enWishlist,
  formatPrecio,
  guardarResena,
  logroDesbloqueado,
  logrosDeJuego,
  obtenerDesarrollador,
  obtenerJuego,
  poseeJuego,
  resenaDeUsuario,
  resenasDeJuego,
} from "@/lib/api";
import { useSesion, useUsuario } from "@/lib/sesion";

export const Route = createFileRoute("/juegos/$juegoId")({
  head: ({ params }) => {
    const juego = obtenerJuego(Number(params.juegoId));
    const title = juego ? `${juego.titulo} — Steamn't` : "Juego no encontrado — Steamn't";
    const description = juego?.resumen ?? juego?.descripcion ?? "Este juego no está disponible en Steamn't.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: DetalleJuego,
});

function DetalleJuego() {
  const { juegoId } = Route.useParams();
  const id = Number(juegoId);
  const usuario = useUsuario();
  const { esAdmin, refrescar } = useSesion();
  const [tick, setTick] = useState(0);

  // GET /juegos/{id}
  const juego = obtenerJuego(id);
  const [texto, setTexto] = useState(resenaDeUsuario(usuario.id, id)?.texto ?? "");
  const [nombreLogro, setNombreLogro] = useState("");
  const [puntos, setPuntos] = useState("10");

  const accion = (fn: () => void, ok: string) => {
    try {
      fn();
      setTick(tick + 1);
      refrescar();
      toast.success(ok);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Ocurrió un error");
    }
  };

  if (!juego) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="text-2xl font-bold">Juego no encontrado</h1>
        <Button asChild className="mt-6">
          <Link to="/">Volver a la tienda</Link>
        </Button>
      </div>
    );
  }

  const dev = obtenerDesarrollador(juego.desarrollador_id);
  const comprado = poseeJuego(usuario.id, id);
  const deseado = enWishlist(usuario.id, id);
  const logros = logrosDeJuego(id); // GET /juegos/{id}/logros
  const resenas = resenasDeJuego(id); // GET /juegos/{id}/resenas
  const miResena = resenaDeUsuario(usuario.id, id);
  // Solo el estudio dueño del juego puede crear logros
  const esMiJuego = esAdmin && usuario.desarrollador_id === juego.desarrollador_id;

  return (
    <div key={tick}>
      <div className="bg-hero border-b border-border">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-[1.4fr_1fr]">
          <div className="space-y-3">
            {/* Trailer del juego */}
            {juego.trailer ? (
              <video
                src={juego.trailer}
                poster={juego.imagen}
                controls
                playsInline
                className="aspect-video w-full rounded-lg border border-border bg-black object-cover"
              />
            ) : (
              <img
                src={juego.imagen}
                alt={`Portada de ${juego.titulo}`}
                className="w-full rounded-lg border border-border object-cover"
              />
            )}
            <img
              src={juego.imagen}
              alt={`Portada de ${juego.titulo}`}
              className="h-24 w-40 rounded-md border border-border object-cover"
            />
          </div>
          <div>
            <h1 className="text-3xl font-bold">{juego.titulo}</h1>
            {/* Descripción breve */}
            <p className="mt-2 font-medium">{juego.resumen ?? juego.descripcion}</p>
            {juego.resumen && (
              <p className="mt-2 text-sm text-muted-foreground">{juego.descripcion}</p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge variant="secondary">{juego.genero}</Badge>
              <Badge variant="outline">{dev?.nombre}</Badge>
              <Badge variant="outline">Lanzamiento {juego.fecha_lanzamiento}</Badge>
            </div>
            <p className="mt-6 text-3xl font-bold text-accent">{formatPrecio(juego.precio)}</p>
            <div className="mt-4 flex gap-2">
              {/* POST /compras */}
              <Button
                disabled={comprado}
                onClick={() =>
                  accion(() => comprarJuego(usuario.id, id), `Compraste ${juego.titulo}`)
                }
              >
                {comprado ? "Ya en tu biblioteca" : "Comprar ahora"}
              </Button>
              {/* POST /usuarios/{id}/wishlist */}
              <Button
                variant="secondary"
                disabled={comprado || deseado}
                onClick={() =>
                  accion(() => agregarAWishlist(usuario.id, id), "Agregado a la wishlist")
                }
              >
                {deseado ? "En tu wishlist" : "Agregar a wishlist"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl space-y-10 px-4 py-10">
        {/* ── Reseñas primero ───────────────────────────────────────────── */}
        <section>
          <h2 className="text-xl font-semibold">Reseñas ({resenas.length})</h2>

          <Card className="mt-4 p-4">
            <h3 className="font-semibold">
              {miResena ? "Editar mi reseña" : "Escribir una reseña"}
            </h3>
            <p className="text-xs text-muted-foreground">
              Solo podés reseñar juegos comprados. Una reseña por juego.
            </p>
            <Textarea
              className="mt-3"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="¿Qué te pareció el juego?"
              disabled={!comprado}
            />
            {/* POST /resenas  |  PUT /resenas/{id} */}
            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                disabled={!comprado}
                onClick={() =>
                  accion(
                    () => guardarResena(usuario.id, id, true, texto),
                    "Reseña positiva publicada",
                  )
                }
              >
                <ThumbsUp className="h-4 w-4" /> Recomiendo
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={!comprado}
                onClick={() =>
                  accion(
                    () => guardarResena(usuario.id, id, false, texto),
                    "Reseña negativa publicada",
                  )
                }
              >
                <ThumbsDown className="h-4 w-4" /> No recomiendo
              </Button>
            </div>
          </Card>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {resenas.map((r) => (
              <Card key={r.id} className="gap-2 p-4">
                <div className="flex items-center justify-between">
                  {/* Perfil público del autor */}
                  <Link
                    to="/usuarios/$usuarioId"
                    params={{ usuarioId: String(r.usuario_id) }}
                    className="font-medium hover:text-primary hover:underline"
                  >
                    {r.autor?.nickname ?? "Usuario"}
                  </Link>
                  <Badge variant={r.recomienda ? "default" : "destructive"}>
                    {r.recomienda ? "Recomendado" : "No recomendado"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{r.texto}</p>
                <p className="text-xs text-muted-foreground">{r.fecha}</p>
              </Card>
            ))}
            {resenas.length === 0 && (
              <p className="text-sm text-muted-foreground">Todavía no hay reseñas.</p>
            )}
          </div>
        </section>

        {/* ── Logros debajo ─────────────────────────────────────────────── */}
        <section>
          <h2 className="text-xl font-semibold">Logros ({logros.length})</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {logros.map((l) => {
              const hecho = logroDesbloqueado(usuario.id, l.id);
              return (
                <Card key={l.id} className="flex flex-row items-center gap-3 p-4">
                  {hecho ? (
                    <Trophy className="h-5 w-5 shrink-0 text-accent" />
                  ) : (
                    <Lock className="h-5 w-5 shrink-0 text-muted-foreground" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{l.nombre}</p>
                    <p className="text-sm text-muted-foreground">{l.descripcion}</p>
                  </div>
                  <Badge variant="secondary">{l.puntos} pts</Badge>
                  {/* POST /usuarios/{id}/logros */}
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={hecho || !comprado}
                    onClick={() =>
                      accion(() => desbloquearLogro(usuario.id, l.id), "¡Logro desbloqueado!")
                    }
                  >
                    {hecho ? "Listo" : "Desbloquear"}
                  </Button>
                </Card>
              );
            })}
            {logros.length === 0 && (
              <p className="text-sm text-muted-foreground">Este juego todavía no tiene logros.</p>
            )}
          </div>

          {/* Panel exclusivo del desarrollador dueño del juego */}
          {esMiJuego && (
            <Card className="mt-6 p-4">
              <h3 className="font-semibold">Nuevo logro (panel de desarrollador)</h3>
              <p className="text-xs text-muted-foreground">
                Nombre único dentro del juego, puntos entre 1 y 100.
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-[2fr_1fr]">
                <div className="space-y-1">
                  <Label htmlFor="logro">Nombre</Label>
                  <Input
                    id="logro"
                    value={nombreLogro}
                    onChange={(e) => setNombreLogro(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="puntos">Puntos</Label>
                  <Input
                    id="puntos"
                    type="number"
                    value={puntos}
                    onChange={(e) => setPuntos(e.target.value)}
                  />
                </div>
              </div>
              {/* POST /juegos/{id}/logros */}
              <Button
                className="mt-3 w-fit"
                size="sm"
                onClick={() =>
                  accion(() => {
                    crearLogro(id, nombreLogro, "Logro creado desde el panel.", Number(puntos));
                    setNombreLogro("");
                  }, "Logro creado")
                }
              >
                Crear logro
              </Button>
            </Card>
          )}
        </section>
      </div>
    </div>
  );
}
