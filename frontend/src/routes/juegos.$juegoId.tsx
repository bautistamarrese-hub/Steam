import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Lock, ThumbsDown, ThumbsUp, Trophy } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  agregarAWishlist,
  ApiError,
  biblioteca,
  comprarJuego,
  crearLogro,
  desbloquearLogro,
  formatPrecio,
  guardarResena,
  logrosDeJuego,
  obtenerDesarrollador,
  obtenerJuego,
  obtenerLogrosDesbloqueados,
  obtenerWishlist,
  resenasDeJuego,
} from "@/lib/api";
import { useSesion, useUsuario } from "@/lib/sesion";

export const Route = createFileRoute("/juegos/$juegoId")({
  head: () => ({ meta: [{ title: "Detalle de juego — Steamn't" }] }),
  component: DetalleJuego,
});

function DetalleJuego() {
  const id = Number(Route.useParams().juegoId);
  const usuario = useUsuario();
  const { esAdmin, refrescar } = useSesion();
  const queryClient = useQueryClient();
  const [texto, setTexto] = useState("");
  const [nombreLogro, setNombreLogro] = useState("");
  const [puntos, setPuntos] = useState("10");

  const { data: juego, isError } = useQuery({
    queryKey: ["juego", id],
    queryFn: () => obtenerJuego(id),
    retry: false,
    throwOnError: false,
  });
  const { data: compras = [] } = useQuery({
    queryKey: ["biblioteca", usuario.id],
    queryFn: () => biblioteca(usuario.id),
  });
  const { data: wishlist = [] } = useQuery({
    queryKey: ["wishlist", usuario.id],
    queryFn: () => obtenerWishlist(usuario.id),
  });
  const { data: logros = [] } = useQuery({
    queryKey: ["logros-juego", id],
    queryFn: () => logrosDeJuego(id),
  });
  const { data: desbloqueados = [] } = useQuery({
    queryKey: ["logros-desbloqueados", usuario.id],
    queryFn: () => obtenerLogrosDesbloqueados(usuario.id),
  });
  const { data: resenas = [] } = useQuery({
    queryKey: ["resenas", id],
    queryFn: () => resenasDeJuego(id),
  });
  const { data: desarrollador } = useQuery({
    queryKey: ["desarrollador", juego?.desarrollador_id],
    queryFn: () => obtenerDesarrollador(juego!.desarrollador_id),
    enabled: Boolean(juego),
  });

  const miResena = resenas.find((resena) => resena.usuario_id === usuario.id);
  useEffect(() => {
    if (miResena) setTexto(miResena.texto);
  }, [miResena]);

  const accion = async (fn: () => Promise<unknown>, mensaje: string) => {
    try {
      await fn();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["biblioteca", usuario.id] }),
        queryClient.invalidateQueries({ queryKey: ["wishlist", usuario.id] }),
        queryClient.invalidateQueries({ queryKey: ["resenas", id] }),
        queryClient.invalidateQueries({ queryKey: ["logros-juego", id] }),
        queryClient.invalidateQueries({ queryKey: ["logros-desbloqueados", usuario.id] }),
        refrescar(),
      ]);
      toast.success(mensaje);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Ocurrió un error");
    }
  };

  if (isError) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="text-2xl font-bold">Juego no encontrado</h1>
        <Button asChild className="mt-6">
          <Link to="/">Volver a la tienda</Link>
        </Button>
      </div>
    );
  }
  if (!juego)
    return <p className="px-4 py-24 text-center text-muted-foreground">Cargando juego...</p>;

  const comprado = compras.some((item) => item.juego.id === id);
  const deseado = wishlist.some((item) => item.juego_id === id);
  const esMiJuego = esAdmin && usuario.desarrollador_id === juego.desarrollador_id;

  return (
    <div>
      <section className="bg-hero border-b border-border">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-[1.4fr_1fr]">
          <img
            src={juego.imagen}
            alt={`Portada de ${juego.titulo}`}
            className="w-full rounded-lg border border-border object-cover"
          />
          <div>
            <h1 className="text-3xl font-bold">{juego.titulo}</h1>
            <p className="mt-2 text-muted-foreground">{juego.descripcion}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge variant="secondary">{juego.genero}</Badge>
              <Badge variant="outline">{desarrollador?.nombre ?? "Desarrollador"}</Badge>
              <Badge variant="outline">Lanzamiento {juego.fecha_lanzamiento}</Badge>
            </div>
            <p className="mt-6 text-3xl font-bold text-accent">{formatPrecio(juego.precio)}</p>
            <div className="mt-4 flex gap-2">
              <Button
                disabled={comprado}
                onClick={() =>
                  accion(() => comprarJuego(usuario.id, id), `Compraste ${juego.titulo}`)
                }
              >
                {comprado ? "Ya en tu biblioteca" : "Comprar ahora"}
              </Button>
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
      </section>

      <div className="mx-auto max-w-4xl space-y-10 px-4 py-10">
        <section>
          <h2 className="text-xl font-semibold">Reseñas ({resenas.length})</h2>
          <Card className="mt-4 p-4">
            <h3 className="font-semibold">
              {miResena ? "Editar mi reseña" : "Escribir una reseña"}
            </h3>
            <p className="text-xs text-muted-foreground">Solo podés reseñar juegos comprados.</p>
            <Textarea
              className="mt-3"
              value={texto}
              onChange={(event) => setTexto(event.target.value)}
              disabled={!comprado}
            />
            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                disabled={!comprado}
                onClick={() =>
                  accion(() => guardarResena(usuario.id, id, true, texto), "Reseña publicada")
                }
              >
                <ThumbsUp className="h-4 w-4" /> Recomiendo
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={!comprado}
                onClick={() =>
                  accion(() => guardarResena(usuario.id, id, false, texto), "Reseña publicada")
                }
              >
                <ThumbsDown className="h-4 w-4" /> No recomiendo
              </Button>
            </div>
          </Card>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {resenas.map((resena) => (
              <Card key={resena.id} className="gap-2 p-4">
                <div className="flex items-center justify-between">
                  <Link
                    to="/usuarios/$usuarioId"
                    params={{ usuarioId: String(resena.usuario_id) }}
                    className="font-medium hover:text-primary"
                  >
                    {resena.autor?.nickname ?? "Usuario"}
                  </Link>
                  <Badge variant={resena.recomienda ? "default" : "destructive"}>
                    {resena.recomienda ? "Recomendado" : "No recomendado"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{resena.texto}</p>
              </Card>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Logros ({logros.length})</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {logros.map((logro) => {
              const hecho = desbloqueados.some((item) => item.logro_id === logro.id);
              return (
                <Card key={logro.id} className="flex flex-row items-center gap-3 p-4">
                  {hecho ? (
                    <Trophy className="h-5 w-5 text-accent" />
                  ) : (
                    <Lock className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{logro.nombre}</p>
                    <p className="text-sm text-muted-foreground">{logro.descripcion}</p>
                  </div>
                  <Badge variant="secondary">{logro.puntos} pts</Badge>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={hecho || !comprado}
                    onClick={() =>
                      accion(() => desbloquearLogro(usuario.id, logro.id), "¡Logro desbloqueado!")
                    }
                  >
                    {hecho ? "Listo" : "Desbloquear"}
                  </Button>
                </Card>
              );
            })}
          </div>

          {esMiJuego && (
            <Card className="mt-6 p-4">
              <h3 className="font-semibold">Nuevo logro</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-[2fr_1fr]">
                <Input
                  value={nombreLogro}
                  onChange={(event) => setNombreLogro(event.target.value)}
                  placeholder="Nombre"
                />
                <Input
                  type="number"
                  value={puntos}
                  onChange={(event) => setPuntos(event.target.value)}
                />
              </div>
              <Button
                className="mt-3"
                size="sm"
                onClick={() =>
                  accion(async () => {
                    await crearLogro(
                      id,
                      nombreLogro,
                      "Logro creado desde el panel.",
                      Number(puntos),
                    );
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
